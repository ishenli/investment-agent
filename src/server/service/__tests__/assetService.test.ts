import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../assetService';

// Mock 依赖模块
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      accountFunds: {
        findFirst: vi.fn(),
      },
      transactions: {
        findMany: vi.fn(),
      },
      assetPositions: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('../accountService', () => ({
  __esModule: true,
  default: {
    getTradingAccount: vi.fn(),
  },
}));

vi.mock('../positionService', () => ({
  __esModule: true,
  default: {
    getCurrentPositions: vi.fn(),
    getPositionAmountSummary: vi.fn(),
  },
}));

vi.mock('../portfolioSnapshotService', () => ({
  __esModule: true,
  default: {
    getSnapshotsByDateRange: vi.fn(),
    getAllSnapshots: vi.fn(),
    getLatestSnapshot: vi.fn(),
    getNearestSnapshot: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@server/lib/utils/financialCalculations', () => ({
  calculateAnnualizedReturn: vi.fn().mockReturnValue(0.05),
  calculateVolatility: vi.fn().mockReturnValue(0.1),
  calculateSharpeRatio: vi.fn().mockReturnValue(0.5),
  calculateMaxDrawdown: vi.fn().mockReturnValue(0.15),
  calculateDrawdownSeries: vi.fn(),
}));

// 导入实际模块
import { db } from '../../lib/db';
import accountService from '../accountService';
import positionService from '../positionService';
import portfolioSnapshotService from '../portfolioSnapshotService';
import logger from '../../base/logger';
import {
  calculateAnnualizedReturn,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
} from '../../lib/utils/financialCalculations';

// Mock 数据
const mockAccountFund = {
  id: 1,
  accountId: 1,
  amountCents: 1000000, // 10000 USD
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccount = {
  id: '1',
  userId: '1',
  accountName: 'Test Account',
  market: 'US',
  currency: 'USD',
  balance: 10000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPositionSummary = {
  stockAccountValue: 15000,
  totalInvestment: 12000,
};

const mockPositions = [
  {
    id: '1',
    accountId: '1',
    symbol: 'AAPL',
    quantity: 10,
    averageCost: 150,
    currentPrice: 180,
    marketValue: 1800,
    unrealizedPnL: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock snapshot data
const mockSnapshot = {
  id: 1,
  accountId: 1,
  snapshotDate: new Date(),
  totalValueCents: 2500000, // 25000 USD
  cashBalanceCents: 1000000, // 10000 USD
  positionsValueCents: 1500000, // 15000 USD
  benchmarkValueCents: 2400000, // 24000 USD
  positions: {
    totalPositionsValueCents: 1500000,
    positions: [
      {
        symbol: 'AAPL',
        quantity: 10,
        marketValueCents: 180000,
        costBasisCents: 150000,
      },
    ],
  },
  createdAt: new Date(),
};

const mockTransactions = [
  {
    id: 1,
    accountId: 1,
    symbol: 'AAPL',
    type: 'buy',
    quantity: 10,
    totalAmountCents: 150000, // 1500 USD
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    accountId: 1,
    symbol: 'AAPL',
    type: 'sell',
    quantity: 5,
    totalAmountCents: 90000, // 900 USD
    createdAt: new Date('2024-01-15'),
  },
];

describe('AssetService', () => {
  let assetService: AssetService;

  beforeEach(() => {
    assetService = new AssetService();
    
    // 重置所有 mocks
    vi.clearAllMocks();
    
    // 设置默认 mock 返回值
    (db.query.accountFunds.findFirst as jest.Mock).mockResolvedValue(mockAccountFund);
    (accountService.getTradingAccount as jest.Mock).mockResolvedValue(mockAccount);
    (positionService.getPositionAmountSummary as jest.Mock).mockResolvedValue(mockPositionSummary);
    (positionService.getCurrentPositions as jest.Mock).mockResolvedValue(mockPositions);
    (db.query.transactions.findMany as jest.Mock).mockResolvedValue(mockTransactions);
    
    // Setup portfolio snapshot mocks
    (portfolioSnapshotService.getSnapshotsByDateRange as jest.Mock).mockResolvedValue([mockSnapshot]);
    (portfolioSnapshotService.getAllSnapshots as jest.Mock).mockResolvedValue([mockSnapshot]);
    (portfolioSnapshotService.getLatestSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
    (portfolioSnapshotService.getNearestSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
  });

  describe('getAccountBalance', () => {
    it('应该成功获取账户余额', async () => {
      const result = await assetService.getAccountBalance('1');

      expect(result).toEqual({
        balance: 10000, // 1000000 cents / 100 = 10000 USD
        currency: 'USD',
      });
      expect(db.query.accountFunds.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });

    it('应该在账户不存在时返回 null', async () => {
      (db.query.accountFunds.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await assetService.getAccountBalance('999');

      expect(result).toBeNull();
    });

    it('应该处理数据库错误', async () => {
      (db.query.accountFunds.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await assetService.getAccountBalance('1');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getRevenueMetricsFromSnapshots', () => {
    it('应该成功获取收益指标', async () => {
      const result = await assetService.getRevenueMetricsFromSnapshots('1', '1M');

      expect(result).toEqual({
        accountId: '1',
        period: '1M',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        daysHeld: expect.any(Number),
        currentSnapshot: {
          date: expect.any(Date),
          totalValue: 25000,
          cashBalance: 10000,
          positionsValue: 15000,
        },
        comparisonSnapshot: {
          date: expect.any(Date),
          totalValue: 25000,
        },
        performance: {
          profitAmount: expect.any(Number),
          profitRate: expect.any(Number),
          benchmarkProfitRate: expect.any(Number),
          excessReturn: expect.any(Number),
          annualizedReturn: expect.any(Number),
        },
        positions: expect.any(Array),
        createdAt: expect.any(Date),
      });
      
      expect(portfolioSnapshotService.getLatestSnapshot).toHaveBeenCalledWith(1);
      expect(portfolioSnapshotService.getNearestSnapshot).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('应该处理不同时间周期', async () => {
      await assetService.getRevenueMetricsFromSnapshots('1', '1W');
      await assetService.getRevenueMetricsFromSnapshots('1', '3M');
      await assetService.getRevenueMetricsFromSnapshots('1', '6M');
      await assetService.getRevenueMetricsFromSnapshots('1', 'YTD');
      await assetService.getRevenueMetricsFromSnapshots('1', '1Y');
      await assetService.getRevenueMetricsFromSnapshots('1', 'ALL');

      expect(accountService.getTradingAccount).toHaveBeenCalled(); // ALL 周期需要账户信息
    });

    it('应该在没有快照时返回 null', async () => {
      (portfolioSnapshotService.getLatestSnapshot as jest.Mock).mockResolvedValue(null);

      const result = await assetService.getRevenueMetricsFromSnapshots('1', '1M');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      (portfolioSnapshotService.getLatestSnapshot as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(assetService.getRevenueMetricsFromSnapshots('1', '1M')).rejects.toThrow(
        'Database query failed: Error: Database error'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAssetSummary', () => {
    it('应该成功获取资产摘要', async () => {
      const result = await assetService.getAssetSummary('1');

      expect(result).toEqual({
        stockAccountValue: 15000,
        cashBalance: 10000,
        totalBalance: 25000,
        totalInvestment: 12000,
        stockAllocationPercent: 60,
        cashAllocationPercent: 40,
        stockGain: 3000,
        stockReturnRate: 25,
        totalReturnRate: 108.33,
      });
      
      expect(accountService.getTradingAccount).toHaveBeenCalledWith('1');
      expect(positionService.getPositionAmountSummary).toHaveBeenCalledWith('1');
    });

    it('应该在账户不存在时报错', async () => {
      (accountService.getTradingAccount as jest.Mock).mockResolvedValue(null);

      await expect(assetService.getAssetSummary('999')).rejects.toThrow('Account not found');
    });

    it('应该处理数据库错误', async () => {
      (accountService.getTradingAccount as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(assetService.getAssetSummary('1')).rejects.toThrow(
        '[AssetService] Failed to get asset summary: Error: Database error'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getRevenueHistoryFromSnapshots', () => {
    it('应该成功获取收益历史数据', async () => {
      const result = await assetService.getRevenueHistoryFromSnapshots('1', '1M');

      expect(result).toEqual({
        accountId: '1',
        period: '1M',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        data: expect.any(Array),
        derivedMetrics: {
          annualizedReturn: expect.any(Number),
          maxDrawdown: expect.any(Number),
          volatility: expect.any(Number),
          sharpeRatio: expect.any(Number),
          totalReturn: expect.any(Number),
        },
        createdAt: expect.any(Date),
      });
      
      expect(portfolioSnapshotService.getSnapshotsByDateRange).toHaveBeenCalledWith(
        1,
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('应该处理不同时间周期', async () => {
      await assetService.getRevenueHistoryFromSnapshots('1', '1W');
      await assetService.getRevenueHistoryFromSnapshots('1', '3M');
      await assetService.getRevenueHistoryFromSnapshots('1', '6M');
      await assetService.getRevenueHistoryFromSnapshots('1', 'YTD');
      await assetService.getRevenueHistoryFromSnapshots('1', '1Y');
      await assetService.getRevenueHistoryFromSnapshots('1', 'ALL');

      expect(accountService.getTradingAccount).toHaveBeenCalled(); // ALL 周期需要账户信息
    });

    it('应该在没有快照时返回空数据', async () => {
      (portfolioSnapshotService.getSnapshotsByDateRange as jest.Mock).mockResolvedValue([]);
      (portfolioSnapshotService.getAllSnapshots as jest.Mock).mockResolvedValue([]);

      const result = await assetService.getRevenueHistoryFromSnapshots('1', '1M');

      expect(result.data).toEqual([]);
      expect(result.derivedMetrics).toEqual({
        annualizedReturn: 0,
        maxDrawdown: 0,
        volatility: 0,
        sharpeRatio: 0,
        totalReturn: 0,
      });
    });

    it('应该处理数据库错误', async () => {
      (portfolioSnapshotService.getSnapshotsByDateRange as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(assetService.getRevenueHistoryFromSnapshots('1', '1M')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('私有方法测试', () => {
    // 通过公共方法间接测试私有方法的行为
    it('calculatePositionsPerformance 应该正确计算持仓表现', async () => {
      // 通过 getRevenueMetricsFromSnapshots 间接测试
      const result = await assetService.getRevenueMetricsFromSnapshots('1', '1M');
      
      // 验证返回的收益指标不为空
      expect(result.performance.profitAmount).toBeDefined();
      expect(result.positions).toBeDefined();
      expect(Array.isArray(result.positions)).toBe(true);
    });

    it('应该正确处理各种快照数据', async () => {
      // 测试包含多个快照的情况
      const multipleSnapshots = [
        mockSnapshot,
        {
          ...mockSnapshot,
          id: 2,
          snapshotDate: new Date(Date.now() - 86400000), // 1 day ago
          totalValueCents: 2400000, // 24000 USD
        },
      ];
      
      (portfolioSnapshotService.getSnapshotsByDateRange as jest.Mock).mockResolvedValue(multipleSnapshots);
      
      const result = await assetService.getRevenueHistoryFromSnapshots('1', '1M');
      
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.derivedMetrics.totalReturn).toBeDefined();
    });
  });
});