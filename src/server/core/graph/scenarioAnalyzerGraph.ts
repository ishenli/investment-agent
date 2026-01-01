import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { randomUUID } from 'node:crypto';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import logger from '@server/base/logger';
import { RiskCalculatorService } from '@server/service/riskCalculatorService';
import { JsonExtractor } from '@/shared';

// 定义状态类型
export interface ScenarioAnalyzerState {
  positions: PositionAsset[];
  portfolio: Portfolio;
  scenario: {
    asset: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
  };
  marketContext?: any;
  currentRiskMetrics: {
    concentration: number;
    allocation: number;
    correlation: number;
    liquidity: number;
  };
  newRiskMetrics: {
    concentration: number;
    allocation: number;
    correlation: number;
    liquidity: number;
  } | null;
  analysisResults: Array<{
    metric: string;
    currentValue: number;
    newValue: number;
    change: number;
    insight?: string;
    recommendation?: string;
  }> | null;
  error?: string;
}

const StateAnnotation = Annotation.Root({
  positions: Annotation<PositionAsset[]>(),
  portfolio: Annotation<Portfolio>(),
  scenario: Annotation<{
    asset: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
  }>(),
  marketContext: Annotation<any>(),
  currentRiskMetrics: Annotation<{
    concentration: number;
    allocation: number;
    correlation: number;
    liquidity: number;
  }>(),
  newRiskMetrics: Annotation<{
    concentration: number;
    allocation: number;
    correlation: number;
    liquidity: number;
  } | null>(),
  analysisResults: Annotation<Array<
    | {
        metric: string;
        currentValue: number;
        newValue: number;
        change: number;
        insight?: string;
        recommendation?: string;
      }
    | string
  > | null>(),
  error: Annotation<string>(),
});

type State = typeof StateAnnotation.State;

// 创建 LangGraph 工作流
export class ScenarioAnalyzerGraph {
  private llm: ChatOpenAI;
  graph: any;

  constructor() {
    this.llm = chatModelOpenAI('Qwen3-235B-A22B-Instruct-2507');
    this.graph = null;
    this.setupGraph();
  }

  private setupGraph() {
    const graph = new StateGraph(StateAnnotation);
    // 添加节点
    graph
      .addNode('risk_calculator', this.createRiskCalculator())
      .addNode('scenario_simulator', this.createScenarioSimulator())
      .addNode('impact_analyzer', this.createImpactAnalyzer())
      .addEdge(START, 'risk_calculator')
      .addEdge('risk_calculator', 'scenario_simulator')
      .addEdge('scenario_simulator', 'impact_analyzer')
      .addEdge('impact_analyzer', END);

    this.graph = graph.compile();
  }

  private createRiskCalculator() {
    return async (state: State) => {
      const { positions, portfolio } = state;

      try {
        // 计算当前风险指标
        const concentration = RiskCalculatorService.calculateConcentrationRisk(
          positions,
          portfolio.riskMode,
        );
        const allocation = RiskCalculatorService.calculateAllocationRisk(
          positions,
          portfolio.riskMode,
          portfolio,
        );
        const correlation = await RiskCalculatorService.calculateCorrelationRisk(
          positions,
          portfolio.riskMode,
        );

        const currentRiskMetrics = {
          concentration,
          allocation,
          correlation,
        };

        return { currentRiskMetrics };
      } catch (error) {
        return { error: '风险计算失败' };
      }
    };
  }

  private createScenarioSimulator() {
    return async (state: State) => {
      const { positions, portfolio, scenario, currentRiskMetrics } = state;
      const { asset, action, quantity, price } = scenario;

      try {
        // 模拟交易后的新持仓
        let newPositions = [...positions];

        if (action === 'buy') {
          // 查找是否已持有该资产
          const existingPositionIndex = newPositions.findIndex((pos) => pos.symbol === asset);

          if (existingPositionIndex >= 0) {
            // 更新现有持仓
            const existingPosition = newPositions[existingPositionIndex];
            const newQuantity = existingPosition.quantity + quantity;
            const totalCost =
              existingPosition.averageCost * existingPosition.quantity + price * quantity;
            const newAverageCost = totalCost / newQuantity;

            newPositions[existingPositionIndex] = {
              ...existingPosition,
              quantity: newQuantity,
              averageCost: newAverageCost,
              marketValue: newQuantity * price,
              unrealizedPnL: (price - newAverageCost) * newQuantity,
              weight: 0, // 将在后续计算中更新
            };
          } else {
            // 添加新持仓
            newPositions.push({
              id: randomUUID(),
              symbol: asset,
              name: asset,
              quantity,
              averageCost: price,
              currentPrice: price,
              marketValue: quantity * price,
              unrealizedPnL: 0,
              unrealizedPnLPercentage: 0,
              weight: 0, // 将在后续计算中更新
              liquidityScore: 80,
              lastUpdated: new Date(),
            });
          }
        } else if (action === 'sell') {
          // 查找要卖出的资产
          const existingPositionIndex = newPositions.findIndex((pos) => pos.symbol === asset);

          if (existingPositionIndex >= 0) {
            const existingPosition = newPositions[existingPositionIndex];
            const newQuantity = existingPosition.quantity - quantity;

            if (newQuantity <= 0) {
              // 完全卖出，移除持仓
              newPositions = newPositions.filter((pos) => pos.symbol !== asset);
            } else {
              // 部分卖出，更新持仓
              newPositions[existingPositionIndex] = {
                ...existingPosition,
                quantity: newQuantity,
                marketValue: newQuantity * price,
                weight: 0, // 将在后续计算中更新
              };
            }
          }
        }

        // 更新持仓权重
        const totalValue =
          portfolio.totalValue + (action === 'buy' ? quantity * price : -quantity * price);
        newPositions = newPositions.map((pos) => ({
          ...pos,
          weight: totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0,
        }));

        // 计算新的风险指标
        const concentration = RiskCalculatorService.calculateConcentrationRisk(
          newPositions,
          portfolio.riskMode,
        );
        const allocation = RiskCalculatorService.calculateAllocationRisk(
          newPositions,
          portfolio.riskMode,
          portfolio,
        );
        const correlation = await RiskCalculatorService.calculateCorrelationRisk(
          newPositions,
          portfolio.riskMode,
        );

        const newRiskMetrics = {
          concentration,
          allocation,
          correlation,
        };

        return { newRiskMetrics, newPositions };
      } catch (error) {
        return { error: '场景模拟失败' };
      }
    };
  }

  private createImpactAnalyzer() {
    return async (state: State) => {
      const { currentRiskMetrics, newRiskMetrics, positions, portfolio, scenario } = state;

      if (!newRiskMetrics) {
        return { analysisResults: [], error: '缺少新的风险指标' };
      }

      try {
        // 构建投资组合摘要
        const portfolioSummary = this.buildPortfolioSummary(positions, portfolio);

        // 构建场景描述
        const scenarioDescription = this.buildScenarioDescription(scenario, positions);

        // 构建风险变化分析
        const riskChanges = this.buildRiskChangesDescription(currentRiskMetrics, newRiskMetrics);

        // 创建 LLM 提示
        const prompt = this.createAnalysisPrompt(
          portfolioSummary,
          scenarioDescription,
          riskChanges,
        );

        // 调用 LLM 进行智能分析
        const response = await this.llm.invoke([new HumanMessage(prompt)]);

        // 解析 LLM 响应
        const analysisResults = JsonExtractor.extract(response.content as string);

        return { analysisResults: analysisResults.data || [] };
      } catch (error) {
        logger.error('LLM 场景分析失败:', error);
        // 回退到基础数值分析
        return { analysisResults: this.getFallbackAnalysis(currentRiskMetrics, newRiskMetrics) };
      }
    };
  }

  private buildPortfolioSummary(positions: PositionAsset[], portfolio: Portfolio): string {
    const totalValue = portfolio.totalValue;
    const topHoldings = positions
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 5)
      .map(
        (pos) =>
          `${pos.symbol} (${pos.weight.toFixed(1)}%)${pos.investmentMemo ? ` - ${pos.investmentMemo}` : ''}`,
      )
      .join(', ');

    return `当前投资组合总价值: $${totalValue.toLocaleString()}
主要持仓: ${topHoldings}
风险模式: ${portfolio.riskMode}`;
  }

  private buildScenarioDescription(scenario: any, positions: PositionAsset[]): string {
    const existingPosition = positions.find((p) => p.symbol === scenario.asset);
    const currentQuantity = existingPosition ? existingPosition.quantity : 0;
    const investmentMemo = existingPosition ? existingPosition.investmentMemo : null;
    const newQuantity =
      scenario.action === 'buy'
        ? currentQuantity + scenario.quantity
        : Math.max(0, currentQuantity - scenario.quantity);

    return `交易场景: ${scenario.action === 'buy' ? '买入' : '卖出'} ${scenario.asset}
交易数量: ${scenario.quantity} 股 @ $${scenario.price}/股
当前持仓: ${currentQuantity} 股 → 新持仓: ${newQuantity} 股${investmentMemo ? ` - 投资笔记: ${investmentMemo}` : ''}`;
  }

  private buildRiskChangesDescription(current: any, updated: any): string {
    const changes = [
      {
        metric: '集中度风险',
        current: current.concentration,
        new: updated.concentration,
        change: updated.concentration - current.concentration,
      },
      {
        metric: '资产配置风险',
        current: current.allocation,
        new: updated.allocation,
        change: updated.allocation - current.allocation,
      },
      {
        metric: '相关性风险',
        current: current.correlation,
        new: updated.correlation,
        change: updated.correlation - current.correlation,
      },
      {
        metric: '流动性风险',
        current: current.liquidity,
        new: updated.liquidity,
        change: updated.liquidity - current.liquidity,
      },
    ];

    return changes
      .map(
        (c) =>
          `${c.metric}: ${c.current.toFixed(1)} → ${c.new.toFixed(1)} (${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)})`,
      )
      .join('\n');
  }

  private createAnalysisPrompt(
    portfolioSummary: string,
    scenarioDescription: string,
    riskChanges: string,
  ): string {
    return `你是一位专业的投资分析师，请基于以下信息对交易场景进行深度分析。

${portfolioSummary}

${scenarioDescription}

${riskChanges}

请提供以下分析：

1. **交易影响评估**: 分析这笔交易对投资组合的直接影响
2. **风险变化解读**: 解释各项风险指标变化的意义和影响
3. **投资建议**: 基于风险变化给出具体的投资建议
4. **风险提示**: 指出潜在的风险点和注意事项
5. **后续监控**: 建议需要重点关注的指标

请以 JSON 格式返回分析结果，包含以下字段：
- metric: 分析维度名称
- insight: 深度分析见解
- recommendation: 具体建议

确保分析专业、具体、有针对性，避免泛泛而谈。`;
  }

  async analyzeScenario(
    positions: PositionAsset[],
    portfolio: Portfolio,
    scenario: {
      asset: string;
      action: 'buy' | 'sell';
      quantity: number;
      price: number;
    },
    marketContext?: any,
  ): Promise<
    Array<{
      metric: string;
      insight?: string;
      recommendation?: string;
    }>
  > {
    try {
      const initialState = {
        positions,
        portfolio,
        scenario,
        marketContext,
        currentRiskMetrics: {
          concentration: 0,
          allocation: 0,
          correlation: 0,
          liquidity: 0,
        },
        newRiskMetrics: null,
        analysisResults: null,
      };

      const result = await this.graph?.invoke(initialState);

      return (result as unknown as ScenarioAnalyzerState).analysisResults || [];
    } catch (error) {
      console.error('Error in scenario analyzer graph:', error);
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(
    currentRiskMetrics?: any,
    newRiskMetrics?: any,
  ): Array<{
    metric: string;
    currentValue: number;
    newValue: number;
    change: number;
    insight?: string;
    recommendation?: string;
  }> {
    if (currentRiskMetrics && newRiskMetrics) {
      const calculateChange = (current: number, updated: number) => {
        if (current === 0) return 0;
        return ((updated - current) / Math.abs(current)) * 100;
      };

      return [
        {
          metric: '集中度风险评分(fallback)',
          currentValue: Math.max(0, currentRiskMetrics.concentration),
          newValue: Math.max(0, newRiskMetrics.concentration),
          change: calculateChange(currentRiskMetrics.concentration, newRiskMetrics.concentration),
          insight: '基于数值计算的风险变化分析',
          recommendation: '建议关注集中度变化对整体风险的影响',
        },
        {
          metric: '相关性风险评分(fallback)',
          currentValue: Math.max(0, currentRiskMetrics.correlation),
          newValue: Math.max(0, newRiskMetrics.correlation),
          change: calculateChange(currentRiskMetrics.correlation, newRiskMetrics.correlation),
          insight: '相关性风险变化可能影响组合分散效果',
          recommendation: '监控资产间相关性变化',
        },
        {
          metric: '流动性风险评分(fallback)',
          currentValue: Math.max(0, currentRiskMetrics.liquidity),
          newValue: Math.max(0, newRiskMetrics.liquidity),
          change: calculateChange(currentRiskMetrics.liquidity, newRiskMetrics.liquidity),
          insight: '流动性风险变化影响资金灵活性',
          recommendation: '保持适当的流动性缓冲',
        },
        {
          metric: '资产配置风险评分(fallback)',
          currentValue: Math.max(0, currentRiskMetrics.allocation),
          newValue: Math.max(0, newRiskMetrics.allocation),
          change: calculateChange(currentRiskMetrics.allocation, newRiskMetrics.allocation),
          insight: '资产配置结构变化带来的风险调整',
          recommendation: '评估新配置是否符合投资目标',
        },
      ];
    }

    return [
      {
        metric: '总投资组合价值(fallback)',
        currentValue: 150000,
        newValue: 152500,
        change: 1.67,
        insight: '投资组合价值基础变化',
        recommendation: '关注价值变化对风险敞口的影响',
      },
      {
        metric: '集中度风险评分(fallback)',
        currentValue: 45,
        newValue: 42,
        change: -6.67,
        insight: '集中度风险有所降低',
        recommendation: '适度分散有助于降低单一资产风险',
      },
      {
        metric: '相关性风险评分(fallback)',
        currentValue: 60,
        newValue: 58,
        change: -3.33,
        insight: '相关性风险轻微下降',
        recommendation: '保持资产间的低相关性',
      },
      {
        metric: '流动性风险评分(fallback)',
        currentValue: 80,
        newValue: 82,
        change: 2.5,
        insight: '流动性状况有所改善',
        recommendation: '维持良好的流动性管理',
      },
      {
        metric: '资产配置风险评分(fallback)',
        currentValue: 55,
        newValue: 53,
        change: -3.64,
        insight: '资产配置结构更加优化',
        recommendation: '定期评估配置有效性',
      },
    ];
  }
}
