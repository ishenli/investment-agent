import { getModel, type KnownProvider, type Model, type Api } from '@investment-agent/hermes-agent';
import { modelProviderResolver } from './modelProviderResolver';
import { modelProviderRepository } from '@server/repository/modelProviderRepository';
import logger from '@server/base/logger';

/**
 * Infer the pi-ai API type from the provider slug.
 *
 * - anthropic → Anthropic Messages API
 * - openai   → OpenAI Responses API
 * - others   → OpenAI Chat Completions API (Kimi, Qwen, etc.)
 */
function inferApiType(providerSlug: string): Api {
  if (providerSlug === 'anthropic') return 'anthropic-messages';
  return providerSlug === 'openai' ? 'openai-responses' : 'openai-completions';
}

function resolveProviderUrl(provider: { baseUrl: string; anthropicUrl: string }, providerSlug: string): string | undefined {
  if (providerSlug === 'anthropic') {
    return provider.anthropicUrl || provider.baseUrl || undefined;
  }
  return provider.baseUrl || undefined;
}

/**
 * Resolve a pi-ai Model from the user's database-configured provider.
 *
 * Priority chain:
 *   1. DB model matching the requested slug (requires URL + apiKey)
 *   2. DB default model for the user (requires URL + apiKey)
 *   3. pi-ai built-in registry + DB provider apiKey lookup
 *   4. pi-ai built-in registry fallback (uses env var API key)
 *
 * Centralised here so that every agent entry-point (HTTP route, engine,
 * channel handler) uses the exact same resolution logic.
 */
export async function resolveAgentModel(
  userId: number,
  provider: string,
  modelSlug: string,
): Promise<{ model: Model<Api>; apiKey?: string }> {
  logger.info(`[AgentModelResolver] Resolving model: user=${userId} provider=${provider} model=${modelSlug}`);

  // 1. Exact DB model config
  const dbConfig = await modelProviderResolver.getActiveModelConfig(userId, modelSlug);

  if (dbConfig) {
    const dbProviderSlug = dbConfig.provider.slug;
    logger.info(`[AgentModelResolver] Step 1: Found DB config for "${modelSlug}" under provider "${dbProviderSlug}" (apiKey=${!!dbConfig.provider.apiKey})`);

    if (dbConfig.provider.apiKey) {
      const url = resolveProviderUrl(dbConfig.provider, dbProviderSlug);
      logger.info(`[AgentModelResolver] Step 1: URL resolved="${url}" (baseUrl="${dbConfig.provider.baseUrl}", anthropicUrl="${dbConfig.provider.anthropicUrl}")`);

      if (url) {
        const baseModel = getModel(dbProviderSlug as KnownProvider, modelSlug as never);

        if (baseModel) {
          logger.info(`[AgentModelResolver] Step 1: Using pi-ai built-in model with DB URL override`);
          return { model: { ...baseModel, baseUrl: url }, apiKey: dbConfig.provider.apiKey };
        }

        const model: Model<Api> = {
          id: modelSlug,
          name: modelSlug,
          api: inferApiType(dbProviderSlug),
          provider: dbProviderSlug,
          baseUrl: url,
          reasoning: false,
          input: ['text'] as ('text' | 'image')[],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: dbConfig.model.contextWindow ?? 128000,
          maxTokens: 4096,
        };
        logger.info(`[AgentModelResolver] Step 1: Using custom model definition (api=${model.api})`);
        return { model, apiKey: dbConfig.provider.apiKey };
      }
      logger.warn(`[AgentModelResolver] Step 1: URL resolved to undefined, falling through`);
    }
  } else {
    logger.info(`[AgentModelResolver] Step 1: No DB model config found for "${modelSlug}"`);
  }

  // 2. User's default model config
  const defaultConfig = await modelProviderResolver.getDefaultModelConfig(userId);

  if (defaultConfig) {
    const slug = defaultConfig.model.slug;
    const prov = defaultConfig.provider.slug ?? provider;
    logger.info(`[AgentModelResolver] Step 2: Found default model "${slug}" under provider "${prov}" (apiKey=${!!defaultConfig.provider.apiKey})`);

    if (defaultConfig.provider.apiKey) {
      const url = resolveProviderUrl(defaultConfig.provider, prov);
      logger.info(`[AgentModelResolver] Step 2: URL resolved="${url}" (baseUrl="${defaultConfig.provider.baseUrl}", anthropicUrl="${defaultConfig.provider.anthropicUrl}")`);

      if (url) {
        const baseModel = getModel(prov as KnownProvider, slug as never);

        if (baseModel) {
          logger.info(`[AgentModelResolver] Step 2: Using default model from DB: ${prov}/${slug}`);
          return { model: { ...baseModel, baseUrl: url }, apiKey: defaultConfig.provider.apiKey };
        }

        const model: Model<Api> = {
          id: slug,
          name: slug,
          api: inferApiType(prov),
          provider: prov,
          baseUrl: url,
          reasoning: false,
          input: ['text'] as ('text' | 'image')[],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: defaultConfig.model.contextWindow ?? 128000,
          maxTokens: 4096,
        };
        logger.info(`[AgentModelResolver] Step 2: Using custom default model: ${prov}/${slug}`);
        return { model, apiKey: defaultConfig.provider.apiKey };
      }
      logger.warn(`[AgentModelResolver] Step 2: URL resolved to undefined, falling through`);
    }
  } else {
    logger.info(`[AgentModelResolver] Step 2: No default model found for user=${userId}`);
  }

  // 3. pi-ai built-in registry + DB provider apiKey lookup
  logger.info(`[AgentModelResolver] Step 3: Trying pi-ai built-in registry for ${provider}/${modelSlug}`);
  const model = getModel(provider as KnownProvider, modelSlug as never);
  if (!model) {
    throw new Error(
      `不支持的模型: ${provider}/${modelSlug}。请在设置中配置模型服务商。`,
    );
  }

  // Try to find an apiKey from the user's DB provider matching the request provider slug
  const dbProvider = await modelProviderRepository.findByUserIdAndSlug(userId, provider);
  if (dbProvider?.apiKey) {
    const url = resolveProviderUrl(dbProvider, provider);
    logger.info(`[AgentModelResolver] Step 3: Found DB provider "${provider}" with apiKey, URL="${url}"`);
    if (url) {
      return { model: { ...model, baseUrl: url }, apiKey: dbProvider.apiKey };
    }
    return { model, apiKey: dbProvider.apiKey };
  }

  // 4. Final fallback — no apiKey, rely on env vars
  logger.warn(
    `[AgentModelResolver] Step 4: No DB provider apiKey found for "${provider}", ` +
    `falling back to env var for ${provider}/${modelSlug}`,
  );
  return { model };
}
