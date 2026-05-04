import portfolioAnalysisService from '@server/service/portfolioAnalysisService';

/**
 * Query the user's portfolio overview, returning a compact summary
 * suitable for immediate consumption by the agent.
 *
 * Includes: total market value, cash balance, position count,
 * unrealized PnL, risk level, and a brief holdings list.
 */
export async function queryPortfolio(accountId: string): Promise<string> {
  const analysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
  const risk = portfolioAnalysisService.calculateRiskScore(
    analysis.portfolioMetrics,
  );

  const getCurrencySymbol = (currency?: string): string => {
    switch (currency) {
      case 'CNY': return '¥';
      case 'HKD': return 'HK$';
      default: return '$';
    }
  };

  const lines = [
    '## 用户资产概览',
    `- 总资产: $${analysis.portfolioMetrics.totalAssetsValue.toFixed(2)} (股票: $${analysis.assetBreakdown.stocks.totalValue.toFixed(2)}, 现金: ${getCurrencySymbol(analysis.assetBreakdown.cash.currency)}${analysis.assetBreakdown.cash.amount.toFixed(2)})`,
    `- 持仓: ${analysis.portfolioMetrics.positionCount}只, 未实现盈亏: $${analysis.portfolioMetrics.totalUnrealizedPnL.toFixed(2)}`,
    `- 风险等级: ${analysis.portfolioMetrics.riskLevel}`,
  ];

  if (analysis.holdingsSummary.length > 0) {
    const brief = analysis.holdingsSummary
      .map((s) => {
        const cs = getCurrencySymbol(s.currency);
        const pnl = s.unrealizedPnL ?? 0;
        return `${s.symbol}:${cs}${s.currentPrice?.toFixed(2) ?? '0'}(${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)})`;
      })
      .join(', ');
    lines.push(`- 持仓明细: ${brief}`);
  }

  lines.push('', '## 风险评估', `- 风险等级: ${risk.level}`, `- 风险评分: ${risk.score}/100`);
  if (risk.recommendations.length > 0) {
    lines.push(`- 建议: ${risk.recommendations.join(', ')}`);
  }

  return lines.join('\n');
}
