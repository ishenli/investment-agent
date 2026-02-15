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

vi.mock('@server/base/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@server/lib/utils/financialCalculations', () => ({
  calculateAnnualizedReturn: vi.fn(),
  calculateVolatility: vi.fn(),
  calculateSharpeRatio: vi.fn(),
  calculateMaxDrawdown: vi.fn(),
  calculateDrawdownSeries: vi.fn(),
}));

// 导入实际模块
import { db } from '../../lib/db';
import accountService from '../accountService';
import positionService from '../positionService';
import logger from '../../base/logger';
import {
  calculateAnnualizedReturn,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateDrawdownSeries,
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

  describe('getRevenueMetrics', () => {
    it('应该成功获取收益指标', async () => {
      const result = await assetService.getRevenueMetrics('1', '30d');

      expect(result).toEqual({
        accountId: '1',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        realizedProfitAmount: expect.any(Number),
        realizedProfitRate: expect.any(Number),
        unrealizedProfitAmount: expect.any(Number),
        unrealizedProfitRate: expect.any(Number),
        winRate: expect.any(Number),
        totalTrades: expect.any(Number),
        profitableTrades: expect.any(Number),
        createdAt: expect.any(Date),
      });
      
      expect(db.query.transactions.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('应该处理不同时间周期', async () => {
      await assetService.getRevenueMetrics('1', '7d');
      await assetService.getRevenueMetrics('1', '90d');
      await assetService.getRevenueMetrics('1', '1y');
      await assetService.getRevenueMetrics('1', 'all');

      expect(accountService.getTradingAccount).toHaveBeenCalled(); // all 周期需要账户信息
    });

    it('应该处理数据库错误', async () => {
      (db.query.transactions.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(assetService.getRevenueMetrics('1', '30d')).rejects.toThrow(
        'Database query failed: Error: Database error'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该处理没有交易记录的情况', async () => {
      (db.query.transactions.findMany as jest.Mock).mockResolvedValue([]);

      const result = await assetService.getRevenueMetrics('1', '30d');

      expect(result).toEqual({
        accountId: '1',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        realizedProfitAmount: 0,
        realizedProfitRate: 0,
        unrealizedProfitAmount: 0,
        unrealizedProfitRate: 0,
        winRate: 0,
        totalTrades: 0,
        profitableTrades: 0,
        createdAt: expect.any(Date),
      });
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

  describe('getRevenueHistoryData', () => {
    // TODO: 由于该方法涉及复杂的计算逻辑和多个依赖，需要更详细的 mock 设置
    // 暂时跳过这些测试
    
    /*
    it('应该成功获取收益历史数据', async () => {
      // Mock revenueHistoryType 的返回结构
      const mockRevenueHistory = {
        accountId: '1',
        period: '30d',
        granularity: 'monthly',
        periodStart: new Date(),
        periodEnd: new Date(),
        history: [],
        metrics: {},
        createdAt: new Date(),
      };

      // 由于这个方法比较复杂，我们主要验证它能正常调用而不抛出错误
      const result = await assetService.getRevenueHistoryData('1', '30d', 'monthly');

      expect(result.accountId).toBe('1');
      expect(result.period).toBe('30d');
      expect(result.granularity).toBe('monthly');
    });

    it('应该处理不同时间周期和粒度', async () => {
      await assetService.getRevenueHistoryData('1', '7d', 'weekly');
      await assetService.getRevenueHistoryData('1', '90d', 'monthly');
      await assetService.getRevenueHistoryData('1', '365d', 'monthly');
      await assetService.getRevenueHistoryData('1', 'all', 'monthly');

      expect(db.query.transactions.findMany).toHaveBeenCalledTimes(4);
    });
    */

    it('应该处理数据库错误', async () => {
      (db.query.transactions.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(assetService.getRevenueHistoryData('1', '30d', 'monthly')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('私有方法测试', () => {
    // 通过公共方法间接测试私有方法的行为
    it('calculateTotalReturnAndTradeStats 应该正确计算收益和交易统计', async () => {
      // 通过 getRevenueMetrics 间接测试
      const result = await assetService.getRevenueMetrics('1', '30d');
      
      // 验证返回的收益指标不为空
      expect(result.realizedProfitAmount).toBeDefined();
      expect(result.totalTrades).toBeDefined();
      // 验证至少有一次日志调用
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该正确处理各种交易类型', async () => {
      // 测试包含买卖交易的情况
      const mixedTransactions = [
        ...mockTransactions,
        {
          id: 3,
          accountId: 1,
          symbol: 'GOOGL',
          type: 'buy',
          quantity: 5,
          totalAmountCents: 75000, // 750 USD
          createdAt: new Date('2024-01-10'),
        }
      ];
      
      (db.query.transactions.findMany as jest.Mock).mockResolvedValue(mixedTransactions);
      
      const result = await assetService.getRevenueMetrics('1', '30d');
      
      expect(result.totalTrades).toBeGreaterThan(0);
    });
  });
});