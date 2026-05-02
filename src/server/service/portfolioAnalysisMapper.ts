/**
 * Portfolio Analysis Mapper
 *
 * Pure helper functions that transform `portfolioAnalysisService` output into
 * the domain types consumed by LangGraph analysis engines.
 */
import type { PositionAsset, Portfolio } from '@renderer/store/position/types';
import type { PortfolioAnalysis } from './portfolioAnalysisService';

/**
 * Map a holdings summary (individual positions) into `PositionAsset` DTOs.
 */
export function toPositionAssets(
  holdingsSummary: PortfolioAnalysis['holdingsSummary'],
): PositionAsset[] {
  return holdingsSummary.map((pos) => ({
    id: pos.id,
    symbol: pos.symbol,
    name: pos.chineseName || pos.symbol,
    quantity: pos.quantity,
    liquidityScore: 80, // default
    averageCost: pos.averageCost,
    currentPrice: pos.currentPrice,
    marketValue: pos.marketValue,
    unrealizedPnL: pos.unrealizedPnL,
    unrealizedPnLPercentage:
      pos.averageCost > 0
        ? ((pos.currentPrice - pos.averageCost) / pos.averageCost) * 100
        : 0,
    weight: pos.positionRatio || 0,
    lastUpdated: new Date(),
  }));
}

/**
 * Build a `Portfolio` DTO from raw analysis metrics.
 */
export function toPortfolio(
  metrics: PortfolioAnalysis['portfolioMetrics'],
  cashAsset: PortfolioAnalysis['cashAsset'],
  accountId: string,
): Portfolio {
  return {
    id: `portfolio-${accountId}`,
    userId: accountId,
    totalValue: metrics.totalAssetsValue,
    totalNonCashValue: metrics.totalMarketValue,
    cashValue: cashAsset.amount,
    concentrationRiskScore: 0, // default
    correlationRiskScore: 0,   // default
    liquidityRiskScore: 0,     // default
    allocationRiskScore: 0,    // default
    overallRiskScore: 0,       // default
    riskLevel: 'medium',         // default
    lastUpdated: new Date(),
    riskMode: 'retail',          // default
  };
}
