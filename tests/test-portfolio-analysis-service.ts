import portfolioAnalysisService from '@server/service/portfolioAnalysisService';
import logger from '@server/base/logger';

/**
 * 测试 PortfolioAnalysisService 功能
 * 验证计算逻辑迁移后的正确性
 */
async function testPortfolioAnalysisService() {
  try {
    console.log('🧪 开始测试 PortfolioAnalysisService...');

    const testAccountId = '1';

    // 测试完整的投资组合分析
    console.log('\n📊 测试完整投资组合分析...');
    const analysis = await portfolioAnalysisService.getPortfolioAnalysis(testAccountId);

    console.log('✅ 投资组合分析结果:');
    console.log('💰 现金资产:', {
      amount: analysis.cashAsset.amount,
      currency: analysis.cashAsset.currency,
      available: analysis.cashAsset.available,
    });

    console.log('📈 股票资产:', {
      count: analysis.assetBreakdown.stocks.count,
      totalValue: analysis.assetBreakdown.stocks.totalValue,
      totalCost: analysis.assetBreakdown.stocks.totalCost,
      unrealizedPnL: analysis.assetBreakdown.stocks.unrealizedPnL,
    });

    console.log('📊 投资组合指标:', {
      totalAssetsValue: analysis.portfolioMetrics.totalAssetsValue,
      totalAssetsCost: analysis.portfolioMetrics.totalAssetsCost,
      riskLevel: analysis.portfolioMetrics.riskLevel,
      diversificationScore: analysis.portfolioMetrics.diversificationScore,
    });

    console.log('⚖️ 资产配置:', {
      stock: `${(analysis.portfolioMetrics.allocation.stock * 100).toFixed(1)}%`,
      cash: `${(analysis.portfolioMetrics.allocation.cash * 100).toFixed(1)}%`,
    });

    // 测试风险评分
    console.log('\n🎯 测试风险评分...');
    const riskAnalysis = portfolioAnalysisService.calculateRiskScore(analysis.portfolioMetrics);
    console.log('📋 风险分析:', riskAnalysis);

    // 测试配置建议
    console.log('\n💡 测试配置建议...');
    const advice = portfolioAnalysisService.getAllocationAdvice(
      analysis.portfolioMetrics.allocation,
    );
    console.log('📝 建议:', advice);

    console.log('\n✅ PortfolioAnalysisService 测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testPortfolioAnalysisService();
}

export { testPortfolioAnalysisService };
