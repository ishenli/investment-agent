import { getModel, type KnownProvider, type Model, type Api } from '@investment-agent/hermes-agent';
import { modelProviderResolver } from './modelProviderResolver';
import logger from '@server/base/logger';

/**
 * Infer the pi-ai API type from the provider slug.
 *
 * openai-responses is OpenAI's proprietary Responses API.
 * All other OpenAI-compatible providers (Kimi, Qwen, etc.) use the
 * standard Chat Completions API → "openai-completions".
 */
function inferApiType(providerSlug: string): Api {
  return providerSlug === 'openai' ? 'openai-responses' : 'openai-completions';
}

/**
 * Resolve a pi-ai Model from the user's database-configured provider.
 *
 * Priority chain:
 *   1. DB model matching the requested slug (requires baseUrl + apiKey)
 *   2. DB default model for the user (requires baseUrl + apiKey)
 *   3. pi-ai built-in registry fallback (uses env var API key)
 *
 * Centralised here so that every agent entry-point (HTTP route, engine,
 * channel handler) uses the exact same resolution logic.  Previously this
 * was duplicated in at least three files.
 */
export async function resolveAgentModel(
  userId: number,
  provider: string,
  modelSlug: string,
): Promise<{ model: Model<Api>; apiKey?: string }> {
  // 1. Exact DB model config
  const dbConfig = await modelProviderResolver.getActiveModelConfig(userId, modelSlug);

  if (dbConfig?.provider.baseUrl && dbConfig?.provider.apiKey) {
    const baseModel = getModel(provider as KnownProvider, modelSlug as never);

    if (baseModel) {
      return { model: { ...baseModel, baseUrl: dbConfig.provider.baseUrl }, apiKey: dbConfig.provider.apiKey };
    }

    const model: Model<Api> = {
      id: modelSlug,
      name: modelSlug,
      api: inferApiType(provider),
      provider,
      baseUrl: dbConfig.provider.baseUrl,
      reasoning: false,
      input: ['text'] as ('text' | 'image')[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: dbConfig.model.contextWindow ?? 128000,
      maxTokens: 4096,
    };
    return { model, apiKey: dbConfig.provider.apiKey };
  }

  // 2. User's default model config
  const defaultConfig = await modelProviderResolver.getDefaultModelConfig(userId);

  if (defaultConfig?.provider.baseUrl && defaultConfig?.provider.apiKey) {
    const slug = defaultConfig.model.slug;
    const prov = defaultConfig.provider.slug ?? provider;
    const baseModel = getModel(prov as KnownProvider, slug as never);

    if (baseModel) {
      logger.info(`[AgentModelResolver] Using default model from DB: ${prov}/${slug}`);
      return { model: { ...baseModel, baseUrl: defaultConfig.provider.baseUrl }, apiKey: defaultConfig.provider.apiKey };
    }

    const model: Model<Api> = {
      id: slug,
      name: slug,
      api: inferApiType(prov),
      provider: prov,
      baseUrl: defaultConfig.provider.baseUrl,
      reasoning: false,
      input: ['text'] as ('text' | 'image')[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: defaultConfig.model.contextWindow ?? 128000,
      maxTokens: 4096,
    };
    logger.info(`[AgentModelResolver] Using custom default model from DB: ${prov}/${slug}`);
    return { model, apiKey: defaultConfig.provider.apiKey };
  }

  // 3. pi-ai built-in registry fallback
  logger.warn(
    `[AgentModelResolver] No DB model config found for user=${userId}, ` +
    `falling back to pi-ai built-in ${provider}/${modelSlug}`,
  );
  const model = getModel(provider as KnownProvider, modelSlug as never);
  if (!model) {
    throw new Error(
      `不支持的模型: ${provider}/${modelSlug}。请在设置中配置模型服务商。`,
    );
  }
  return { model };
}
