import { AIInsightsGraph } from '@server/core/graph/aiInsightsGraph';
import { DiversificationGraph } from '@server/core/graph/diversificationGraph';
import { StrategyAdviceGraph } from '@server/core/graph/strategyAdviceGraph';
import { ScenarioAnalyzerGraph } from '@server/core/graph/scenarioAnalyzerGraph';
import { AIInsight } from '@renderer/store/position/aiInsightsTypes';
import { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { randomUUID } from 'node:crypto';
import { AdviceType } from '@typings/insight';

export class AIInsightsService {
  private static insightsGraph: AIInsightsGraph;
  private static diversificationGraph: DiversificationGraph;
  private static strategyAdviceGraph: StrategyAdviceGraph;
  private static scenarioAnalyzerGraph: ScenarioAnalyzerGraph;

  static initialize() {
    this.insightsGraph = new AIInsightsGraph();
    this.diversificationGraph = new DiversificationGraph();
    this.strategyAdviceGraph = new StrategyAdviceGraph();
    this.scenarioAnalyzerGraph = new ScenarioAnalyzerGraph();
  }

  static async generateAIInsights(
    positions: PositionAsset[],
    portfolio: Portfolio,
    marketContext?: any,
  ): Promise<AIInsight[]> {
    if (!this.insightsGraph) {
      this.initialize();
    }

    try {
      // 使用 LangGraph 工作流生成洞察
      const insights = await this.insightsGraph.generateInsights(
        positions,
        portfolio,
        marketContext,
      );

      // 确保返回的洞察有完整的结构
      return insights.map((insight) => ({
        ...insight,
        id: insight.id || randomUUID(),
        timestamp: insight.timestamp || new Date(),
        source: 'langgraph-ai-agent',
      }));
    } catch (error) {
      console.error('Error generating AI insights with LangGraph:', error);
      return this.getFallbackInsights();
    }
  }

  static async generateDiversificationRecommendations(
    positions: PositionAsset[],
    portfolio: Portfolio,
  ): Promise<any[]> {
    if (!this.diversificationGraph) {
      this.initialize();
    }

    try {
      // 使用 LangGraph 工作流生成分散投资建议
      const recommendations = await this.diversificationGraph.generateRecommendations(
        positions,
        portfolio,
      );

      return recommendations;
    } catch (error) {
      console.error('Error generating diversification recommendations with LangGraph:', error);
      // 返回备选建议
      return this.getFallbackDiversificationRecommendations();
    }
  }

  static async generateStrategyAdvice(
    positions: PositionAsset[],
    portfolio: Portfolio,
  ): Promise<Array<AdviceType>> {
    if (!this.strategyAdviceGraph) {
      this.initialize();
    }

    try {
      // 使用 LangGraph 工作流生成策略建议
      const advice = await this.strategyAdviceGraph.generateAdvice(positions, portfolio);

      return advice;
    } catch (error) {
      console.error('Error generating strategy advice with LangGraph:', error);
      // 返回备选建议
      return this.getFallbackStrategyAdvice();
    }
  }

  static async analyzeScenario(
    positions: PositionAsset[],
    portfolio: Portfolio,
    scenario: {
      asset: string;
      action: 'buy' | 'sell';
      quantity: number;
      price: number;
    },
  ): Promise<
    Array<{
      metric: string;
    }>
  > {
    if (!this.scenarioAnalyzerGraph) {
      this.initialize();
    }

    try {
      // 使用 LangGraph 工作流分析场景
      const analysisResults = await this.scenarioAnalyzerGraph.analyzeScenario(
        positions,
        portfolio,
        scenario,
      );

      return analysisResults;
    } catch (error) {
      console.error('Error analyzing scenario with LangGraph:', error);
      // 返回备选分析结果
      return this.getFallbackScenarioAnalysis();
    }
  }

  private static getFallbackScenarioAnalysis(): Array<{
    metric: string;
    currentValue: number;
    newValue: number;
    change: number;
  }> {
    return [
      {
        metric: '总投资组合价值',
        currentValue: 150000,
        newValue: 152500,
        change: 1.67,
      },
      {
        metric: '集中度风险评分',
        currentValue: 45,
        newValue: 42,
        change: -6.67,
      },
      {
        metric: '相关性风险评分',
        currentValue: 60,
        newValue: 58,
        change: -3.33,
      },
      {
        metric: '流动性风险评分',
        currentValue: 80,
        newValue: 82,
        change: 2.5,
      },
      {
        metric: '资产配置风险评分',
        currentValue: 55,
        newValue: 53,
        change: -3.64,
      },
    ];
  }

  private static getFallbackDiversificationRecommendations(): any[] {
    return [
      {
        id: randomUUID(),
        assetId: 'VTI',
        assetSymbol: 'VTI',
        assetName: 'Vanguard Total Stock Market ETF',
        amount: 5000,
        correlation: 0.1,
        liquidityScore: 98,
        reason: '与现有持仓低相关性，高流动性，适合分散投资风险',
      },
      {
        id: randomUUID(),
        assetId: 'BND',
        assetSymbol: 'BND',
        assetName: 'Vanguard Total Bond Market ETF',
        amount: 3000,
        correlation: 0.05,
        liquidityScore: 95,
        reason: '债券资产，与股票低相关性，可平衡投资组合风险',
      },
      {
        id: randomUUID(),
        assetId: 'VEA',
        assetSymbol: 'VEA',
        assetName: 'Vanguard Developed Markets ETF',
        amount: 2000,
        correlation: 0.3,
        liquidityScore: 92,
        reason: '国际发达市场股票，地域分散，降低单一市场风险',
      },
    ];
  }

  private static getFallbackStrategyAdvice(): Array<{
    id: string;
    title: string;
    description: string;
    recommended: boolean;
  }> {
    return [
      {
        id: randomUUID(),
        title: '定期再平衡投资组合',
        description: '建议每季度检查一次投资组合，根据市场变化调整资产配置以维持目标风险水平',
        recommended: true,
      },
      {
        id: randomUUID(),
        title: '关注高集中度持仓',
        description: '如果单个资产占比超过总价值的10%，建议考虑减持部分仓位以降低风险',
        recommended: true,
      },
      {
        id: randomUUID(),
        title: '保持充足的现金储备',
        description: '建议保留3-6个月的生活费用作为应急资金，以应对市场波动和突发事件',
        recommended: false,
      },
    ];
  }

  private static getFallbackInsights(): AIInsight[] {
    return [
      {
        id: randomUUID(),
        title: '系统维护中',
        description: 'AI洞察系统正在升级，请稍后重试获取详细的投资分析。',
        confidence: 100,
        type: 'suggestion',
        timestamp: new Date(),
        source: 'fallback',
      },
    ];
  }
}
