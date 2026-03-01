import { WithRequestContext } from '../base/decorators';
import logger from '../base/logger';
import authService from '../service/authService';
import modelProviderService from '../service/modelProviderService';
import { modelProviderResolver } from '../service/modelProviderResolver';
import { BaseBizController } from './base';
import { z } from 'zod';

// Zod validation schemas
const ModelProviderSchema = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(100, '名称不能超过100个字符')
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/, '名称包含无效字符'),
  slug: z.string()
    .min(1, 'Slug不能为空')
    .max(50, 'Slug不能超过50个字符')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Slug只能包含字母、数字、连字符、下划线和点'),
  baseUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符')
    .refine(val => val.startsWith('https://'), 'URL必须使用https协议'),
  anthropicUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符')
    .refine(val => val.startsWith('https://'), 'URL必须使用https协议')
    .optional(),
  apiKey: z.string().optional(),
  description: z.string()
    .max(500, '描述不能超过500个字符')
    .optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

type ModelProviderType = z.infer<typeof ModelProviderSchema>;

const UpdateModelProviderSchema = z.object({
  id: z.number().int().positive(),
  name: z.string()
    .min(1, '名称不能为空')
    .max(100, '名称不能超过100个字符')
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/, '名称包含无效字符')
    .optional(),
  slug: z.string()
    .min(1, 'Slug不能为空')
    .max(50, 'Slug不能超过50个字符')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Slug只能包含字母、数字、连字符、下划线和点')
    .optional(),
  baseUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符')
    .refine(val => val.startsWith('https://'), 'URL必须使用https协议')
    .optional(),
  anthropicUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符')
    .refine(val => val.startsWith('https://'), 'URL必须使用https协议')
    .optional(),
  apiKey: z.string().optional(),
  description: z.string()
    .max(500, '描述不能超过500个字符')
    .optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

type UpdateModelProviderType = z.infer<typeof UpdateModelProviderSchema>;

const ProviderModelSchema = z.object({
  slug: z.string()
    .min(1, 'Model Slug不能为空')
    .max(50, 'Model Slug不能超过50个字符')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Slug只能包含字母、数字、连字符、下划线和点'),
  name: z.string()
    .min(1, '模型名称不能为空')
    .max(100, '模型名称不能超过100个字符'),
  contextWindow: z.number()
    .int()
    .min(1)
    .max(1000000)
    .optional(),
  providerId: z.number().int().positive(),
  supportsVision: z.boolean().optional(),
  supportsFunctionCalling: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

type ProviderModelType = z.infer<typeof ProviderModelSchema>;


const UpdateProviderModelSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string()
    .min(1, 'Model Slug不能为空')
    .max(50, 'Model Slug不能超过50个字符')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Slug只能包含字母、数字、连字符、下划线和点')
    .optional(),
  name: z.string()
    .min(1, '模型名称不能为空')
    .max(100, '模型名称不能超过100个字符')
    .optional(),
  contextWindow: z.number()
    .int()
    .min(1)
    .max(1000000)
    .optional(),
  supportsVision: z.boolean().optional(),
  supportsFunctionCalling: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

type UpdateProviderModelType = z.infer<typeof UpdateProviderModelSchema>;

/**
 * Model Provider Business Controller
 * Handles business logic for model provider CRUD operations
 */
export class ModelProviderBizController extends BaseBizController {
  /**
   * Get all available models for the current user
   */
  @WithRequestContext()
  async getAvailableModels() {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }


      const accountId = parseInt(userId);

      // Get available models from database
      const models = await modelProviderResolver.getAvailableModels(accountId);

      // Get the default model
      const defaultModel = await modelProviderResolver.getDefaultModelSlug(accountId);

      return this.success({
        models,
        defaultModel,
      });
    } catch (error) {
      logger.error('[ModelProviderBizController]Error getting available models:', error);
      return this.error('获取可用模型列表失败', 'get_models_error');
    }
  }

  /**
   * Get all providers for the current user's active account
   */
  @WithRequestContext()
  async getProviders() {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // Get current user's active account
      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      const providers = await modelProviderService.getProvidersByAccountId(parseInt(account.id));

      return this.success(providers);
    } catch (error) {
      logger.error('[ModelProviderBizController]Error getting providers:', error);
      return this.error('获取服务商列表失败', 'get_providers_error');
    }
  }

  /**
   * Create a new model provider
   */
  @WithRequestContext()
  async createProvider(body: ModelProviderType) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      // Validate input
      const validated = await this.validateParams(body, ModelProviderSchema);

      const provider = await modelProviderService.createProvider(parseInt(account.id), validated);

      return this.success(provider);
    } catch (error: any) {
      logger.error('[ModelProviderBizController]Error creating provider:', error);
      if (error.message === 'Slug already exists in this account') {
        return this.error('该 Slug 已存在', 'slug_already_exists');
      }
      if (error.message?.includes('validation')) {
        return this.error(error.message, 'validation_error');
      }
      return this.error('创建服务商失败', 'create_provider_error');
    }
  }

  /**
   * Update an existing provider
   */
  @WithRequestContext()
  async updateProvider(body: UpdateModelProviderType) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      // Validate input
      const validated = await this.validateParams(body, UpdateModelProviderSchema);

      const provider = await modelProviderService.updateProvider(
        validated.id,
        parseInt(account.id),
        validated,
      );

      if (!provider) {
        return this.error('服务商不存在或无权限修改', 'provider_not_found');
      }

      return this.success(provider);
    } catch (error: any) {
      logger.error('[ModelProviderBizController]Error updating provider:', error);
      if (error.message === 'Slug already exists in this account') {
        return this.error('该 Slug 已存在', 'slug_already_exists');
      }
      return this.error('更新服务商失败', 'update_provider_error');
    }
  }

  /**
   * Delete a provider
   */
  @WithRequestContext()
  async deleteProvider(body: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      if (!body.id) {
        return this.error('服务商 ID 不能为空', 'validation_error');
      }

      const providerId = parseInt(body.id);
      if (isNaN(providerId)) {
        return this.error('无效的服务商 ID', 'validation_error');
      }

      const success = await modelProviderService.deleteProvider(providerId, parseInt(account.id));

      if (!success) {
        return this.error('服务商不存在或无权限删除', 'provider_not_found');
      }

      return this.success({ message: '删除成功' });
    } catch (error) {
      logger.error('[ModelProviderBizController]Error deleting provider:', error);
      return this.error('删除服务商失败', 'delete_provider_error');
    }
  }

  /**
   * Set provider active status
   */
  @WithRequestContext()
  async setProviderActive(body: { id: string; isActive: boolean }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      if (body.id === undefined) {
        return this.error('服务商 ID 不能为空', 'validation_error');
      }

      if (body.isActive === undefined) {
        return this.error('状态不能为空', 'validation_error');
      }

      const providerId = parseInt(body.id);
      const isActive = String(body.isActive) === 'true';

      const success = await modelProviderService.setProviderActive(providerId, parseInt(account.id), isActive);

      if (!success) {
        return this.error('服务商不存在或无权限修改', 'provider_not_found');
      }

      return this.success({ message: '状态更新成功' });
    } catch (error) {
      logger.error('[ModelProviderBizController]Error setting provider active status:', error);
      return this.error('更新状态失败', 'set_provider_active_error');
    }
  }

  /**
   * Get models for a provider
   */
  @WithRequestContext()
  async getModels(param: any) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      if (!param.id) {
        return this.error('服务商 ID 不能为空', 'validation_error');
      }

      const providerId = parseInt(param.id);
      const provider = await modelProviderService.getProviderById(providerId);

      if (!provider || provider.userId !== parseInt(account.id)) {
        return this.error('服务商不存在', 'provider_not_found');
      }

      const models = await modelProviderService.getModelsByProviderId(providerId);

      return this.success(models);
    } catch (error) {
      logger.error('[ModelProviderBizController]Error getting models:', error);
      return this.error('获取模型列表失败', 'get_models_error');
    }
  }

  /**
   * Create a model for a provider
   */
  @WithRequestContext()
  async createModel(body: ProviderModelType) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      if (!body.providerId) {
        return this.error('服务商 ID 不能为空', 'validation_error');
      }

      const providerId = typeof body.providerId === 'string' ? parseInt(body.providerId) : body.providerId;
      const provider = await modelProviderService.getProviderById(providerId);

      if (!provider || provider.userId !== parseInt(account.id)) {
        return this.error('服务商不存在', 'provider_not_found');
      }

      // Validate input (extract providerId from body then validate the rest)
      const validated = await this.validateParams(body, ProviderModelSchema);

      const model = await modelProviderService.createModel(providerId, validated);

      return this.success(model);
    } catch (error: any) {
      logger.error('[ModelProviderBizController]Error creating model:', error);
      if (error.message === 'Provider not found') {
        return this.error('服务商不存在', 'provider_not_found');
      }
      if (error.message === 'Model slug already exists for this provider') {
        return this.error('该模型 Slug 已存在', 'model_slug_exists');
      }
      return this.error('创建模型失败', 'create_model_error');
    }
  }

  /**
   * Update a model
   */
  @WithRequestContext()
  async updateModel(body: any) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      // Validate input
      const validated = await this.validateParams(body, UpdateProviderModelSchema);

      const model = await modelProviderService.updateModel(
        validated.id,
        parseInt(account.id),
        validated,
      );

      if (!model) {
        return this.error('模型不存在或无权限修改', 'model_not_found');
      }

      return this.success(model);
    } catch (error: any) {
      if (error.message === 'Model slug already exists for this provider') {
        return this.error('该模型 Slug 已存在', 'model_slug_exists');
      }
      return this.error('更新模型失败', 'update_model_error');
    }
  }

  /**
   * Delete a model
   */
  @WithRequestContext()
  async deleteModel(body: any) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await authService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      if (!body.id) {
        return this.error('模型 ID 不能为空', 'validation_error');
      }

      const modelId = parseInt(body.id);
      const success = await modelProviderService.deleteModel(modelId, parseInt(account.id));

      if (!success) {
        return this.error('模型不存在或无权限删除', 'model_not_found');
      }

      return this.success({ message: '删除成功' });
    } catch (error) {
      return this.error('删除模型失败', 'delete_model_error');
    }
  }
}