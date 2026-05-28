import {
  modelProviderRepository,
  providerModelRepository,
  modelProviderCombinedRepository,
} from '@server/repository/modelProviderRepository';
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
 * Handles business logic for model providers and their associated models
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
      const existing = await modelProviderRepository.findByUserIdAndSlug(accountId, request.slug);

      if (existing) {
        throw new Error('Slug already exists in this account');
      }

      const newProvider = await modelProviderRepository.create({
        userId: accountId,
        slug: request.slug,
        name: request.name,
        baseUrl: request.baseUrl || '',
        anthropicUrl: request.anthropicUrl || '',
        apiKey: request.apiKey ?? null,
        description: request.description ?? null,
        isActive: request.isActive ?? true,
        displayOrder: request.displayOrder ?? 0,
      });

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
      return await modelProviderRepository.findByUserId(accountId);
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
      return await modelProviderRepository.findById(providerId);
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
      const hasOwnership = await modelProviderRepository.verifyOwnership(providerId, accountId);
      if (!hasOwnership) {
        return null;
      }

      const provider = await modelProviderRepository.findById(providerId);
      if (!provider) {
        return null;
      }

      // If slug is being changed, check for uniqueness
      if (request.slug && request.slug !== provider.slug) {
        const exists = await modelProviderRepository.existsByUserIdAndSlug(
          accountId,
          request.slug,
          providerId
        );

        if (exists) {
          throw new Error('Slug already exists in this account');
        }
      }

      // Update only provided fields
      const updateData: any = {};

      if (request.name !== undefined) updateData.name = request.name;
      if (request.slug !== undefined) updateData.slug = request.slug;
      if (request.baseUrl !== undefined) updateData.baseUrl = request.baseUrl;
      if (request.anthropicUrl !== undefined) updateData.anthropicUrl = request.anthropicUrl;
      if (request.apiKey !== undefined) updateData.apiKey = request.apiKey;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.isActive !== undefined) updateData.isActive = request.isActive;
      if (request.displayOrder !== undefined) updateData.displayOrder = request.displayOrder;

      const updated = await modelProviderRepository.update(providerId, updateData);

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
      const hasOwnership = await modelProviderRepository.verifyOwnership(providerId, accountId);
      if (!hasOwnership) {
        return false;
      }

      // Delete provider (models will be cascaded due to onDelete: 'cascade' in schema)
      return await modelProviderRepository.delete(providerId);
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
      const hasOwnership = await modelProviderRepository.verifyOwnership(providerId, accountId);
      if (!hasOwnership) {
        return false;
      }

      const updated = await modelProviderRepository.toggleActive(providerId, isActive);

      if (updated) {
        logger.info(`Model provider ${providerId} active status set to ${isActive}`);
        return true;
      }

      return false;
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
      const provider = await modelProviderRepository.findById(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Check for unique slug within provider
      const existing = await providerModelRepository.findByProviderIdAndSlug(providerId, request.slug);
      if (existing) {
        throw new Error('Model slug already exists for this provider');
      }

      const newModel = await providerModelRepository.create({
        providerId,
        slug: request.slug,
        name: request.name,
        contextWindow: request.contextWindow ?? null,
        supportsVision: request.supportsVision ?? false,
        supportsFunctionCalling: request.supportsFunctionCalling ?? false,
        isActive: request.isActive ?? true,
        displayOrder: request.displayOrder ?? 0,
      });

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
      return await providerModelRepository.findByProviderId(providerId);
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
      return await providerModelRepository.findById(modelId);
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
      // Verify model belongs to user's provider
      const hasOwnership = await modelProviderCombinedRepository.verifyModelOwnership(modelId, accountId);
      if (!hasOwnership) {
        return null;
      }

      const model = await providerModelRepository.findById(modelId);
      if (!model) {
        return null;
      }

      // If slug is being changed, check for uniqueness
      if (request.slug && request.slug !== model.slug) {
        const exists = await providerModelRepository.existsByProviderIdAndSlug(
          model.providerId,
          request.slug,
          modelId
        );

        if (exists) {
          throw new Error('Model slug already exists for this provider');
        }
      }

      // Update only provided fields
      const updateData: Partial<UpdateProviderModelRequest> = {};

      if (request.slug !== undefined) updateData.slug = request.slug;
      if (request.name !== undefined) updateData.name = request.name;
      if (request.contextWindow !== undefined) updateData.contextWindow = request.contextWindow;
      if (request.supportsVision !== undefined) updateData.supportsVision = request.supportsVision;
      if (request.supportsFunctionCalling !== undefined) updateData.supportsFunctionCalling = request.supportsFunctionCalling;
      if (request.isActive !== undefined) updateData.isActive = request.isActive;
      if (request.displayOrder !== undefined) updateData.displayOrder = request.displayOrder;

      const updated = await providerModelRepository.update(modelId, updateData);

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
      // Verify model belongs to user's provider
      const hasOwnership = await modelProviderCombinedRepository.verifyModelOwnership(modelId, accountId);
      if (!hasOwnership) {
        return false;
      }

      const success = await providerModelRepository.delete(modelId);

      if (success) {
        logger.info(`Provider model deleted: ${modelId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Failed to delete model ${modelId}: ${error}`);
      return false;
    }
  }
}

const modelProviderService = new ModelProviderService();

export default modelProviderService;
