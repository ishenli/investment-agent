import { eq, and } from 'drizzle-orm';
import { db } from '@server/lib/db';
import { modelProviders, providerModels } from '@drizzle/schema';
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
   * @param accountId - The user's account ID
   * @param modelSlug - The model slug to resolve
   * @returns The provider and model configuration, or null if not found
   */
  async getActiveModelConfig(
    accountId: number,
    modelSlug: string
  ): Promise<{ provider: ModelProvider; model: ProviderModel } | null> {
    try {
      // Query database for active provider with matching model
      const result = await db
        .select({
          provider: modelProviders,
          model: providerModels,
        })
        .from(providerModels)
        .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
        .where(
          and(
            eq(modelProviders.accountId, accountId),
            eq(modelProviders.isActive, true),
            eq(providerModels.isActive, true),
            eq(providerModels.slug, modelSlug)
          )
        )
        .limit(1);

      if (result.length === 0) {
        this.logger.info(
          `[ModelProviderResolver] No active model config found for model slug: ${modelSlug}, account: ${accountId}`
        );
        return null;
      }

      this.logger.info(
        `[ModelProviderResolver] Found model config for ${modelSlug} from provider ${result[0].provider.name}`
      );

      return {
        provider: result[0].provider as ModelProvider,
        model: result[0].model as ProviderModel,
      };
    } catch (error) {
      this.logger.error(
        `[ModelProviderResolver] Error querying model config for ${modelSlug}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get all available models for a user account
   *
   * @param accountId - The user's account ID
   * @returns Array of available provider models
   */
  async getAvailableModels(accountId: number): Promise<ProviderModel[]> {
    try {
      const models = await db
        .select({
          id: providerModels.id,
          providerId: providerModels.providerId,
          slug: providerModels.slug,
          name: providerModels.name,
          contextWindow: providerModels.contextWindow,
          supportsVision: providerModels.supportsVision,
          supportsFunctionCalling: providerModels.supportsFunctionCalling,
          isActive: providerModels.isActive,
          displayOrder: providerModels.displayOrder,
          createdAt: providerModels.createdAt,
          updatedAt: providerModels.updatedAt,
          providerName: modelProviders.name,
          providerSlug: modelProviders.slug,
        })
        .from(providerModels)
        .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
        .where(
          and(
            eq(modelProviders.accountId, accountId),
            eq(modelProviders.isActive, true),
            eq(providerModels.isActive, true)
          )
        )
        .orderBy(providerModels.displayOrder, modelProviders.id);

      return models.map((m) => ({
        ...m,
        // Create a composite field that references the provider
        providerName: m.providerName,
        providerSlug: m.providerSlug,
      } as ProviderModel & { providerName: string; providerSlug: string }));
    } catch (error) {
      this.logger.error(`[ModelProviderResolver] Error getting available models:`, error);
      return [];
    }
  }

  /**
   * Check if a model slug is configured and active for a user
   *
   * @param accountId - The user's account ID
   * @param modelSlug - The model slug to check
   * @returns True if the model is available, false otherwise
   */
  async isModelAvailable(accountId: number, modelSlug: string): Promise<boolean> {
    try {
      const model = await db
        .select({ id: providerModels.id })
        .from(providerModels)
        .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
        .where(
          and(
            eq(modelProviders.accountId, accountId),
            eq(modelProviders.isActive, true),
            eq(providerModels.isActive, true),
            eq(providerModels.slug, modelSlug)
          )
        )
        .limit(1);

      return model.length > 0;
    } catch (error) {
      this.logger.error(
        `[ModelProviderResolver] Error checking model availability for ${modelSlug}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get the default model for a user account
   * Returns the first active provider's first active model, sorted by displayOrder
   *
   * @param accountId - The user's account ID
   * @returns The default model slug or null if no models available
   */
  async getDefaultModelSlug(accountId: number): Promise<string | null> {
    try {
      const model = await db
        .select({ slug: providerModels.slug })
        .from(providerModels)
        .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
        .where(
          and(
            eq(modelProviders.accountId, accountId),
            eq(modelProviders.isActive, true),
            eq(providerModels.isActive, true)
          )
        )
        .orderBy(modelProviders.displayOrder, providerModels.id)
        .limit(1);

      return model.length > 0 ? model[0].slug : null;
    } catch (error) {
      this.logger.error(`[ModelProviderResolver] Error getting default model:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const modelProviderResolver = new ModelProviderResolver();