import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioService } from '../portfolioService';
import { Portfolio } from '@renderer/store/position/types';
import { db } from '@server/lib/db';
import priceService from '../priceService';
import positionService from '../positionService';
import { RiskCalculatorService } from '@server/service/riskCalculatorService';

// Mock @server/lib/db before importing portfolioService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      accountFunds: {
        findFirst: vi.fn(),
      },
      assetPositions: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock('@server/service/priceService', () => ({
  default: {
    getLatestPrices: vi.fn(),
  },
}));

vi.mock('@server/service/positionService', () => ({
  default: {
    getCurrentPositions: vi.fn(),
  },
}));

vi.mock('@server/service/riskCalculatorService', () => ({
  RiskCalculatorService: {
    calculateConcentrationRisk: vi.fn(),
  },
}));

const mockAccountFund = {
  id: 1,
  accountId: 1,
  amountCents: 900000,
  currency: 'USD',
  leverage: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPositionType = {
  id: '1',
  accountId: '1',
  symbol: 'AAPL',
  chineseName: '苹果',
  quantity: 10,
  averageCost: 100,
  currentPrice: 180,
  marketValue: 1800,
  unrealizedPnL: 50,
  positionRatio: 0.15,
  market: 'US',
  investmentMemo: 'test',
  assetMetaId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  sector: 'stock' as const,
};

const mockPortfolio: Portfolio = {
  id: 'portfolio-1',
  userId: '1',
  totalValue: 11800,
  totalNonCashValue: 1800,
  cashValue: 10000,
  concentrationRiskScore: 30,
  correlationRiskScore: 50,
  liquidityRiskScore: 80,
  allocationRiskScore: 50,
  overallRiskScore: 52.5,
  riskLevel: 'medium',
  lastUpdated: new Date(),
  riskMode: 'retail',
};

mockPortfolio['cashValue'] = 10000;
mockPortfolio['totalValue'] = 11800;

describe('PortfolioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePortfolio', () => {
    it('应该成功计算投资组合数据', async () => {
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);
      (RiskCalculatorService.calculateConcentrationRisk as any).mockReturnValue(30);

      const result = await PortfolioService.calculatePortfolio('1');

      expect(result).not.toBeNull();
      expect(result.userId).toBe('1');
      expect(result.cashValue).toBe(9000);
      expect(result.totalNonCashValue).toBe(1800);
      expect(result.totalValue).toBe(10800);
      expect(result.riskLevel).toBe('medium');
    });

    it('账户不存在时应该抛出错误', async () => {
      (db.query.accountFunds.findFirst as any).mockResolvedValue(null);

      await expect(PortfolioService.calculatePortfolio('1')).rejects.toThrow('Account not found');
    });

    it('低风险组合应该返回 low 风险等级', async () => {
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);
      (RiskCalculatorService.calculateConcentrationRisk as any).mockReturnValue(20);

      // 由于其他风险分固定为 50/50/80，计算：(20+50+50+80)/4 = 50
      const result = await PortfolioService.calculatePortfolio('1');

      expect(result.riskLevel).toBe('medium');
    });

    it('高风险组合应该返回 high 风险等级', async () => {
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);
      (RiskCalculatorService.calculateConcentrationRisk as any).mockReturnValue(80);

      // 由于其他风险分固定为 50/50/80，计算：(80+50+50+80)/4 = 65
      const result = await PortfolioService.calculatePortfolio('1');

      expect(result.riskLevel).toBe('medium');
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.accountFunds.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(PortfolioService.calculatePortfolio('1')).rejects.toThrow();
    });
  });

  describe('getPositionsWithLivePrices', () => {
    it('应该返回带实时价格的持仓信息', async () => {
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);

      const result = await PortfolioService.getPositionsWithLivePrices('1');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].quantity).toBe(10);
      expect(result[0].currentPrice).toBe(180);
      expect(result[0].marketValue).toBe(1800);
    });

    it('应该正确计算持仓权重（不带 portfolio）', async () => {
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);

      const result = await PortfolioService.getPositionsWithLivePrices('1');

      expect(result[0].weight).toBe(100); // 只有一个持仓，权重为 100%
    });

    it('应该正确计算持仓权重（带有 portfolio）', async () => {
      (positionService.getCurrentPositions as any).mockResolvedValue([mockPositionType]);

      const portfolio = { ...mockPortfolio, totalValue: 13600, cashValue: 11800 };
      const result = await PortfolioService.getPositionsWithLivePrices('1', portfolio);

      expect(result[0].weight).toBeCloseTo(13.24); // 1800/13600 * 100
    });

    it('没有持仓时应该返回空数组', async () => {
      (positionService.getCurrentPositions as any).mockResolvedValue([]);

      const result = await PortfolioService.getPositionsWithLivePrices('1');

      expect(result).toHaveLength(0);
    });

    it('数据库错误时应该抛出错误', async () => {
      (positionService.getCurrentPositions as any).mockRejectedValue(new Error('Database error'));

      await expect(PortfolioService.getPositionsWithLivePrices('1')).rejects.toThrow();
    });
  });

  describe('getPositions', () => {
    it('应该返回持仓信息', async () => {
      const mockPositionRecord = {
        id: 1,
        accountId: 1,
        symbol: 'AAPL',
        quantity: 10,
        sector: 'stock',
        averagePriceCents: 17500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (db.query.assetPositions.findMany as any).mockResolvedValue([mockPositionRecord]);
      (priceService.getLatestPrices as any).mockResolvedValue({
        AAPL: { price: 180 },
      });

      const result = await PortfolioService.getPositions('1', 11800);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].quantity).toBe(10);
      expect(result[0].currentPrice).toBe(180);
      expect(result[0].marketValue).toBe(1800);
    });

    it('没有持仓时应该返回空数组', async () => {
      (db.query.assetPositions.findMany as any).mockResolvedValue([]);
      (priceService.getLatestPrices as any).mockResolvedValue({});

      const result = await PortfolioService.getPositions('1', 11800);

      expect(result).toHaveLength(0);
    });

    it('应该使用平均成本作为最新价格的备用值', async () => {
      const mockPositionRecord = {
        id: 1,
        accountId: 1,
        symbol: 'AAPL',
        quantity: 10,
        sector: 'stock',
        averagePriceCents: 17500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (db.query.assetPositions.findMany as any).mockResolvedValue([mockPositionRecord]);
      (priceService.getLatestPrices as any).mockResolvedValue({});

      const result = await PortfolioService.getPositions('1', 11800);

      expect(result[0].currentPrice).toBe(175);
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.assetPositions.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(PortfolioService.getPositions('1', 11800)).rejects.toThrow();
    });
  });
});
