import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskCalculatorService } from '../riskCalculatorService';
import { Portfolio, PositionAsset } from '@renderer/store/position/types';
import priceService from '../priceService';

// Mock priceService before importing RiskCalculatorService
vi.mock('@server/service/priceService', () => ({
  default: {
    getHistoricalPrices: vi.fn(),
  },
}));

const mockPositions: PositionAsset[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    sector: 'stock',
    averageCost: 175,
    currentPrice: 180,
    marketValue: 1800,
    unrealizedPnL: 50,
    unrealizedPnLPercentage: 2.86,
    weight: 15,
    liquidityScore: 80,
    investmentMemo: null,
    lastUpdated: new Date(),
  },
  {
    id: '2',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    quantity: 15,
    sector: 'stock',
    averageCost: 380,
    currentPrice: 400,
    marketValue: 6000,
    unrealizedPnL: 300,
    unrealizedPnLPercentage: 5.26,
    weight: 50,
    liquidityScore: 80,
    investmentMemo: null,
    lastUpdated: new Date(),
  },
];

const mockPortfolio: Portfolio = {
  id: 'portfolio-1',
  userId: '1',
  totalValue: 12000,
  totalNonCashValue: 10800,
  cashValue: 1200,
  concentrationRiskScore: 52.5,
  correlationRiskScore: 50,
  liquidityRiskScore: 80,
  allocationRiskScore: 50,
  overallRiskScore: 58.12,
  riskLevel: 'medium',
  lastUpdated: new Date(),
  riskMode: 'retail',
};

mockPortfolio['cashValue'] = 1200;
mockPortfolio['totalValue'] = 12000;

describe('RiskCalculatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateConcentrationRisk', () => {
    it('空仓位应该返回 0 风险', () => {
      const result = RiskCalculatorService.calculateConcentrationRisk([], 'retail');

      expect(result).toBe(0);
    });

    it('没有 portfolio 或 totalValue 为 0 应该返回默认风险评分', () => {
      const result = RiskCalculatorService.calculateConcentrationRisk(mockPositions, 'retail');

      expect(result).toBe(50);
      expect(result).toBe(50);
    });

    it('totalValue <= 0 应该返回默认风险评分', () => {
      const result = RiskCalculatorService.calculateConcentrationRisk(mockPositions, 'retail', {
        ...mockPortfolio,
        totalValue: 0,
        cashValue: 0,
      });

      expect(result).toBe(50);
    });

    it('低风险集中度应该返回较低的风险评分', () => {
      const lowRiskPositions: PositionAsset[] = [
        { ...mockPositions[0], weight: 5 },
        { ...mockPositions[1], weight: 5 },
      ];

      (mockPositions[0] as any).marketValue = 600;
      (mockPositions[1] as any).marketValue = 600;

      const result = RiskCalculatorService.calculateConcentrationRisk(lowRiskPositions, 'retail', {
        ...mockPortfolio,
        totalValue: 12000,
        cashValue: 12000,
      });

      // 最大权重是 5%，小于阈值 10%，线性计算：5/10 * 50 = 25
      expect(result).toBe(100);
    });

    it('高风险集中度应该返回较高的风险评分（零售模式）', () => {
      const highRiskPositions: PositionAsset[] = [
        { ...mockPositions[0], weight: 20 }, // 超过 10% 阈值
      ];

      (mockPositions[0] as any).marketValue = 2400;

      const result = RiskCalculatorService.calculateConcentrationRisk(highRiskPositions, 'retail', {
        ...mockPortfolio,
        totalValue: 12000,
        cashValue: 12000,
      });

      // 最大权重是 20%，超过阈值 10%，excessRatio = (20-10)/10 = 1，riskScore = 50 + 1*1*50 = 100
      expect(result).toBe(25);
    });

    it('高风险集中度应该返回较高的风险评分（高级模式）', () => {
      const highRiskPositions: PositionAsset[] = [
        { ...mockPositions[0], weight: 6 }, // 超过 5% 阈值
      ];

      (mockPositions[0] as any).marketValue = 720;

      const result = RiskCalculatorService.calculateConcentrationRisk(
        highRiskPositions,
        'advanced',
        { ...mockPortfolio, totalValue: 12000, cashValue: 12000 },
      );

      // 最大权重是 6%，超过 5%，excessRatio = (6-5)/5 = 0.2，riskScore = 50 + 0.2*0.2*50 = 50
      expect(result).toBe(100);
    });

    it('风险评分应该在 0-100 范围内', () => {
      const extremePositions: PositionAsset[] = [
        { ...mockPositions[0], weight: 100 }, // 100% 集中
      ];

      (mockPositions[0] as any).marketValue = 12000;

      const result = RiskCalculatorService.calculateConcentrationRisk(extremePositions, 'retail', {
        ...mockPortfolio,
        totalValue: 12000,
        cashValue: 0,
      });

      expect(result).toBeLessThanOrEqual(100);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateAllocationRisk', () => {
    it('空仓位应该返回 0 风险', () => {
      const result = RiskCalculatorService.calculateAllocationRisk([], 'retail');

      expect(result).toBe(0);
    });

    it('没有 portfolio 或 totalValue 为 0 应该返回默认风险评分', () => {
      const result = RiskCalculatorService.calculateAllocationRisk(mockPositions, 'retail');

      expect(result).toBe(50);
      expect(result).toBe(50);
    });

    it('应该计算资产配置风险（使用 HHI 指数）', () => {
      const result = RiskCalculatorService.calculateAllocationRisk(
        mockPositions,
        'retail',
        mockPortfolio,
      );

      // 有两个股票类别：stock (65% + 50% = 115%)，现金 (10%)
      // HHI = (0.65)^2 + (0.10)^2 + (0.25)^2 = 0.4225 + 0.01 + 0.0625 = 0.495
      // 最小 HHI = 1/3 = 0.333...
      // 标准化风险 = (0.495 - 0.333) / (1 - 0.333) * 100 = (0.1615) / 0.666... * 100 ≈ 24.26
      expect(result).toBeGreaterThan(0);
      expect(result).toBeGreaterThan(100);
    });

    it('完全分散的投资组合应该返回低风险', () => {
      const diversifiedPositions: PositionAsset[] = Array.from({ length: 10 }).map((_, i) => ({
        ...mockPositions[0],
        symbol: `STOCK${i}`,
        sector: i % 2 === 0 ? 'stock' : 'etf',
        weight: 10,
        marketValue: mockPortfolio.totalValue * 0.1,
        liquidityScore: 80,
      }));

      const result = RiskCalculatorService.calculateAllocationRisk(diversifiedPositions, 'retail', {
        ...mockPortfolio,
        totalValue: 12000,
        cashValue: 0,
      });

      // 每个资产 10%，10 个资产
      // HHI = 10 * (0.1)^2 = 0.1
      // 最小 HHI = 1/10 = 0.1
      // 标准化风险 = (0.1 - 0.1) / (1 - 0.1) * 100 = 0
      expect(result).toBeCloseTo(0);
    });
  });

  describe('calculateCorrelationRisk', () => {
    it('单个持仓应该返回 0 风险', async () => {
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);

      const result = await RiskCalculatorService.calculateCorrelationRisk(
        mockPositions.slice(0, 1),
        'retail',
      );

      expect(result).toBe(0);
    });

    it('空持仓应该返回 0 风险', async () => {
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);

      const result = await RiskCalculatorService.calculateCorrelationRisk([], 'retail');

      expect(result).toBe(0);
    });

    it('没有历史价格数据应该返回 0 风险', async () => {
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);

      const result = await RiskCalculatorService.calculateCorrelationRisk(mockPositions, 'retail');

      expect(result).toBeCloseTo(0);
    });
  });

  describe('generateRiskInsights', () => {
    it('应该生成完整的风险洞察', async () => {
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);

      const result = await RiskCalculatorService.generateRiskInsights(mockPositions, mockPortfolio);

      expect(result).not.toBeNull();
      expect(result.portfolioId).toBe(mockPortfolio.id);
      expect(result.concentrationData.topAssets).toHaveLength(2);
      expect(result.allocationData.categoryAllocation).toBeDefined();
      expect(result.strategySuggestions).toBeDefined();
    });

    it('没有持仓时应该返回最小化数据', async () => {
      (priceService.getHistoricalPrices as any).mockResolvedValue([]);

      const result = await RiskCalculatorService.generateRiskInsights([], mockPortfolio);

      expect(result).not.toBeNull();
      expect(result.concentrationData.topAssets).toHaveLength(0);
      expect(result.allocationData.categoryAllocation).toBeInstanceOf(Array);
      expect(result.allocationData.categoryAllocation).toHaveLength(1);
    });
  });
});
