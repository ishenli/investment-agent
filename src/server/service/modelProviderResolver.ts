import { modelProviderCombinedRepository } from '@server/repository/modelProviderRepository';
import logger from '@server/base/logger';

import type { ModelProvider, ProviderModel } from '@/types/modelProvider';

/**
 * Model Provider Resolver Service
 *
 * This service resolves model configuration for AI requests.
 * It queries the database for user-configured model providers and models,
 * with fallback to environment variables for backward compatibility.
 */
export class ModelProviderResolver {
  private logger = logger;

  /**
   * Get active model provider and model configuration for a user's model slug
   *
   * @param userId - The user's ID
   * @param modelSlug - The model slug to resolve
   * @returns The provider and model configuration, or null if not found
   */
  async getActiveModelConfig(
    userId: number,
    modelSlug: string
  ): Promise<{ provider: ModelProvider; model: ProviderModel } | null> {
    try {
      const result = await modelProviderCombinedRepository.findActiveModelConfigByUserIdAndSlug(
        userId,
        modelSlug
      );

      if (!result) {
        this.logger.info(
          `[ModelProviderResolver] No active model config found for model slug: ${modelSlug}, user: ${userId}`
        );
        return null;
      }

      this.logger.info(
        `[ModelProviderResolver] Found model config for ${modelSlug} from provider ${result.provider.name}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[ModelProviderResolver] Error querying model config for ${modelSlug}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get all available models for a user
   *
   * @param userId - The user's ID
   * @returns Array of available provider models
   */
  async getAvailableModels(userId: number): Promise<ProviderModel[]> {
    try {
      return await modelProviderCombinedRepository.findAllAvailableModelsByUserId(userId);
    } catch (error) {
      this.logger.error(`[ModelProviderResolver] Error getting available models:`, error);
      return [];
    }
  }

  /**
   * Check if a model slug is configured and active for a user
   *
   * @param userId - The user's ID
   * @param modelSlug - The model slug to check
   * @returns True if the model is available, false otherwise
   */
  async isModelAvailable(userId: number, modelSlug: string): Promise<boolean> {
    try {
      return await modelProviderCombinedRepository.isModelAvailableForUser(userId, modelSlug);
    } catch (error) {
      this.logger.error(
        `[ModelProviderResolver] Error checking model availability for ${modelSlug}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get the default model for a user
   * Returns the first active provider's first active model, sorted by displayOrder
   *
   * @param userId - The user's ID
   * @returns The default model slug or null if no models available
   */
  async getDefaultModelSlug(userId: number): Promise<string | null> {
    try {
      return await modelProviderCombinedRepository.findDefaultModelSlugByUserId(userId);
    } catch (error) {
      this.logger.error(`[ModelProviderResolver] Error getting default model:`, error);
      return null;
    }
  }

  /**
   * Get the default model configuration for a user
   * Returns the first active provider's first active model with full configuration
   *
   * @param userId - The user's ID
   * @returns The default model configuration or null if no models available
   */
  async getDefaultModelConfig(
    userId: number
  ): Promise<{ provider: ModelProvider; model: ProviderModel } | null> {
    try {
      const result = await modelProviderCombinedRepository.findDefaultModelConfigByUserId(userId);

      if (result) {
        this.logger.info(
          `[ModelProviderResolver] Found default model ${result.model.slug} from provider ${result.provider.name}`
        );
      } else {
        this.logger.info(`[ModelProviderResolver] No default model found for user ${userId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`[ModelProviderResolver] Error getting default model config:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const modelProviderResolver = new ModelProviderResolver();
