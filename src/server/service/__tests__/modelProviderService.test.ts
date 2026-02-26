import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelProviderService } from '../modelProviderService';
import logger from '../../../server/base/logger';
import { modelProviderRepository, providerModelRepository, modelProviderCombinedRepository } from '@server/repository/modelProviderRepository';

// Mock repositories
vi.mock('@server/repository/modelProviderRepository', () => ({
  modelProviderRepository: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findByUserIdAndSlug: vi.fn(),
    existsByUserIdAndSlug: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    verifyOwnership: vi.fn(),
    toggleActive: vi.fn(),
  },
  providerModelRepository: {
    create: vi.fn(),
    findByProviderId: vi.fn(),
    findById: vi.fn(),
    findByProviderIdAndSlug: vi.fn(),
    existsByProviderIdAndSlug: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  modelProviderCombinedRepository: {
    verifyModelOwnership: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

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

describe('ModelProviderService', () => {
  let service: ModelProviderService;

  beforeEach(() => {
    service = new ModelProviderService();
    vi.clearAllMocks();
    // 重置所有 mocks 的实现
    vi.resetAllMocks();
  });

  describe('createProvider', () => {
    const validRequest = {
      name: 'OpenAI',
      slug: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      description: 'OpenAI API Provider',
    };

    it('应该成功创建新的模型提供商', async () => {
      (modelProviderRepository.findByUserIdAndSlug as any).mockResolvedValue(null);
      (modelProviderRepository.create as any).mockResolvedValue(mockProvider);

      const result = await service.createProvider(1, validRequest);

      expect(result).toEqual(mockProvider);
      expect(logger.info).toHaveBeenCalledWith('Model provider created: 1 for account 1');
    });

    it('当Slug已存在时应该抛出错误', async () => {
      (modelProviderRepository.findByUserIdAndSlug as any).mockResolvedValue(mockProvider);

      await expect(service.createProvider(1, validRequest)).rejects.toThrow('Slug already exists in this account');
    });

    it('数据库插入失败时应该抛出错误', async () => {
      (modelProviderRepository.findByUserIdAndSlug as any).mockResolvedValue(null);
      (modelProviderRepository.create as any).mockRejectedValue(new Error('Database error'));

      await expect(service.createProvider(1, validRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProvidersByAccountId', () => {
    it('应该返回账户的所有提供商', async () => {
      const providers = [mockProvider, { ...mockProvider, id: 2, slug: 'anthropic' }];
      (modelProviderRepository.findByUserId as any).mockResolvedValue(providers);

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual(providers);
    });

    it('当没有提供商时应该返回空数组', async () => {
      (modelProviderRepository.findByUserId as any).mockResolvedValue([]);

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual([]);
    });

    it('数据库查询失败时应该返回空数组', async () => {
      (modelProviderRepository.findByUserId as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProviderById', () => {
    it('应该返回指定ID的提供商', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);

      const result = await service.getProviderById(1);

      expect(result).toEqual(mockProvider);
    });

    it('当提供商不存在时应该返回null', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(null);

      const result = await service.getProviderById(999);

      expect(result).toBeNull();
    });

    it('数据库查询失败时应该返回null', async () => {
      (modelProviderRepository.findById as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getProviderById(1);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateProvider', () => {
    const updateRequest = {
      id: 1,
      name: 'OpenAI Updated',
      slug: 'openai-updated',
    };

    it('应该成功更新提供商', async () => {
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.findById as any).mockResolvedValueOnce(mockProvider); // For auth check
      (modelProviderRepository.existsByUserIdAndSlug as any).mockResolvedValueOnce(false); // For slug uniqueness check
      (modelProviderRepository.update as any).mockResolvedValue({ ...mockProvider, ...updateRequest });
      (modelProviderRepository.findById as any).mockResolvedValue({ ...mockProvider, ...updateRequest });

      const result = await service.updateProvider(1, 1, updateRequest);

      expect(result).toEqual(expect.objectContaining(updateRequest));
      expect(logger.info).toHaveBeenCalledWith('Model provider updated: 1');
    });

    it('当提供商不存在时应该返回null', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(null);

      const result = await service.updateProvider(999, 1, updateRequest);

      expect(result).toBeNull();
    });

    it('当Slug已存在时应该抛出错误', async () => {
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.findById as any).mockResolvedValueOnce(mockProvider);
      (modelProviderRepository.existsByUserIdAndSlug as any).mockResolvedValueOnce(true);

      await expect(service.updateProvider(1, 1, updateRequest)).rejects.toThrow('Slug already exists in this account');
    });

    it('数据库更新失败时应该抛出错误', async () => {
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.findById as any).mockResolvedValueOnce(mockProvider);
      (modelProviderRepository.existsByUserIdAndSlug as any).mockResolvedValueOnce(false);
      (modelProviderRepository.update as any).mockRejectedValue(new Error('Database error'));

      await expect(service.updateProvider(1, 1, updateRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteProvider', () => {
    it('应该成功删除提供商', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.delete as any).mockResolvedValue(true);

      const result = await service.deleteProvider(1, 1);

      expect(result).toBe(true);
    });

    it('当提供商不存在时应该返回false', async () => {
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(false);

      const result = await service.deleteProvider(999, 1);

      expect(result).toBe(false);
    });

    it('数据库删除失败时应该返回false', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.delete as any).mockRejectedValue(new Error('Database error'));

      const result = await service.deleteProvider(1, 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('setProviderActive', () => {
    it('应该成功设置提供商激活状态', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.toggleActive as any).mockResolvedValue({ ...mockProvider, isActive: false });

      const result = await service.setProviderActive(1, 1, false);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Model provider 1 active status set to false');
    });

    it('当提供商不存在时应该返回false', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(null);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(false);

      const result = await service.setProviderActive(999, 1, true);

      expect(result).toBe(false);
    });

    it('当无权限时应该返回false', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(false);

      const result = await service.setProviderActive(1, 1, true);

      expect(result).toBe(false);
    });

    it('数据库更新失败时应该返回false', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (modelProviderRepository.verifyOwnership as any).mockResolvedValue(true);
      (modelProviderRepository.toggleActive as any).mockRejectedValue(new Error('Database error'));

      const result = await service.setProviderActive(1, 1, true);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createModel', () => {
    const validModelRequest = {
      slug: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      supportsVision: true,
      supportsFunctionCalling: true,
    };

    it('应该成功创建新的模型', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (providerModelRepository.findByProviderIdAndSlug as any).mockResolvedValue(null);
      (providerModelRepository.create as any).mockResolvedValue(mockModel);

      const result = await service.createModel(1, validModelRequest);

      expect(result).toEqual(mockModel);
      expect(logger.info).toHaveBeenCalledWith('Provider model created: 1 for provider 1');
    });

    it('当提供商不存在时应该抛出错误', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(null);

      await expect(service.createModel(999, validModelRequest)).rejects.toThrow('Provider not found');
    });

    it('当模型Slug已存在时应该抛出错误', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (providerModelRepository.findByProviderIdAndSlug as any).mockResolvedValue(mockModel);

      await expect(service.createModel(1, validModelRequest)).rejects.toThrow('Model slug already exists for this provider');
    });

    it('数据库插入失败时应该抛出错误', async () => {
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (providerModelRepository.findByProviderIdAndSlug as any).mockResolvedValue(null);
      (providerModelRepository.create as any).mockRejectedValue(new Error('Database error'));

      await expect(service.createModel(1, validModelRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getModelsByProviderId', () => {
    it('应该返回提供商的所有模型', async () => {
      const models = [mockModel, { ...mockModel, id: 2, slug: 'gpt-3.5-turbo' }];
      (providerModelRepository.findByProviderId as any).mockResolvedValue(models);

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual(models);
    });

    it('当没有模型时应该返回空数组', async () => {
      (providerModelRepository.findByProviderId as any).mockResolvedValue([]);

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual([]);
    });

    it('数据库查询失败时应该返回空数组', async () => {
      (providerModelRepository.findByProviderId as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getModelById', () => {
    it('应该返回指定ID的模型', async () => {
      (providerModelRepository.findById as any).mockResolvedValue(mockModel);

      const result = await service.getModelById(1);

      expect(result).toEqual(mockModel);
    });

    it('当模型不存在时应该返回null', async () => {
      (providerModelRepository.findById as any).mockResolvedValue(null);

      const result = await service.getModelById(999);

      expect(result).toBeNull();
    });

    it('数据库查询失败时应该返回null', async () => {
      (providerModelRepository.findById as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getModelById(1);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateModel', () => {
    const updateModelRequest = {
      id: 1,
      name: 'GPT-4 Updated',
      contextWindow: 128000,
    };

    it('应该成功更新模型', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(true);
      (providerModelRepository.findById as any).mockResolvedValueOnce(mockModel); // First call for model lookup
      (providerModelRepository.existsByProviderIdAndSlug as any).mockResolvedValueOnce(false); // Second call for slug uniqueness check
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);
      (providerModelRepository.update as any).mockResolvedValue({ ...mockModel, ...updateModelRequest });
      (providerModelRepository.findById as any).mockResolvedValue({ ...mockModel, ...updateModelRequest });

      const result = await service.updateModel(1, 1, updateModelRequest);

      expect(result).toEqual(expect.objectContaining(updateModelRequest));
      expect(logger.info).toHaveBeenCalledWith('Provider model updated: 1');
    });

    it('当模型不存在时应该返回null', async () => {
      (providerModelRepository.findById as any).mockResolvedValue(null);

      const result = await service.updateModel(999, 1, updateModelRequest);

      expect(result).toBeNull();
    });

    it('当无权限时应该返回null', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(false);

      const result = await service.updateModel(1, 1, updateModelRequest);

      expect(result).toBeNull();
    });

    it('当模型Slug已存在时应该抛出错误', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(true);
      // 使用 mockImplementation 来控制多次调用的返回值
      (providerModelRepository.findById as any).mockImplementation((id: number) => {
        if (id === 1) {
          return Promise.resolve({ ...mockModel, slug: 'gpt-4-old' });
        }
        return Promise.resolve(null);
      });
      (providerModelRepository.existsByProviderIdAndSlug as any).mockResolvedValueOnce(true);
      (modelProviderRepository.findById as any).mockResolvedValue(mockProvider);

      await expect(service.updateModel(1, 1, { id: 1, slug: 'gpt-4-new' })).rejects.toThrow('Model slug already exists for this provider');
    });
  });

  describe('deleteModel', () => {
    it('应该成功删除模型', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(true);
      (providerModelRepository.findById as any).mockResolvedValue(mockModel);
      (providerModelRepository.delete as any).mockResolvedValue(true);

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Provider model deleted: 1');
    });

    it('当模型不存在时应该返回false', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(false);

      const result = await service.deleteModel(999, 1);

      expect(result).toBe(false);
    });

    it('当无权限时应该返回false', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(false);

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(false);
    });

    it('数据库删除失败时应该返回false', async () => {
      (modelProviderCombinedRepository.verifyModelOwnership as any).mockResolvedValue(true);
      (providerModelRepository.findById as any).mockResolvedValue(mockModel);
      (providerModelRepository.delete as any).mockRejectedValue(new Error('Database error'));

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});