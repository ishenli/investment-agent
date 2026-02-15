import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelProviderService } from '../modelProviderService';
import logger from '../../../server/base/logger';
import { db } from '../../../server/lib/db';

// Mock modules
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field: any, value: any) => ({ field, value, operator: 'eq' })),
  and: vi.fn((...conditions: any[]) => ({ conditions, operator: 'and' })),
  desc: vi.fn((field: any) => ({ field, direction: 'desc' })),
  asc: vi.fn((field: any) => ({ field, direction: 'asc' })),
}));

vi.mock('@/drizzle/schema', () => ({
  modelProviders: {},
  providerModels: {},
  accounts: {},
}));

vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      modelProviders: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      providerModels: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
      (db.query.modelProviders.findFirst as any).mockResolvedValue(null);
      
      const mockInsert = vi.fn().mockResolvedValue([mockProvider]);
      const mockValues = vi.fn().mockReturnValue({
        returning: mockInsert,
      });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      const result = await service.createProvider(1, validRequest);

      expect(result).toEqual(mockProvider);
      expect(logger.info).toHaveBeenCalledWith('Model provider created: 1 for account 1');
    });

    it('当Slug已存在时应该抛出错误', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(mockProvider);

      await expect(service.createProvider(1, validRequest)).rejects.toThrow('Slug already exists in this account');
    });

    it('数据库插入失败时应该抛出错误', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(null);
      
      const mockInsert = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockValues = vi.fn().mockReturnValue({
        returning: mockInsert,
      });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      await expect(service.createProvider(1, validRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProvidersByAccountId', () => {
    it('应该返回账户的所有提供商', async () => {
      const providers = [mockProvider, { ...mockProvider, id: 2, slug: 'anthropic' }];
      (db.query.modelProviders.findMany as any).mockResolvedValue(providers);

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual(providers);
      expect(db.query.modelProviders.findMany).toHaveBeenCalled();
    });

    it('当没有提供商时应该返回空数组', async () => {
      (db.query.modelProviders.findMany as any).mockResolvedValue([]);

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual([]);
    });

    it('数据库查询失败时应该返回空数组', async () => {
      (db.query.modelProviders.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getProvidersByAccountId(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProviderById', () => {
    it('应该返回指定ID的提供商', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(mockProvider);

      const result = await service.getProviderById(1);

      expect(result).toEqual(mockProvider);
    });

    it('当提供商不存在时应该返回null', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(null);

      const result = await service.getProviderById(999);

      expect(result).toBeNull();
    });

    it('数据库查询失败时应该返回null', async () => {
      (db.query.modelProviders.findFirst as any).mockRejectedValue(new Error('Database error'));

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
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce(mockProvider); // For auth check
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce(null); // For slug uniqueness check
      
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
      (db.update as any).mockReturnValue({ set: mockSet });
      
      vi.spyOn(service, 'getProviderById').mockResolvedValue({ ...mockProvider, ...updateRequest });

      const result = await service.updateProvider(1, 1, updateRequest);

      expect(result).toEqual(expect.objectContaining(updateRequest));
      expect(logger.info).toHaveBeenCalledWith('Model provider updated: 1');
    });

    it('当提供商不存在时应该返回null', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(null);

      const result = await service.updateProvider(999, 1, updateRequest);

      expect(result).toBeNull();
    });

    it('当Slug已存在时应该抛出错误', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce(mockProvider);
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce({ ...mockProvider, id: 2 });

      await expect(service.updateProvider(1, 1, updateRequest)).rejects.toThrow('Slug already exists in this account');
    });

    it('数据库更新失败时应该抛出错误', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce(mockProvider);
      (db.query.modelProviders.findFirst as any).mockResolvedValueOnce(null);
      
      // Mock the full chain: db.update().set().where()
      const mockWhere = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      await expect(service.updateProvider(1, 1, updateRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteProvider', () => {
    it('应该成功删除提供商', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(mockProvider);
      
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockDelete });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await service.deleteProvider(1, 1);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Model provider deleted: 1');
    });

    it('当提供商不存在时应该返回false', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(null);

      const result = await service.deleteProvider(999, 1);

      expect(result).toBe(false);
    });

    it('数据库删除失败时应该返回false', async () => {
      (db.query.modelProviders.findFirst as any).mockResolvedValue(mockProvider);
      
      const mockWhere = vi.fn().mockRejectedValue(new Error('Database error'));
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await service.deleteProvider(1, 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('setProviderActive', () => {
    it('应该成功设置提供商激活状态', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await service.setProviderActive(1, 1, false);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Model provider 1 active status set to false');
    });

    it('当提供商不存在时应该返回false', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(null);

      const result = await service.setProviderActive(999, 1, true);

      expect(result).toBe(false);
    });

    it('当无权限时应该返回false', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue({ ...mockProvider, accountId: 2 });

      const result = await service.setProviderActive(1, 1, true);

      expect(result).toBe(false);
    });

    it('数据库更新失败时应该返回false', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      
      const mockSet = vi.fn().mockRejectedValue(new Error('Database error'));
      (db.update as any).mockReturnValue({ set: mockSet });

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
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      (db.query.providerModels.findFirst as any).mockResolvedValue(null);
      
      const mockInsert = vi.fn().mockResolvedValue([mockModel]);
      const mockValues = vi.fn().mockReturnValue({
        returning: mockInsert,
      });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      const result = await service.createModel(1, validModelRequest);

      expect(result).toEqual(mockModel);
      expect(logger.info).toHaveBeenCalledWith('Provider model created: 1 for provider 1');
    });

    it('当提供商不存在时应该抛出错误', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(null);

      await expect(service.createModel(999, validModelRequest)).rejects.toThrow('Provider not found');
    });

    it('当模型Slug已存在时应该抛出错误', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);

      await expect(service.createModel(1, validModelRequest)).rejects.toThrow('Model slug already exists for this provider');
    });

    it('数据库插入失败时应该抛出错误', async () => {
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      (db.query.providerModels.findFirst as any).mockResolvedValue(null);
      
      const mockInsert = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockValues = vi.fn().mockReturnValue({
        returning: mockInsert,
      });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      await expect(service.createModel(1, validModelRequest)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getModelsByProviderId', () => {
    it('应该返回提供商的所有模型', async () => {
      const models = [mockModel, { ...mockModel, id: 2, slug: 'gpt-3.5-turbo' }];
      (db.query.providerModels.findMany as any).mockResolvedValue(models);

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual(models);
      expect(db.query.providerModels.findMany).toHaveBeenCalled();
    });

    it('当没有模型时应该返回空数组', async () => {
      (db.query.providerModels.findMany as any).mockResolvedValue([]);

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual([]);
    });

    it('数据库查询失败时应该返回空数组', async () => {
      (db.query.providerModels.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await service.getModelsByProviderId(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getModelById', () => {
    it('应该返回指定ID的模型', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);

      const result = await service.getModelById(1);

      expect(result).toEqual(mockModel);
    });

    it('当模型不存在时应该返回null', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(null);

      const result = await service.getModelById(999);

      expect(result).toBeNull();
    });

    it('数据库查询失败时应该返回null', async () => {
      (db.query.providerModels.findFirst as any).mockRejectedValue(new Error('Database error'));

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
      (db.query.providerModels.findFirst as any).mockResolvedValueOnce(mockModel); // First call for model lookup
      (db.query.providerModels.findFirst as any).mockResolvedValueOnce(null); // Second call for slug uniqueness check
      
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
      (db.update as any).mockReturnValue({ set: mockSet });
      
      vi.spyOn(service, 'getModelById').mockResolvedValue({ ...mockModel, ...updateModelRequest });

      const result = await service.updateModel(1, 1, updateModelRequest);

      expect(result).toEqual(expect.objectContaining(updateModelRequest));
      expect(logger.info).toHaveBeenCalledWith('Provider model updated: 1');
    });

    it('当模型不存在时应该返回null', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(null);

      const result = await service.updateModel(999, 1, updateModelRequest);

      expect(result).toBeNull();
    });

    it('当无权限时应该返回null', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);
      vi.spyOn(service, 'getProviderById').mockResolvedValue({ ...mockProvider, accountId: 2 });

      const result = await service.updateModel(1, 1, updateModelRequest);

      expect(result).toBeNull();
    });

    it('当模型Slug已存在时应该抛出错误', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValueOnce(mockModel);
      (db.query.providerModels.findFirst as any).mockResolvedValueOnce({ ...mockModel, id: 2 });
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);

      await expect(service.updateModel(1, 1, { id: 1, slug: 'gpt-4-new' })).rejects.toThrow('Model slug already exists for this provider');
    });

    // TODO: 修复这个测试的状态污染问题
    // it('数据库更新失败时应该抛出错误', async () => {
    //   (db.query.providerModels.findFirst as any).mockResolvedValueOnce(mockModel);
    //   (db.query.providerModels.findFirst as any).mockResolvedValueOnce(null);
    //   vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
    //   
    //   // Mock the full chain: db.update().set().where()
    //   const mockWhere = vi.fn().mockRejectedValue(new Error('Database error'));
    //   const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    //   (db.update as any).mockReturnValue({ set: mockSet });

    //   await expect(service.updateModel(1, 1, updateModelRequest)).rejects.toThrow('Database error');
    //   expect(logger.error).toHaveBeenCalled();
    // });
  });

  describe('deleteModel', () => {
    it('应该成功删除模型', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      (db.delete as any).mockReturnValue({ where: mockDelete });

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Provider model deleted: 1');
    });

    it('当模型不存在时应该返回false', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(null);

      const result = await service.deleteModel(999, 1);

      expect(result).toBe(false);
    });

    it('当无权限时应该返回false', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);
      vi.spyOn(service, 'getProviderById').mockResolvedValue({ ...mockProvider, accountId: 2 });

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(false);
    });

    it('数据库删除失败时应该返回false', async () => {
      (db.query.providerModels.findFirst as any).mockResolvedValue(mockModel);
      vi.spyOn(service, 'getProviderById').mockResolvedValue(mockProvider);
      
      const mockDelete = vi.fn().mockRejectedValue(new Error('Database error'));
      (db.delete as any).mockReturnValue({ where: mockDelete });

      const result = await service.deleteModel(1, 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});