import { db } from '@server/lib/db';
import { accountFunds, assetPositions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { Portfolio, PositionAsset } from '@renderer/store/position/types';
import priceService from '@server/service/priceService';
import { AssetType } from '@typings/asset';
import logger from '../base/logger';
import positionService from './positionService';
import { RiskCalculatorService } from '@server/service/riskCalculatorService';

// 转换PositionType到PositionAsset
function convertPositionTypeToPositionAsset(position: any, totalValue: number): PositionAsset {
  return {
    id: position.id,
    symbol: position.symbol,
    name: position.chineseName || position.symbol,
    quantity: position.quantity,
    liquidityScore: 80, // 默认流动性评分
    averageCost: position.averageCost,
    currentPrice: position.currentPrice,
    marketValue: position.marketValue,
    unrealizedPnL: position.unrealizedPnL,
    unrealizedPnLPercentage:
      position.averageCost > 0
        ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
        : 0,
    weight: totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0,
    sector: position.sector || 'stock',
    investmentMemo: position.investmentMemo || null,
    lastUpdated: position.updatedAt || new Date(),
  };
}

export class PortfolioService {
  /**
   * 计算用户投资组合数据
   * @param accountId 账户ID
   * @returns 投资组合数据
   */
  static async calculatePortfolio(accountId: string): Promise<Portfolio> {
    try {
      // Get user's account funds (cash value)
      const accountFundsRecord = await db.query.accountFunds.findFirst({
        where: eq(accountFunds.accountId, parseInt(accountId)),
      });

      if (!accountFundsRecord) {
        throw new Error('Account not found');
      }

      // Get user's positions with live prices from PositionService
      const positionRecords = await positionService.getCurrentPositions(accountId);

      // Calculate total values
      let totalNonCashValue = 0;
      const cashValue = accountFundsRecord.amountCents / 100;
      let totalValue = cashValue; // Start with cash value

      // Calculate total non-cash value from positions
      positionRecords.forEach((position) => {
        totalNonCashValue += position.marketValue;
        totalValue += position.marketValue;
      });

      // Convert PositionType to PositionAsset and calculate weights
      const positions: PositionAsset[] = positionRecords.map((position) =>
        convertPositionTypeToPositionAsset(position, totalValue),
      );

      // Calculate risk scores (simplified)
      const concentrationRiskScore = RiskCalculatorService.calculateConcentrationRisk(
        positions,
        'retail',
        {
          totalValue,
          cashValue,
        } as Portfolio,
      );

      const allocationRiskScore = 50; // Placeholder
      const correlationRiskScore = 50; // Placeholder
      const liquidityRiskScore = 80; // Placeholder

      const overallRiskScore =
        (concentrationRiskScore + allocationRiskScore + correlationRiskScore + liquidityRiskScore) /
        4;

      const riskLevel: 'low' | 'medium' | 'high' =
        overallRiskScore < 30 ? 'low' : overallRiskScore < 70 ? 'medium' : 'high';

      return {
        id: `portfolio-${accountId}`,
        userId: accountId,
        totalValue,
        totalNonCashValue,
        cashValue,
        concentrationRiskScore,
        correlationRiskScore,
        liquidityRiskScore,
        allocationRiskScore,
        overallRiskScore,
        riskLevel,
        lastUpdated: new Date(),
        riskMode: 'retail', // Default mode
      };
    } catch (error) {
      logger.error('Error calculating portfolio:', error);
      throw error;
    }
  }

  /**
   * 获取用户持仓信息（带实时价格）
   * @param accountId 账户ID
   * @returns 持仓信息数组
   */
  static async getPositionsWithLivePrices(
    accountId: string,
    portfolio?: Portfolio,
  ): Promise<PositionAsset[]> {
    try {
      // Get user's positions with live prices from PositionService
      const positionRecords = await positionService.getCurrentPositions(accountId);

      // Calculate total value for weight calculation
      // If portfolio is provided, use the total value from portfolio (including cash)
      // Otherwise, just use the sum of market values of positions
      let totalValue =
        portfolio?.totalValue ||
        positionRecords.reduce((sum, position) => sum + position.marketValue, 0);

      // Convert PositionType to PositionAsset and calculate weights
      const positions: PositionAsset[] = positionRecords.map((position) =>
        convertPositionTypeToPositionAsset(position, totalValue),
      );

      return positions;
    } catch (error) {
      logger.error('Error getting positions with live prices:', error);
      throw error;
    }
  }

  /**
   * 获取用户持仓信息
   * @param accountId 账户ID
   * @param totalValue 投资组合总价值
   * @returns 持仓信息数组
   */
  static async getPositions(accountId: string, totalValue: number): Promise<PositionAsset[]> {
    try {
      // Get user's positions
      const positionRecords = await db.query.assetPositions.findMany({
        where: eq(assetPositions.accountId, parseInt(accountId)),
      });

      // Fetch live prices for all symbols in positions
      const symbols = positionRecords.map((r: { symbol: string }) => r.symbol) as string[];
      const priceMap = await priceService.getLatestPrices(symbols);

      // Calculate market values for positions using live prices
      const positions: PositionAsset[] = positionRecords.map((record) => {
        const averageCost = record.averagePriceCents / 100;
        const latestPrice = priceMap[record.symbol]?.price ?? averageCost;
        const currentPrice = latestPrice;
        const marketValue = record.quantity * currentPrice;
        const unrealizedPnL = (currentPrice - averageCost) * record.quantity;

        return {
          id: record.id.toString(),
          symbol: record.symbol,
          name: record.symbol, // In a real implementation, you'd get the full name
          type: 'stock',
          quantity: record.quantity,
          sector: record.sector as AssetType,
          averageCost,
          currentPrice,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercentage:
            averageCost > 0 ? ((currentPrice - averageCost) / averageCost) * 100 : 0,
          weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          liquidityScore: 80,
          investmentMemo: null, // 在这个方法中我们没有获取投资笔记信息
          lastUpdated: record.updatedAt,
        };
      });

      return positions;
    } catch (error) {
      logger.error('Error getting positions:', error);
      throw error;
    }
  }
}
