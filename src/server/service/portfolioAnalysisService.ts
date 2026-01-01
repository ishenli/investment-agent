import type { PositionType } from '@typings/position';
import { UserContextReader } from '@server/dataflows/userContextReader';
import logger from '@server/base/logger';
import positionService from './positionService';

// 资产配置类型
export interface AssetAllocation {
  stock: number;
  cash: number;
}

// 资产分类详情
export interface AssetBreakdown {
  stocks: {
    count: number;
    totalValue: number;
    totalCost: number;
    unrealizedPnL: number;
  };
  cash: {
    amount: number;
    currency: string;
    percentage: number;
  };
}

// 现金资产类型
export interface CashAsset {
  type: 'cash';
  amount: number;
  currency: string;
  available: number;
}

// 投资组合分析结果
export interface PortfolioAnalysis {
  holdingsSummary: PositionType[];
  cashAsset: CashAsset;
  portfolioMetrics: {
    totalMarketValue: number;
    cashBalance: number;
    totalAssetsValue: number;
    totalAssetsCost: number;
    totalUnrealizedPnL: number;
    positionCount: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
    diversificationScore: number;
    allocation: AssetAllocation;
  };
  assetBreakdown: AssetBreakdown;
}

/**
 * 投资组合分析服务
 * 提供投资组合的完整分析和计算逻辑
 */
export class PortfolioAnalysisService {
  /**
   * 获取完整的投资组合分析
   * @param accountId 账户ID
   * @returns 投资组合分析结果
   */
  async getPortfolioAnalysis(accountId: string): Promise<PortfolioAnalysis> {
    try {
      logger.info(`[PortfolioAnalysisService] 开始分析账户 ${accountId} 的投资组合`);
      // 获取基础数据
      const holdingsSummary = await UserContextReader.getUserPositions(accountId);
      const cashAsset = await UserContextReader.getCashAsset(accountId);
      const portfolioSummary = await UserContextReader.getPortfolioSummary(accountId);

      // 计算投资组合指标
      const analysis = this.calculatePortfolioMetrics(holdingsSummary, cashAsset, portfolioSummary);

      logger.info(
        `[PortfolioAnalysisService] 投资组合分析完成，总资产: ${analysis.portfolioMetrics.totalAssetsValue}`,
      );
      return analysis;
    } catch (error) {
      logger.error(`[PortfolioAnalysisService] 投资组合分析失败:`, error);
      throw new Error(`无法获取投资组合分析: ${error}`);
    }
  }

  /**
   * 计算投资组合指标
   * @param holdingsSummary 持仓摘要
   * @param cashAsset 现金资产
   * @param portfolioSummary 投资组合摘要
   * @returns 计算后的投资组合分析
   */
  private calculatePortfolioMetrics(
    holdingsSummary: PositionType[],
    cashAsset: CashAsset,
    portfolioSummary: {
      totalMarketValue: number;
      totalUnrealizedPnL: number;
      positionCount: number;
      cashBalance: number;
      currency: string;
      totalAssetsValue: number;
    },
  ): PortfolioAnalysis {
    // 计算总资产成本（股票成本 + 现金）
    const totalStockCost = holdingsSummary.reduce(
      (sum, position) => sum + position.averageCost * position.quantity,
      0,
    );
    const totalAssetsCost = totalStockCost + cashAsset.amount;

    // 计算资产配置比例
    const stockAllocationRatio =
      portfolioSummary.totalAssetsValue > 0
        ? portfolioSummary.totalMarketValue / portfolioSummary.totalAssetsValue
        : 0;
    const cashAllocationRatio =
      portfolioSummary.totalAssetsValue > 0
        ? cashAsset.amount / portfolioSummary.totalAssetsValue
        : 1;

    // 计算风险分散度分数（基于持仓数量和行业分布）
    const uniqueSectors = new Set(holdingsSummary.map((pos) => this.extractSector(pos.symbol)));
    const diversificationScore = Math.min(
      1,
      holdingsSummary.length * 0.2 + uniqueSectors.size * 0.1,
    );

    // 根据资产配置计算风险等级
    let riskLevel: 'conservative' | 'moderate' | 'aggressive' = 'conservative';
    if (stockAllocationRatio > 0.8) riskLevel = 'aggressive';
    else if (stockAllocationRatio > 0.5) riskLevel = 'moderate';

    return {
      holdingsSummary,
      cashAsset,
      portfolioMetrics: {
        totalMarketValue: portfolioSummary.totalMarketValue,
        cashBalance: portfolioSummary.cashBalance,
        totalAssetsValue: portfolioSummary.totalAssetsValue,
        totalAssetsCost,
        totalUnrealizedPnL: portfolioSummary.totalUnrealizedPnL,
        positionCount: portfolioSummary.positionCount,
        riskLevel,
        diversificationScore,
        allocation: {
          stock: stockAllocationRatio,
          cash: cashAllocationRatio,
        },
      },
      assetBreakdown: {
        stocks: {
          count: holdingsSummary.length,
          totalValue: portfolioSummary.totalMarketValue,
          totalCost: totalStockCost,
          unrealizedPnL: portfolioSummary.totalUnrealizedPnL,
        },
        cash: {
          amount: cashAsset.amount,
          currency: cashAsset.currency,
          percentage: cashAllocationRatio * 100,
        },
      },
    };
  }

  /**
   * 提取股票所属行业（简化实现）
   * @param symbol 股票代码
   * @returns 行业标识
   */
  private extractSector(symbol: string): string {
    // 简化实现：使用股票代码前缀作为行业标识
    // 在实际应用中，这里应该查询股票的行业分类
    const sectorMap: Record<string, string> = {
      AAPL: '科技',
      MSFT: '科技',
      GOOGL: '科技',
      TSLA: '汽车',
      JPM: '金融',
      JNJ: '医疗',
      XOM: '能源',
      AMZN: '消费',
    };

    const baseSymbol = symbol.split('.')[0];
    return sectorMap[baseSymbol] || '其他';
  }

  /**
   * 获取资产配置建议
   * @param currentAllocation 当前资产配置
   * @returns 配置建议
   */
  getAllocationAdvice(currentAllocation: AssetAllocation): string[] {
    const recommendations: string[] = [];

    if (currentAllocation.stock > 0.9) {
      recommendations.push('股票配置比例过高，建议增加现金储备');
    } else if (currentAllocation.stock < 0.3) {
      recommendations.push('现金比例过高，可考虑增加股票投资');
    }

    if (currentAllocation.cash > 0.5) {
      recommendations.push('现金占比过大，可能影响长期收益');
    }

    return recommendations;
  }

  /**
   * 计算风险评分
   * @param portfolioMetrics 投资组合指标
   * @returns 风险评分和建议
   */
  calculateRiskScore(portfolioMetrics: PortfolioAnalysis['portfolioMetrics']): {
    score: number;
    level: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    let score = 0;

    // 基于股票配置比例评分
    score += portfolioMetrics.allocation.stock * 100;

    // 基于分散度调整
    score -= portfolioMetrics.diversificationScore * 20;

    // 基于持仓数量调整
    score -= Math.min(portfolioMetrics.positionCount * 5, 20);

    score = Math.max(0, Math.min(100, score));

    let level: 'low' | 'medium' | 'high';
    if (score > 70) level = 'high';
    else if (score > 40) level = 'medium';
    else level = 'low';

    const recommendations = this.getAllocationAdvice(portfolioMetrics.allocation);

    return { score: Math.round(score), level, recommendations };
  }
}

// 创建单例实例
const portfolioAnalysisService = new PortfolioAnalysisService();

export default portfolioAnalysisService;
