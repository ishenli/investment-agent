import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceService, AssetPriceType, BatchPriceUpdateRequest } from '../priceService';
import { AssetType, MarketType } from '@typings/asset';

// Mock @server/lib/db before importing priceService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      assetMeta: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        insert: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from '@server/lib/db';

const mockAssetMeta = {
  id: 1,
  symbol: 'AAPL',
  priceCents: 17500,
  assetType: 'stock',
  currency: 'USD',
  market: 'US',
  source: 'finnhub',
  chineseName: '苹果',
  investmentMemo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockDeletedAssetMeta = {
  ...mockAssetMeta,
  deletedAt: new Date(),
};

const mockAssetPrice: AssetPriceType = {
  id: '1',
  symbol: 'AAPL',
  price: 175,
  assetType: 'stock',
  currency: 'USD',
  createdAt: new Date(),
  source: 'finnhub',
  market: 'us',
};

describe('PriceService', () => {
  let priceService: PriceService;

  beforeEach(() => {
    priceService = new PriceService();
    vi.clearAllMocks();
  });

  describe('getLatestPrice', () => {
    it('应该返回最新的资产价格', async () => {
      (db.query.assetMeta.findFirst as any).mockResolvedValue(mockAssetMeta);

      const result = await priceService.getLatestPrice('AAPL');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.price).toBe(175);
      expect(result?.currency).toBe('USD');
    });

    it('资产不存在时应该返回 null', async () => {
      (db.query.assetMeta.findFirst as any).mockResolvedValue(null);

      const result = await priceService.getLatestPrice('XYZ');

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      (db.query.assetMeta.findFirst as any).mockRejectedValue(new Error('Database error'));

      const result = await priceService.getLatestPrice('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('getLatestPrices', () => {
    it('应该批量获取多个资产的最新价格', async () => {
      (db.query.assetMeta.findFirst as any).mockResolvedValue(mockAssetMeta);

      const result = await priceService.getLatestPrices(['AAPL', 'MSFT']);

      expect(result).toHaveProperty('AAPL');
      expect(result.AAPL).not.toBeNull();
      expect(result.AAPL.symbol).toBe('AAPL');
      expect(result).toHaveProperty('MSFT');
      expect(result.MSFT).not.toBeNull();
    });

    it('如果某个资产不存在应该跳过', async () => {
      (db.query.assetMeta.findFirst as any)
        .mockResolvedValueOnce(mockAssetMeta)
        .mockResolvedValueOnce(null);

      const result = await priceService.getLatestPrices(['AAPL', 'XYZ']);

      expect(result.AAPL).not.toBeNull();
      expect(result.XYZ).toBeUndefined();
    });

    it('数据库错误时应该返回空对象', async () => {
      (db.query.assetMeta.findFirst as any).mockRejectedValue(new Error('Database error'));

      const result = await priceService.getLatestPrices(['AAPL', 'MSFT']);

      expect(result).toEqual({});
    });
  });

  describe('updatePrice', () => {
    it('应该成功更新现有资产价格', async () => {
      (db.query.assetMeta.findFirst as any)
        .mockResolvedValueOnce(mockAssetMeta)
        .mockResolvedValueOnce(null);

      const updatedAsset = { ...mockAssetMeta, priceCents: 18000 };
      const mockReturning = vi.fn().mockResolvedValue([updatedAsset]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.updatePrice({
        symbol: 'AAPL',
        price: 180,
        assetType: 'stock',
        currency: 'USD',
        source: 'finnhub',
        market: 'US' as MarketType,
      });

      expect(result).not.toBeNull();
      expect(result.price).toBe(180);
    });

    it('应该成功插入新的资产价格', async () => {
      (db.query.assetMeta.findFirst as any).mockResolvedValue(null);

      const newAsset = { ...mockAssetMeta, id: 2, symbol: 'MSFT', priceCents: 38000 };
      const mockReturning = vi.fn().mockResolvedValue([newAsset]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await priceService.updatePrice({
        symbol: 'MSFT',
        price: 380,
        assetType: 'stock',
        currency: 'USD',
        market: 'US' as MarketType,
      });

      expect(result).not.toBeNull();
      expect(result.symbol).toBe('MSFT');
      expect(result.price).toBe(380);
    });

    it('资产已被软删除时应该返回 null 并跳过插入', async () => {
      (db.query.assetMeta.findFirst as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDeletedAssetMeta);

      const result = await priceService.updatePrice({
        symbol: 'AAPL',
        price: 180,
        assetType: 'stock',
      });

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetMeta.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(
        priceService.updatePrice({
          symbol: 'AAPL',
          price: 180,
          assetType: 'stock',
        }),
      ).rejects.toThrow();
    });
  });

  describe('batchUpdatePrices', () => {
    it('应该成功批量更新多个资产价格', async () => {
      (db.query.assetMeta.findFirst as any).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockAssetMeta]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const prices: BatchPriceUpdateRequest = [
        { symbol: 'AAPL', price: 175 },
        { symbol: 'MSFT', price: 380 },
        { symbol: 'GOOG', price: 150 },
      ];

      const result = await priceService.batchUpdatePrices(prices);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('应该处理失败的部分更新', async () => {
      (db.query.assetMeta.findFirst as any)
        .mockResolvedValueOnce(mockAssetMeta)
        .mockRejectedValueOnce(new Error('Database error'));

      const updatedAsset = { ...mockAssetMeta, priceCents: 18000 };
      const mockReturning = vi.fn().mockResolvedValue([updatedAsset]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const prices: BatchPriceUpdateRequest = [
        { symbol: 'AAPL', price: 175 },
        { symbol: 'MSFT', price: 380 },
      ];

      const result = await priceService.batchUpdatePrices(prices);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('MSFT');
    });
  });

  describe('getHistoricalPrices', () => {
    it('应该返回历史价格列表', async () => {
      (db.query.assetMeta.findMany as any).mockResolvedValue([mockAssetMeta]);

      const result = await priceService.getHistoricalPrices('AAPL', 24);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('数据库错误时应该返回空数组', async () => {
      (db.query.assetMeta.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await priceService.getHistoricalPrices('AAPL');

      expect(result).toHaveLength(0);
    });
  });

  describe('cleanupOldPrices', () => {
    it('应该成功清理过期的价格数据', async () => {
      const mockWhere = vi.fn().mockReturnValue({ changes: 10 });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await priceService.cleanupOldPrices();

      expect(result).toBe(10);
    });

    it('数据库错误时应该返回 0', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await priceService.cleanupOldPrices();

      expect(result).toBe(0);
    });
  });

  describe('softDeletePriceCache', () => {
    it('应该成功软删除价格缓存', async () => {
      const mockReturning = vi.fn().mockResolvedValue([mockAssetMeta]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.softDeletePriceCache('AAPL');

      expect(result).toBe(true);
    });

    it('没有记录时应该返回 false', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.softDeletePriceCache('AAPL');

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.softDeletePriceCache('AAPL');

      expect(result).toBe(false);
    });
  });

  describe('clearPriceCache', () => {
    it('应该成功物理删除价格缓存', async () => {
      const mockWhere = vi.fn().mockReturnValue({ changes: 5 });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await priceService.clearPriceCache('AAPL');

      expect(result).toBe(true);
    });

    it('没有记录时应该返回 false', async () => {
      const mockWhere = vi.fn().mockReturnValue({ changes: 0 });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await priceService.clearPriceCache('AAPL');

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await priceService.clearPriceCache('AAPL');

      expect(result).toBe(false);
    });
  });

  describe('restorePriceCache', () => {
    it('应该成功恢复软删除的价格缓存', async () => {
      const mockReturning = vi.fn().mockResolvedValue([mockDeletedAssetMeta]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.restorePriceCache('AAPL');

      expect(result).toBe(true);
    });

    it('没有记录时应该返回 false', async () => {
      const mockWhere = vi.fn().mockReturnValue({ returning: [] });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.restorePriceCache('AAPL');

      expect(result).toBe(false);
    });

    it('数据库错误时应该返回 false', async () => {
      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await priceService.restorePriceCache('AAPL');

      expect(result).toBe(false);
    });
  });
});