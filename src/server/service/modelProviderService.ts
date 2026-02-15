import { db } from '@server/lib/db';
import { modelProviders, providerModels, accounts } from '@/drizzle/schema';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import logger from '@server/base/logger';
import {
  ModelProvider,
  ProviderModel,
  CreateModelProviderRequest,
  UpdateModelProviderRequest,
  CreateProviderModelRequest,
  UpdateProviderModelRequest,
} from '@/types/modelProvider';

/**
 * Model Provider Service
 * Handles CRUD operations for model providers and their associated models
 */
export class ModelProviderService {
  /**
   * Create a new model provider
   * @param accountId Account ID
   * @param request Provider creation data
   * @returns Created provider
   */
  async createProvider(accountId: number, request: CreateModelProviderRequest): Promise<ModelProvider> {
    try {
      // Check for unique slug within account
      const existing = await db.query.modelProviders.findFirst({
        where: and(
          eq(modelProviders.accountId, accountId),
          eq(modelProviders.slug, request.slug),
        ),
      });

      if (existing) {
        throw new Error('Slug already exists in this account');
      }

      const [newProvider] = await db
        .insert(modelProviders)
        .values({
          accountId,
          slug: request.slug,
          name: request.name,
          baseUrl: request.baseUrl,
          apiKey: request.apiKey,
          description: request.description,
          isActive: request.isActive ?? true,
          displayOrder: request.displayOrder ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Model provider created: ${newProvider.id} for account ${accountId}`);

      return newProvider;
    } catch (error) {
      logger.error(`Failed to create model provider: ${error}`);
      throw error;
    }
  }

  /**
   * Get all providers for an account
   * @param accountId Account ID
   * @returns List of providers
   */
  async getProvidersByAccountId(accountId: number): Promise<ModelProvider[]> {
    try {
      const providers = await db.query.modelProviders.findMany({
        where: eq(modelProviders.accountId, accountId),
        orderBy: [asc(modelProviders.displayOrder), desc(modelProviders.createdAt)],
      });

      return providers;
    } catch (error) {
      logger.error(`Failed to get providers for account ${accountId}: ${error}`);
      return [];
    }
  }

  /**
   * Get a provider by ID
   * @param providerId Provider ID
   * @returns Provider or null
   */
  async getProviderById(providerId: number): Promise<ModelProvider | null> {
    try {
      const provider = await db.query.modelProviders.findFirst({
        where: eq(modelProviders.id, providerId),
      });

      return provider ?? null;
    } catch (error) {
      logger.error(`Failed to get provider ${providerId}: ${error}`);
      return null;
    }
  }

  /**
   * Update a provider
   * @param providerId Provider ID
   * @param accountId Account ID (for authorization)
   * @param request Update data
   * @returns Updated provider or null
   */
  async updateProvider(
    providerId: number,
    accountId: number,
    request: UpdateModelProviderRequest,
  ): Promise<ModelProvider | null> {
    try {
      // Verify provider belongs to account
      const provider = await db.query.modelProviders.findFirst({
        where: and(
          eq(modelProviders.id, providerId),
          eq(modelProviders.accountId, accountId),
        ),
      });

      if (!provider) {
        return null;
      }

      // If slug is being changed, check for uniqueness
      if (request.slug && request.slug !== provider.slug) {
        const existing = await db.query.modelProviders.findFirst({
          where: and(
            eq(modelProviders.accountId, accountId),
            eq(modelProviders.slug, request.slug),
            // Exclude current provider
          ),
        });

        if (existing && existing.id !== providerId) {
          throw new Error('Slug already exists in this account');
        }
      }

      // Update only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (request.name !== undefined) updateData.name = request.name;
      if (request.slug !== undefined) updateData.slug = request.slug;
      if (request.baseUrl !== undefined) updateData.baseUrl = request.baseUrl;
      if (request.apiKey !== undefined) updateData.apiKey = request.apiKey;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.isActive !== undefined) updateData.isActive = request.isActive;
      if (request.displayOrder !== undefined) updateData.displayOrder = request.displayOrder;

      await db
        .update(modelProviders)
        .set(updateData)
        .where(eq(modelProviders.id, providerId));

      const updated = await this.getProviderById(providerId);

      if (updated) {
        logger.info(`Model provider updated: ${providerId}`);
      }

      return updated;
    } catch (error) {
      logger.error(`Failed to update provider ${providerId}: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a provider (cascades to models)
   * @param providerId Provider ID
   * @param accountId Account ID
   * @returns Success status
   */
  async deleteProvider(providerId: number, accountId: number): Promise<boolean> {
    try {
      // Verify provider belongs to account
      const provider = await db.query.modelProviders.findFirst({
        where: and(
          eq(modelProviders.id, providerId),
          eq(modelProviders.accountId, accountId),
        ),
      });

      if (!provider) {
        return false;
      }

      await db
        .delete(modelProviders)
        .where(
          and(
            eq(modelProviders.id, providerId),
            eq(modelProviders.accountId, accountId),
          ),
        );

      logger.info(`Model provider deleted: ${providerId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to delete provider ${providerId}: ${error}`);
      return false;
    }
  }

  /**
   * Toggle provider active status
   * @param providerId Provider ID
   * @param accountId Account ID
   * @param isActive New active status
   * @returns Success status
   */
  async setProviderActive(providerId: number, accountId: number, isActive: boolean): Promise<boolean> {
    try {
      const provider = await this.getProviderById(providerId);

      if (!provider || provider.accountId !== accountId) {
        return false;
      }

      await db
        .update(modelProviders)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(modelProviders.id, providerId));

      logger.info(`Model provider ${providerId} active status set to ${isActive}`);

      return true;
    } catch (error) {
      logger.error(`Failed to set provider ${providerId} active status: ${error}`);
      return false;
    }
  }

  /**
   * Create a model for a provider
   * @param providerId Provider ID
   * @param request Model creation data
   * @returns Created model
   */
  async createModel(providerId: number, request: CreateProviderModelRequest): Promise<ProviderModel> {
    try {
      // Verify provider exists
      const provider = await this.getProviderById(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Check for unique slug within provider
      const existing = await db.query.providerModels.findFirst({
        where: and(
          eq(providerModels.providerId, providerId),
          eq(providerModels.slug, request.slug),
        ),
      });

      if (existing) {
        throw new Error('Model slug already exists for this provider');
      }

      const [newModel] = await db
        .insert(providerModels)
        .values({
          providerId,
          slug: request.slug,
          name: request.name,
          contextWindow: request.contextWindow,
          supportsVision: request.supportsVision ?? false,
          supportsFunctionCalling: request.supportsFunctionCalling ?? false,
          isActive: request.isActive ?? true,
          displayOrder: request.displayOrder ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Provider model created: ${newModel.id} for provider ${providerId}`);

      return newModel;
    } catch (error) {
      logger.error(`Failed to create model for provider ${providerId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get all models for a provider
   * @param providerId Provider ID
   * @returns List of models
   */
  async getModelsByProviderId(providerId: number): Promise<ProviderModel[]> {
    try {
      const models = await db.query.providerModels.findMany({
        where: eq(providerModels.providerId, providerId),
        orderBy: [asc(providerModels.displayOrder), desc(providerModels.createdAt)],
      });

      return models;
    } catch (error) {
      logger.error(`Failed to get models for provider ${providerId}: ${error}`);
      return [];
    }
  }

  /**
   * Get a model by ID
   * @param modelId Model ID
   * @returns Model or null
   */
  async getModelById(modelId: number): Promise<ProviderModel | null> {
    try {
      const model = await db.query.providerModels.findFirst({
        where: eq(providerModels.id, modelId),
      });

      return model ?? null;
    } catch (error) {
      logger.error(`Failed to get model ${modelId}: ${error}`);
      return null;
    }
  }

  /**
   * Update a model
   * @param modelId Model ID
   * @param accountId Account ID
   * @param request Update data
   * @returns Updated model or null
   */
  async updateModel(
    modelId: number,
    accountId: number,
    request: UpdateProviderModelRequest,
  ): Promise<ProviderModel | null> {
    try {
      // Get model and verify provider belongs to account
      const model = await db.query.providerModels.findFirst({
        where: eq(providerModels.id, modelId),
      });

      if (!model) {
        return null;
      }

      const provider = await this.getProviderById(model.providerId);
      if (!provider || provider.accountId !== accountId) {
        return null;
      }

      // If slug is being changed, check for uniqueness
      if (request.slug && request.slug !== model.slug) {
        const existing = await db.query.providerModels.findFirst({
          where: and(
            eq(providerModels.providerId, model.providerId),
            eq(providerModels.slug, request.slug),
          ),
        });

        if (existing && existing.id !== modelId) {
          throw new Error('Model slug already exists for this provider');
        }
      }

      // Update only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (request.slug !== undefined) updateData.slug = request.slug;
      if (request.name !== undefined) updateData.name = request.name;
      if (request.contextWindow !== undefined) updateData.contextWindow = request.contextWindow;
      if (request.supportsVision !== undefined) updateData.supportsVision = request.supportsVision;
      if (request.supportsFunctionCalling !== undefined) updateData.supportsFunctionCalling = request.supportsFunctionCalling;
      if (request.isActive !== undefined) updateData.isActive = request.isActive;
      if (request.displayOrder !== undefined) updateData.displayOrder = request.displayOrder;

      await db
        .update(providerModels)
        .set(updateData)
        .where(eq(providerModels.id, modelId));

      const updated = await this.getModelById(modelId);

      if (updated) {
        logger.info(`Provider model updated: ${modelId}`);
      }

      return updated;
    } catch (error) {
      logger.error(`Failed to update model ${modelId}: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a model
   * @param modelId Model ID
   * @param accountId Account ID
   * @returns Success status
   */
  async deleteModel(modelId: number, accountId: number): Promise<boolean> {
    try {
      // Get model and verify provider belongs to account
      const model = await db.query.providerModels.findFirst({
        where: eq(providerModels.id, modelId),
      });

      if (!model) {
        return false;
      }

      const provider = await this.getProviderById(model.providerId);
      if (!provider || provider.accountId !== accountId) {
        return false;
      }

      await db.delete(providerModels).where(eq(providerModels.id, modelId));

      logger.info(`Provider model deleted: ${modelId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to delete model ${modelId}: ${error}`);
      return false;
    }
  }
}

const modelProviderService = new ModelProviderService();

export default modelProviderService;