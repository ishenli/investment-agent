import portfolioAnalysisService from '@server/service/portfolioAnalysisService';
import authService from '@server/service/authService';

/**
 * Query the user's portfolio overview, returning a compact summary
 * suitable for immediate consumption by the agent.
 *
 * 自动获取当前用户账户 ID，不依赖外部传入（防止 AI 编造无效 ID）。
 *
 * Includes: total market value, cash balance, position count,
 * unrealized PnL, risk level, and a brief holdings list.
 */
export async function queryPortfolio(_accountId: string): Promise<string> {
  // 自动获取当前用户账户 ID，忽略外部传入的 accountId（防止 AI 编造无效 ID）
  const accountInfo = await authService.getCurrentUserAccount();
  if (!accountInfo) {
    throw new Error('无法获取当前账户信息，请确认用户已登录');
  }
  const accountId = accountInfo.id;

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
