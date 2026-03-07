import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetMetaService } from '../assetMetaService';
import { AssetMetaType } from '@/types/assetMeta';
import { assetMetaRepository } from '@server/repository/assetMetaRepository';

// Mock repository
vi.mock('@server/repository/assetMetaRepository', () => ({
  assetMetaRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    searchBySymbol: vi.fn(),
    createAssetMeta: vi.fn(),
    updateAssetMeta: vi.fn(),
    softDelete: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));


const mockAssetMeta: AssetMetaType = {
  id: 1,
  symbol: 'AAPL',
  priceCents: 17500,
  assetType: 'stock',
  currency: 'USD',
  market: 'US',
  chineseName: '苹果',
  investmentMemo: '科技股',
  source: 'finnhub',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockDeletedAssetMeta: AssetMetaType = {
  ...mockAssetMeta,
  deletedAt: new Date(),
};

describe('AssetMetaService', () => {
  let assetMetaService: AssetMetaService;

  beforeEach(() => {
    assetMetaService = new AssetMetaService();
    vi.clearAllMocks();
  });

  describe('getAllAssetMetas', () => {
    it('应该返回所有未删除的 assetMeta 记录', async () => {
      (assetMetaRepository.findMany as any).mockResolvedValue([mockAssetMeta]);

      const result = await assetMetaService.getAllAssetMetas(false);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].deletedAt).toBeNull();
    });

    it('应该返回包含已删除的 assetMeta 记录', async () => {
      (assetMetaRepository.findMany as any).mockResolvedValue([
        mockAssetMeta,
        mockDeletedAssetMeta,
      ]);

      const result = await assetMetaService.getAllAssetMetas(true);

      expect(result).toHaveLength(2);
    });

    it('数据库错误时应该返回空数组', async () => {
      (assetMetaRepository.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await assetMetaService.getAllAssetMetas();

      expect(result).toHaveLength(0);
    });
  });

  describe('getAssetMetaById', () => {
    it('应该返回指定 ID 的 assetMeta 记录', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue(mockAssetMeta);

      const result = await assetMetaService.getAssetMetaById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.symbol).toBe('AAPL');
    });

    it('不应返回已删除的记录（includeDeleted = false）', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue(null);

      const result = await assetMetaService.getAssetMetaById(1, false);

      expect(result).toBeNull();
    });

    it('应该返回已删除的记录（includeDeleted = true）', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue(mockDeletedAssetMeta);

      const result = await assetMetaService.getAssetMetaById(1, true);

      expect(result).not.toBeNull();
      expect(result?.deletedAt).not.toBeNull();
    });

    it('记录不存在时应该返回 null', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue(null);

      const result = await assetMetaService.getAssetMetaById(999);

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      (assetMetaRepository.findById as any).mockRejectedValue(new Error('Database error'));

      const result = await assetMetaService.getAssetMetaById(1);

      expect(result).toBeNull();
    });
  });

  describe('searchAssetMetasBySymbol', () => {
    it('应该根据 symbol 搜索 assetMeta 记录', async () => {
      (assetMetaRepository.searchBySymbol as any).mockResolvedValue([mockAssetMeta]);

      const result = await assetMetaService.searchAssetMetasBySymbol('AAP');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('应该支持模糊搜索', async () => {
      const mockMetas = [
        mockAssetMeta,
        { ...mockAssetMeta, id: 2, symbol: 'APPL', chineseName: '亚马逊' },
      ];
      (assetMetaRepository.searchBySymbol as any).mockResolvedValue(mockMetas);

      const result = await assetMetaService.searchAssetMetasBySymbol('A');

      expect(result).toHaveLength(2);
    });

    it('未匹配到结果时应返回空数组', async () => {
      (assetMetaRepository.searchBySymbol as any).mockResolvedValue([]);

      const result = await assetMetaService.searchAssetMetasBySymbol('XYZ');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      (assetMetaRepository.searchBySymbol as any).mockRejectedValue(new Error('Database error'));

      const result = await assetMetaService.searchAssetMetasBySymbol('AAP');

      expect(result).toHaveLength(0);
    });
  });

  describe('createAssetMeta', () => {
    it('应该成功创建新的 assetMeta 记录', async () => {
      const assetMetaData: Omit<AssetMetaType, 'id' | 'createdAt'> = {
        symbol: 'MSFT',
        priceCents: 38000,
        assetType: 'stock',
        currency: 'USD',
        market: 'US',
        chineseName: '微软',
        investmentMemo: null,
        source: 'finnhub',
        updatedAt: new Date(),
        deletedAt: null,
      };

      const newAssetMeta = { id: 2, ...assetMetaData, createdAt: new Date() };
      (assetMetaRepository.createAssetMeta as any).mockResolvedValue(newAssetMeta);

      const result = await assetMetaService.createAssetMeta(assetMetaData);

      expect(result).not.toBeNull();
      expect(result.symbol).toBe('MSFT');
      expect(result.chineseName).toBe('微软');
    });

    it('数据库错误时应该抛出错误', async () => {
      const assetMetaData: Omit<AssetMetaType, 'id' | 'createdAt'> = {
        symbol: 'MSFT',
        priceCents: 38000,
        assetType: 'stock',
        currency: 'USD',
        market: 'US',
        chineseName: '微软',
        investmentMemo: null,
        source: 'finnhub',
        updatedAt: new Date(),
        deletedAt: null,
      };

      (assetMetaRepository.createAssetMeta as any).mockRejectedValue(new Error('Database error'));

      await expect(assetMetaService.createAssetMeta(assetMetaData)).rejects.toThrow();
    });
  });

  describe('updateAssetMeta', () => {
    it('应该成功更新 assetMeta 记录', async () => {
      const updateData: Partial<Omit<AssetMetaType, 'id'>> = {
        chineseName: '苹果公司',
        investmentMemo: '长期持有',
      };

      const updatedMeta = { ...mockAssetMeta, chineseName: '苹果公司', investmentMemo: '长期持有' };
      (assetMetaRepository.updateAssetMeta as any).mockResolvedValue(updatedMeta);

      const result = await assetMetaService.updateAssetMeta(1, updateData);

      expect(result).not.toBeNull();
      expect(result?.chineseName).toBe('苹果公司');
      expect(result?.investmentMemo).toBe('长期持有');
    });

    it('记录不存在时应该返回 null', async () => {
      (assetMetaRepository.updateAssetMeta as any).mockResolvedValue(null);

      const result = await assetMetaService.updateAssetMeta(999, { chineseName: 'Updated' });

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出错误', async () => {
      (assetMetaRepository.updateAssetMeta as any).mockRejectedValue(new Error('Database error'));

      await expect(assetMetaService.updateAssetMeta(1, { chineseName: 'Updated' })).rejects.toThrow();
    });
  });

  describe('softDeleteAssetMeta', () => {
    it('应该成功软删除 assetMeta 记录', async () => {
      (assetMetaRepository.softDelete as any).mockResolvedValue(true);

      const result = await assetMetaService.softDeleteAssetMeta(1);

      expect(result).toBe(true);
    });

    it('记录不存在时应该返回 false', async () => {
      (assetMetaRepository.softDelete as any).mockResolvedValue(false);

      const result = await assetMetaService.softDeleteAssetMeta(999);

      expect(result).toBe(false);
    });

    it('数据库错误时应该抛出错误', async () => {
      (assetMetaRepository.softDelete as any).mockRejectedValue(new Error('Database error'));

      await expect(assetMetaService.softDeleteAssetMeta(1)).rejects.toThrow();
    });
  });

  describe('hardDeleteAssetMeta', () => {
    it('应该成功物理删除 assetMeta 记录', async () => {
      (assetMetaRepository.delete as any).mockResolvedValue(true);

      const result = await assetMetaService.hardDeleteAssetMeta(1);

      expect(result).toBe(true);
    });

    it('记录不存在时应该返回 false', async () => {
      (assetMetaRepository.delete as any).mockResolvedValue(false);

      const result = await assetMetaService.hardDeleteAssetMeta(999);

      expect(result).toBe(false);
    });

    it('数据库错误时应该抛出错误', async () => {
      (assetMetaRepository.delete as any).mockRejectedValue(new Error('Database error'));

      await expect(assetMetaService.hardDeleteAssetMeta(1)).rejects.toThrow();
    });
  });

  describe('restoreAssetMeta', () => {
    it('应该成功恢复已删除的 assetMeta 记录', async () => {
      const restoredMeta = { ...mockDeletedAssetMeta, deletedAt: null };
      (assetMetaRepository.restore as any).mockResolvedValue(restoredMeta);

      const result = await assetMetaService.restoreAssetMeta(1);

      expect(result).toBe(true);
    });

    it('记录不存在时应该返回 false', async () => {
      (assetMetaRepository.restore as any).mockResolvedValue(null);

      const result = await assetMetaService.restoreAssetMeta(999);

      expect(result).toBe(false);
    });

    it('数据库错误时应该抛出错误', async () => {
      (assetMetaRepository.restore as any).mockRejectedValue(new Error('Database error'));

      await expect(assetMetaService.restoreAssetMeta(1)).rejects.toThrow();
    });
  });

  describe('isAssetMetaDeleted', () => {
    it('应该正确检查记录是否已删除', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      const result = await assetMetaService.isAssetMetaDeleted(1);

      expect(result).toBe(true);
    });

    it('未删除的记录应该返回 false', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue({
        id: 1,
        deletedAt: null,
      });

      const result = await assetMetaService.isAssetMetaDeleted(1);

      expect(result).toBe(false);
    });

    it('记录不存在时应该返回 false', async () => {
      (assetMetaRepository.findById as any).mockResolvedValue(null);

      const result = await assetMetaService.isAssetMetaDeleted(999);

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      (assetMetaRepository.findById as any).mockRejectedValue(new Error('Database error'));

      const result = await assetMetaService.isAssetMetaDeleted(1);

      expect(result).toBe(false);
    });
  });
});