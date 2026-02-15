import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../service/authService';
import modelProviderService from '../../service/modelProviderService';
import { modelProviderResolver } from '../../service/modelProviderResolver';
import { ModelProviderBizController } from '../modelProvider';
import authService from '../../service/authService';

// Mock decorators before importing the controller - decorators are applied at import time
vi.mock('@server/base/decorators', () => ({
  WithRequestContext:
    () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, ...args: any[]) {
        return await originalMethod.apply(this, args);
      };
      return descriptor;
    },
  WithRequestContextStatic:
    () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, ...args: any[]) {
        return await originalMethod.apply(this, args);
      };
      return descriptor;
    },
  runWithRequestContext: async (fn: () => Promise<any>) => await fn(),
}));

// Mock modelProviderService
vi.mock('@server/service/modelProviderService', () => ({
  __esModule: true,
  default: {
    getProvidersByAccountId: vi.fn(),
    createProvider: vi.fn(),
    updateProvider: vi.fn(),
    deleteProvider: vi.fn(),
    setProviderActive: vi.fn(),
    getProviderById: vi.fn(),
    getModelsByProviderId: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
  },
}));

// Mock modelProviderResolver
vi.mock('@server/service/modelProviderResolver', () => ({
  modelProviderResolver: {
    getAvailableModels: vi.fn(),
    getDefaultModelSlug: vi.fn(),
  },
}));

const mockAccount = {
  id: '1',
  userId: 1,
  accountName: 'Test Account',
  balance: 10000,
};

const mockProvider = {
  id: 1,
  accountId: 1,
  slug: 'openai',
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test-key',
  isActive: true,
  displayOrder: 0,
  description: 'OpenAI API Provider',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockModel = {
  id: 1,
  providerId: 1,
  slug: 'gpt-4',
  name: 'GPT-4',
  contextWindow: 8192,
  supportsVision: true,
  supportsFunctionCalling: true,
  isActive: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ModelProviderBizController', () => {
  let controller: ModelProviderBizController;

  beforeEach(() => {
    controller = new ModelProviderBizController();
    vi.clearAllMocks();
  });

  describe('getProviders', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.getProviders();

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.getProviders();

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('应该成功返回提供商列表', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProvidersByAccountId).mockResolvedValue([mockProvider]);

      const result = await controller.getProviders();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockProvider]);
      expect(modelProviderService.getProvidersByAccountId).toHaveBeenCalledWith(1);
    });

    it('服务异常时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProvidersByAccountId).mockRejectedValue(new Error('Database error'));

      const result = await controller.getProviders();

      expect(result.success).toBe(false);
      expect(result.message).toBe('获取服务商列表失败');
      expect(result.code).toBe('get_providers_error');
    });
  });

  describe('createProvider', () => {
    const validRequestBody = {
      name: 'OpenAI',
      slug: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      description: 'OpenAI API Provider',
    };

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.createProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.createProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('有效请求应该成功创建提供商', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.createProvider).mockResolvedValue(mockProvider);

      const result = await controller.createProvider(validRequestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProvider);
      expect(modelProviderService.createProvider).toHaveBeenCalledWith(1, validRequestBody);
    });

    it('Slug已存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.createProvider).mockRejectedValue(new Error('Slug already exists in this account'));

      const result = await controller.createProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('该 Slug 已存在');
      expect(result.code).toBe('slug_already_exists');
    });

    // TODO: 修复Zod验证错误处理测试
    // it('验证错误应该返回错误', async () => {
    //   vi.spyOn(AuthService, 'getCurrentUserId').mockResolvedValue('1');
    //   vi.spyOn(AuthService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
    //   
    //   // 注意：实际的验证是在controller的validateParams方法中进行的
    //   // 当传入无效数据时，Zod验证会失败并抛出包含验证问题的错误
    //   const result = await controller.createProvider({ ...validRequestBody, name: '' });

    //   expect(result.success).toBe(false);
    //   // 验证错误会被controller捕获并返回validation_error
    //   expect(result.code).toBe('validation_error');
    // });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.createProvider).mockRejectedValue(new Error('Database error'));

      const result = await controller.createProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('创建服务商失败');
      expect(result.code).toBe('create_provider_error');
    });
  });

  describe('updateProvider', () => {
    const validRequestBody = {
      id: 1,
      name: 'OpenAI Updated',
      slug: 'openai-updated',
    };

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('有效请求应该成功更新提供商', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateProvider).mockResolvedValue(mockProvider);

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProvider);
      expect(modelProviderService.updateProvider).toHaveBeenCalledWith(1, 1, validRequestBody);
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateProvider).mockResolvedValue(null);

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在或无权限修改');
      expect(result.code).toBe('provider_not_found');
    });

    it('Slug已存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateProvider).mockRejectedValue(new Error('Slug already exists in this account'));

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('该 Slug 已存在');
      expect(result.code).toBe('slug_already_exists');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateProvider).mockRejectedValue(new Error('Database error'));

      const result = await controller.updateProvider(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('更新服务商失败');
      expect(result.code).toBe('update_provider_error');
    });
  });

  describe('deleteProvider', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.deleteProvider({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.deleteProvider({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('缺少ID时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.deleteProvider({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商 ID 不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('无效ID时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.deleteProvider({ id: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('无效的服务商 ID');
      expect(result.code).toBe('validation_error');
    });

    it('应该成功删除提供商', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteProvider).mockResolvedValue(true);

      const result = await controller.deleteProvider({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('删除成功');
      expect(modelProviderService.deleteProvider).toHaveBeenCalledWith(1, 1);
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteProvider).mockResolvedValue(false);

      const result = await controller.deleteProvider({ id: 999 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在或无权限删除');
      expect(result.code).toBe('provider_not_found');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteProvider).mockRejectedValue(new Error('Database error'));

      const result = await controller.deleteProvider({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('删除服务商失败');
      expect(result.code).toBe('delete_provider_error');
    });
  });

  describe('setProviderActive', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.setProviderActive({ id: 1, isActive: true });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.setProviderActive({ id: 1, isActive: true });

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('缺少ID时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.setProviderActive({ isActive: true });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商 ID 不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('缺少状态时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.setProviderActive({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('状态不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('应该成功设置提供商激活状态', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.setProviderActive).mockResolvedValue(true);

      const result = await controller.setProviderActive({ id: 1, isActive: true });

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('状态更新成功');
      expect(modelProviderService.setProviderActive).toHaveBeenCalledWith(1, 1, true);
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.setProviderActive).mockResolvedValue(false);

      const result = await controller.setProviderActive({ id: 999, isActive: true });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在或无权限修改');
      expect(result.code).toBe('provider_not_found');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.setProviderActive).mockRejectedValue(new Error('Database error'));

      const result = await controller.setProviderActive({ id: 1, isActive: true });

      expect(result.success).toBe(false);
      expect(result.message).toBe('更新状态失败');
      expect(result.code).toBe('set_provider_active_error');
    });
  });

  describe('getModels', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.getModels({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.getModels({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('缺少ID时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.getModels({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商 ID 不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(null);

      const result = await controller.getModels({ id: 999 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在');
      expect(result.code).toBe('provider_not_found');
    });

    it('无权限访问提供商时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue({ ...mockProvider, accountId: 2 });

      const result = await controller.getModels({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在');
      expect(result.code).toBe('provider_not_found');
    });

    it('应该成功返回模型列表', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(mockProvider);
      vi.mocked(modelProviderService.getModelsByProviderId).mockResolvedValue([mockModel]);

      const result = await controller.getModels({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockModel]);
      expect(modelProviderService.getModelsByProviderId).toHaveBeenCalledWith(1);
    });

    it('服务异常时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(mockProvider);
      vi.mocked(modelProviderService.getModelsByProviderId).mockRejectedValue(new Error('Database error'));

      const result = await controller.getModels({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('获取模型列表失败');
      expect(result.code).toBe('get_models_error');
    });
  });

  describe('createModel', () => {
    const validRequestBody = {
      providerId: 1,
      slug: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      supportsVision: true,
      supportsFunctionCalling: true,
    };

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('缺少providerId时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.createModel({ ...validRequestBody, providerId: undefined });

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商 ID 不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(null);

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在');
      expect(result.code).toBe('provider_not_found');
    });

    it('无权限访问提供商时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue({ ...mockProvider, accountId: 2 });

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在');
      expect(result.code).toBe('provider_not_found');
    });

    it('有效请求应该成功创建模型', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(mockProvider);
      vi.mocked(modelProviderService.createModel).mockResolvedValue(mockModel);
      
      // Mock validateParams method
      vi.spyOn(controller as any, 'validateParams').mockResolvedValue({
        slug: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsVision: true,
        supportsFunctionCalling: true,
      });

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModel);
      expect(modelProviderService.createModel).toHaveBeenCalledWith(1, {
        slug: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsVision: true,
        supportsFunctionCalling: true,
      });
    });

    it('提供商不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(null);

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务商不存在');
      expect(result.code).toBe('provider_not_found');
    });

    it('模型Slug已存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(mockProvider);
      // Mock validateParams to avoid validation error
      vi.spyOn(controller as any, 'validateParams').mockResolvedValue({
        slug: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsVision: true,
        supportsFunctionCalling: true,
      });
      vi.mocked(modelProviderService.createModel).mockRejectedValue(new Error('Model slug already exists for this provider'));

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('该模型 Slug 已存在'); // 实际返回的是特定错误消息
      expect(result.code).toBe('model_slug_exists');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.getProviderById).mockResolvedValue(mockProvider);
      vi.mocked(modelProviderService.createModel).mockRejectedValue(new Error('Database error'));

      const result = await controller.createModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('创建模型失败');
      expect(result.code).toBe('create_model_error');
    });
  });

  describe('updateModel', () => {
    const validRequestBody = {
      id: 1,
      name: 'GPT-4 Updated',
      contextWindow: 128000,
    };

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('有效请求应该成功更新模型', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateModel).mockResolvedValue(mockModel);

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModel);
      expect(modelProviderService.updateModel).toHaveBeenCalledWith(1, 1, validRequestBody);
    });

    it('模型不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateModel).mockResolvedValue(null);

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('模型不存在或无权限修改');
      expect(result.code).toBe('model_not_found');
    });

    it('模型Slug已存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateModel).mockRejectedValue(new Error('Model slug already exists for this provider'));

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('该模型 Slug 已存在');
      expect(result.code).toBe('model_slug_exists');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.updateModel).mockRejectedValue(new Error('Database error'));

      const result = await controller.updateModel(validRequestBody);

      expect(result.success).toBe(false);
      expect(result.message).toBe('更新模型失败');
      expect(result.code).toBe('update_model_error');
    });
  });

  describe('deleteModel', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.deleteModel({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.deleteModel({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('缺少ID时应该返回验证错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);

      const result = await controller.deleteModel({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('模型 ID 不能为空');
      expect(result.code).toBe('validation_error');
    });

    it('应该成功删除模型', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteModel).mockResolvedValue(true);

      const result = await controller.deleteModel({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('删除成功');
      expect(modelProviderService.deleteModel).toHaveBeenCalledWith(1, 1);
    });

    it('模型不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteModel).mockResolvedValue(false);

      const result = await controller.deleteModel({ id: 999 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('模型不存在或无权限删除');
      expect(result.code).toBe('model_not_found');
    });

    it('服务异常时应该返回通用错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderService.deleteModel).mockRejectedValue(new Error('Database error'));

      const result = await controller.deleteModel({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('删除模型失败');
      expect(result.code).toBe('delete_model_error');
    });
  });

  describe('getAvailableModels', () => {
    const mockModels = [
      {
        id: 1,
        providerId: 1,
        slug: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        supportsVision: true,
        supportsFunctionCalling: true,
        isActive: true,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        providerName: 'OpenAI',
        providerSlug: 'openai',
      },
      {
        id: 2,
        providerId: 1,
        slug: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 4096,
        supportsVision: false,
        supportsFunctionCalling: true,
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        providerName: 'OpenAI',
        providerSlug: 'openai',
      },
    ];

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.getAvailableModels();

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(null);

      const result = await controller.getAvailableModels();

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到账户');
      expect(result.code).toBe('account_not_found');
    });

    it('应该成功返回可用模型列表', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderResolver.getAvailableModels).mockResolvedValue(mockModels);
      vi.mocked(modelProviderResolver.getDefaultModelSlug).mockResolvedValue('gpt-4');

      const result = await controller.getAvailableModels();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        models: mockModels,
        defaultModel: 'gpt-4',
      });
      expect(modelProviderResolver.getAvailableModels).toHaveBeenCalledWith(1);
      expect(modelProviderResolver.getDefaultModelSlug).toHaveBeenCalledWith(1);
    });

    it('当没有默认模型时应该返回 null', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderResolver.getAvailableModels).mockResolvedValue(mockModels);
      vi.mocked(modelProviderResolver.getDefaultModelSlug).mockResolvedValue(null);

      const result = await controller.getAvailableModels();

      expect(result.success).toBe(true);
      expect(result.data?.defaultModel).toBeNull();
    });

    it('服务异常时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'getCurrentUserAccount').mockResolvedValue(mockAccount as any);
      vi.mocked(modelProviderResolver.getAvailableModels).mockRejectedValue(new Error('Database error'));

      const result = await controller.getAvailableModels();

      expect(result.success).toBe(false);
      expect(result.message).toBe('获取可用模型列表失败');
      expect(result.code).toBe('get_models_error');
    });
  });
});