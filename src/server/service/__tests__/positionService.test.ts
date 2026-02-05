import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PositionService, PositionUpdateData } from '../positionService';
import { PositionType } from '@/types';

// Mock @server/lib/db before importing positionService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      assetPositions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      accountFunds: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@server/service/priceService', () => ({
  default: {
    getLatestPrices: vi.fn(),
  },
}));

vi.mock('@server/service/assetMetaService', () => ({
  default: {
    getAllAssetMetas: vi.fn(),
  },
}));

import { db } from '@server/lib/db';
import priceService from '../priceService';
import assetMetaService from '../assetMetaService';

const mockPosition = {
  id: 1,
  accountId: 1,
  symbol: 'AAPL',
  quantity: 10,
  averagePriceCents: 17500,
  averageCost: 175,
  investmentMemo: null,
  sector: 'stock' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPositionType: PositionType = {
  id: '1',
  accountId: '1',
  symbol: 'AAPL',
  chineseName: '苹果',
  quantity: 10,
  averageCost: 175,
  currentPrice: 180,
  marketValue: 1800,
  unrealizedPnL: 50,
  positionRatio: 0.18,
  market: 'US',
  investmentMemo: 'test',
  assetMetaId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PositionService', () => {
  let positionService: PositionService;

  beforeEach(() => {
    positionService = new PositionService();
    vi.clearAllMocks();
  });

  describe('updatePosition', () => {
    it('应该成功更新仓位信息', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const updatedPosition = { ...mockPosition, quantity: 20 };
      const mockReturning = vi.fn().mockResolvedValue([updatedPosition]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await positionService.updatePosition(1, { quantity: 20 });

      expect(result).not.toBeNull();
      expect(result.quantity).toBe(20);
    });

    it('仓位不存在时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      await expect(positionService.updatePosition(999, { quantity: 20 })).rejects.toThrow(
        'Position with id 999 not found',
      );
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(positionService.updatePosition(1, { quantity: 20 })).rejects.toThrow();
    });
  });

  describe('increasePosition', () => {
    it('应该增加现有仓位数量', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const updatedPosition = { ...mockPosition, quantity: 15, averagePriceCents: 17833 };
      const mockReturning = vi.fn().mockResolvedValue([updatedPosition]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await positionService.increasePosition(1, 'AAPL', 5, 18000, 'stock');

      expect(result).not.toBeNull();
      expect(result.quantity).toBe(15);
    });

    it('应该创建新的仓位', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      const newPosition = { ...mockPosition, id: 2, quantity: 10 };
      const mockReturning = vi.fn().mockResolvedValue([newPosition]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await positionService.increasePosition(1, 'AAPL', 10, 17500, 'stock');

      expect(result).not.toBeNull();
      expect(result.quantity).toBe(10);
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(
        positionService.increasePosition(1, 'AAPL', 10, 17500, 'stock'),
      ).rejects.toThrow();
    });
  });

  describe('processTransaction', () => {
    it('应该处理买入交易', async () => {
      // Mock for increasePosition (创建新仓位)
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockPosition]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await positionService.processTransaction(
        1,
        'AAPL',
        10,
        17500,
        'buy',
        'stock',
      );

      expect(result).not.toBeNull();
    });

    it('应该处理卖出交易', async () => {
      // Mock for decreasePosition
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const updatedPosition = { ...mockPosition, quantity: 5 };
      const mockReturning = vi.fn().mockResolvedValue([updatedPosition]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await positionService.processTransaction(
        1,
        'AAPL',
        5,
        17500,
        'sell',
        'stock',
      );

      expect(result).not.toBeNull();
    });

    it('不支持的交易类型应该抛出错误', async () => {
      await expect(
        positionService.processTransaction(1, 'AAPL', 10, 17500, 'invalid' as any, 'stock'),
      ).rejects.toThrow('Unsupported transaction type');
    });
  });

  describe('decreasePosition', () => {
    it('应该成功减少持仓数量', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const updatedPosition = { ...mockPosition, quantity: 5 };
      const mockReturning = vi.fn().mockResolvedValue([updatedPosition]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await positionService.decreasePosition(1, 'AAPL', 5);

      expect(result).not.toBeNull();
      expect(result.quantity).toBe(5);
    });

    it('完全平仓时应该删除仓位并返回 null', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const mockWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(null) });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await positionService.decreasePosition(1, 'AAPL', 10);

      expect(result).toBeNull();
    });

    it('仓位不存在时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      await expect(positionService.decreasePosition(1, 'AAPL', 5)).rejects.toThrow(
        'Position for AAPL not found',
      );
    });

    it('减少数量超过持仓数量时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      await expect(positionService.decreasePosition(1, 'AAPL', 20)).rejects.toThrow(
        'Cannot decrease position by 20',
      );
    });
  });

  describe('getPositionsByAccount', () => {
    it('应该返回账户的所有持仓', async () => {
      (db.query.assetPositions.findMany as any).mockResolvedValue([mockPosition]);

      const result = await positionService.getPositionsByAccount(1);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(positionService.getPositionsByAccount(1)).rejects.toThrow();
    });
  });

  describe('getPositionBySymbol', () => {
    it('应该返回指定股票的持仓', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const result = await positionService.getPositionBySymbol(1, 'AAPL');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
    });

    it('持仓不存在时应该返回 null', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      const result = await positionService.getPositionBySymbol(1, 'XYZ');

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(positionService.getPositionBySymbol(1, 'AAPL')).rejects.toThrow();
    });
  });

  describe('deletePosition', () => {
    it('应该成功删除仓位', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(mockPosition);

      const mockWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(null) });
      (db.delete as any).mockReturnValue({ where: mockWhere });

      const result = await positionService.deletePosition(1);

      expect(result).toEqual({ success: true, message: 'Position deleted successfully' });
    });

    it('仓位不存在时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockResolvedValue(null);

      await expect(positionService.deletePosition(999)).rejects.toThrow(
        'Position with id 999 not found',
      );
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(positionService.deletePosition(1)).rejects.toThrow();
    });
  });

  describe('getCurrentPositions', () => {
    it('应该返回包含实时价格的当前持仓', async () => {
      (db.query.assetPositions.findMany as any).mockResolvedValue([mockPosition]);
      (priceService.getLatestPrices as any).mockResolvedValue({ AAPL: { price: 180 } });
      (assetMetaService.getAllAssetMetas as any).mockResolvedValue([
        {
          id: 1,
          symbol: 'AAPL',
          chineseName: '苹果',
          market: 'US',
          investmentMemo: 'test',
        },
      ]);
      (db.query.accountFunds.findMany as any).mockResolvedValue([
        { accountId: 1, amountCents: 200000 },
      ]);

      const result = await positionService.getCurrentPositions('1');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].currentPrice).toBe(180);
      expect(result[0].chineseName).toBe('苹果');
      expect(result[0].market).toBe('US');
    });

    it('没有持仓时应该返回空数组', async () => {
      (db.query.assetPositions.findMany as any).mockResolvedValue([]);

      const result = await positionService.getCurrentPositions('1');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该返回空数组', async () => {
      (db.query.assetPositions.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await positionService.getCurrentPositions('1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPositionAmountSummary', () => {
    it('应该返回持仓金额汇总', async () => {
      vi.spyOn(positionService, 'getCurrentPositions').mockResolvedValue([mockPositionType]);

      const result = await positionService.getPositionAmountSummary('1');

      expect(result).toEqual({
        stockAccountValue: 1800,
        totalInvestment: 1750,
        unrealizedPnL: 50,
      });
    });

    it('没有持仓时应该返回零值', async () => {
      vi.spyOn(positionService, 'getCurrentPositions').mockResolvedValue([]);

      const result = await positionService.getPositionAmountSummary('1');

      expect(result).toEqual({
        stockAccountValue: 0,
        totalInvestment: 0,
        unrealizedPnL: 0,
      });
    });
  });
});