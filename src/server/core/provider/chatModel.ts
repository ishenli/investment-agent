import authService from '@server/service/authService';
import { modelProviderResolver } from '@server/service/modelProviderResolver';
import { ChatOpenAI } from '@langchain/openai';
import logger from '@server/base/logger';

// Model name type - can be any string for custom models
export type ModelNameType = string;

// Predefined model map for backward compatibility and reference
export const ModelMap = {
  'Kimi-K2.5': 'Kimi-K2.5',
  'Kimi-K2-Instruct': 'Kimi-K2-Instruct',
  'Qwen3-Next-80B-A3B-Instruct': 'Qwen3-Next-80B-A3B-Instruct',
  'Qwen3-235B-A22B-Instruct-2507': 'Qwen3-235B-A22B-Instruct-2507',
} as const;

/**
 * Get a ChatOpenAI instance with the specified model or default model
 *
 * This function resolves the model configuration from:
 * 1. User-configured model providers in the database
 * 2. Fallback to default model if specified model not found
 * 3. Fallback to environment variables (backward compatibility)
 *
 * @param modelSlug - Optional model slug to use. If not provided, uses default model.
 * @returns A ChatOpenAI instance configured with the appropriate credentials
 */
export async function chatModelOpenAI(modelSlug?: ModelNameType): Promise<ChatOpenAI> {
  let baseUrl: string | undefined;
  let apiKey: string | undefined;
  let actualModelSlug = modelSlug;

  try {
    // Try to get model configuration from database
    const account = await authService.getCurrentUserAccount();
    if (account) {
      const accountId = parseInt(account.id);

      if (modelSlug) {
        // Try to get the specified model
        const config = await modelProviderResolver.getActiveModelConfig(accountId, modelSlug);

        if (config) {
          baseUrl = config.provider.baseUrl;
          apiKey = config.provider.apiKey || undefined;
          logger.info(
            `[chatModelOpenAI] Using database config for model ${modelSlug} from provider ${config.provider.name}`
          );
        } else {
          // Model not found in user config, fallback to default model
          logger.warn(
            `[chatModelOpenAI] Model ${modelSlug} not found in user config, falling back to default model`
          );
          const defaultConfig = await modelProviderResolver.getDefaultModelConfig(accountId);

          if (defaultConfig) {
            baseUrl = defaultConfig.provider.baseUrl;
            apiKey = defaultConfig.provider.apiKey || undefined;
            actualModelSlug = defaultConfig.model.slug;
            logger.warn(
              `[chatModelOpenAI] Using default model ${actualModelSlug} from provider ${defaultConfig.provider.name}`
            );
          }
        }
      } else {
        // No model specified, get default model
        const config = await modelProviderResolver.getDefaultModelConfig(accountId);

        if (config) {
          baseUrl = config.provider.baseUrl;
          apiKey = config.provider.apiKey || undefined;
          actualModelSlug = config.model.slug;
          logger.info(
            `[chatModelOpenAI] Using default model ${actualModelSlug} from provider ${config.provider.name}`
          );
        }
      }
    }
  } catch (error) {
    logger.error('[chatModelOpenAI] Error resolving model config:', error);
  }

  // Fallback to environment variables if no database config found
  if (!baseUrl) {
    baseUrl = process.env.MODEL_PROVIDER_URL;
  }
  if (!apiKey) {
    apiKey = process.env.MODEL_PROVIDER_API_KEY;
  }

  // If still no config, throw error
  if (!baseUrl || !apiKey) {
    throw new Error(
      'Model provider configuration not found. Please configure a model provider in settings or set MODEL_PROVIDER_URL and MODEL_PROVIDER_API_KEY environment variables.',
    );
  }

  // Log warning if using environment variables
  if (!actualModelSlug) {
    logger.error(
      '[chatModelOpenAI] No model configured in database, using environment variables. Consider configuring a model provider in settings.'
    );
    throw new Error(
      'No model configured in database and MODEL_PROVIDER_URL and MODEL_PROVIDER_API_KEY environment variables are not set. Consider configuring a model provider in settings.'
    );
  }

  return new ChatOpenAI({
    model: actualModelSlug,
    configuration: {
      baseURL: baseUrl,
      apiKey: apiKey,
    },
  });
}

/**
 * Synchronous version of chatModelOpenAI that only uses environment variables
 *
 * This is maintained for backward compatibility in contexts where async is not possible.
 * For new code, prefer using the async version which supports user-configured providers.
 *
 * @param modelSlug - The model slug to use
 * @returns A ChatOpenAI instance configured with environment variables
 */
export function chatModelOpenAISync(modelSlug?: ModelNameType) {
  const baseUrl = process.env.MODEL_PROVIDER_URL;
  const apiKey = process.env.MODEL_PROVIDER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      'MODEL_PROVIDER_URL and MODEL_PROVIDER_API_KEY environment variables are required',
    );
  }

  return new ChatOpenAI({
    model: modelSlug,
    configuration: {
      baseURL: baseUrl,
      apiKey: apiKey,
    },
  });
}