import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { randomUUID } from 'node:crypto';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import logger from '@server/base/logger';

// 定义状态类型
export interface StrategyAdviceState {
  positions: PositionAsset[];
  portfolio: Portfolio;
  marketContext?: any;
  portfolioAnalysis?: string;
  riskAssessment?: string;
  marketOutlook?: string;
  advice: Array<{
    id: string;
    title: string;
    description: string;
    recommended: boolean;
  }>;
  error?: string;
}

const StateAnnotation = Annotation.Root({
  positions: Annotation<PositionAsset[]>(),
  portfolio: Annotation<Portfolio>(),
  marketContext: Annotation<any>(),
  portfolioAnalysis: Annotation<string>(),
  riskAssessment: Annotation<string>(),
  marketOutlook: Annotation<string>(),
  advice: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      recommended: boolean;
    }>
  >(),
  error: Annotation<string>(),
});

type State = typeof StateAnnotation.State;

// 创建 LangGraph 工作流
export class StrategyAdviceGraph {
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
      .addNode('portfolio_analyzer', this.createPortfolioAnalyzer())
      .addNode('risk_assessor', this.createRiskAssessor())
      .addNode('market_analyst', this.createMarketAnalyst())
      .addNode('advice_generator', this.createAdviceGenerator())
      .addEdge(START, 'portfolio_analyzer')
      .addEdge('portfolio_analyzer', 'risk_assessor')
      .addEdge('portfolio_analyzer', 'market_analyst')
      .addEdge('risk_assessor', 'advice_generator')
      .addEdge('market_analyst', 'advice_generator')
      .addEdge('advice_generator', END);

    this.graph = graph.compile();
  }

  private createPortfolioAnalyzer() {
    return async (state: State) => {
      const { positions, portfolio } = state;

      const prompt = `分析以下投资组合的结构和特征：

**持仓详情：**
${positions
  .map(
    (pos) =>
      `${pos.symbol}: ${pos.quantity}股 @ $${pos.currentPrice} (${(((pos.currentPrice * pos.quantity) / (portfolio.totalValue || 1)) * 100).toFixed(1)}%)${pos.investmentMemo ? ` - 投资笔记: ${pos.investmentMemo}` : ''}`,
  )
  .join('\n')}

**投资组合概况：**
总价值: $${portfolio.totalValue?.toLocaleString() || 0}
现金: $${portfolio.cashValue?.toLocaleString() || 0}

请提供以下分析：
1. 行业分布分析
2. 集中度分析
3. 流动性分析
4. 估值水平分析

请用简洁的中文描述，每个分析点1-2句话。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { portfolioAnalysis: response.content };
      } catch (error) {
        return { error: '投资组合分析失败' };
      }
    };
  }

  private createRiskAssessor() {
    return async (state: State) => {
      const { positions, portfolio, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，评估以下风险：

**投资组合分析：**
${portfolioAnalysis}

**持仓详情：**
${positions.map((pos) => `${pos.symbol}: ${pos.quantity}股 @ $${pos.currentPrice}${pos.investmentMemo ? ` - 投资笔记: ${pos.investmentMemo}` : ''}`).join('\n')}

请识别以下风险类型：
1. 集中度风险
2. 行业风险
3. 流动性风险
4. 市场风险
5. 个股特定风险

对每个风险给出：
- 风险等级（低/中/高）
- 具体描述
- 建议的缓解措施

请用中文回答，格式清晰。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { riskAssessment: response.content };
      } catch (error) {
        return { error: '风险评估失败' };
      }
    };
  }

  private createMarketAnalyst() {
    return async (state: State) => {
      const { positions, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，分析当前市场环境：

**投资组合分析：**
${portfolioAnalysis}

**当前持仓：**
${positions.map((pos) => `${pos.symbol}${pos.investmentMemo ? ` (${pos.investmentMemo})` : ''}`).join(', ')}

请分析以下市场因素：
1. 宏观经济环境对投资组合的影响
2. 行业发展趋势
3. 市场情绪和估值水平
4. 近期重要事件影响

请用中文回答，提供具体可操作的市场洞察。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { marketOutlook: response.content };
      } catch (error) {
        return { error: '市场分析失败' };
      }
    };
  }

  private createAdviceGenerator() {
    return async (state: State) => {
      const { portfolioAnalysis, riskAssessment, marketOutlook } = state;

      const prompt = `基于以下分析，生成3个具体的策略建议：

**投资组合分析：**
${portfolioAnalysis}

**风险评估：**
${riskAssessment}

**市场展望：**
${marketOutlook}

请生成以下类型的策略建议：
1. 风险管理建议（1个）
2. 优化配置建议（1个）
3. 市场时机建议（1个）

每个建议需要包含：
- 标题（简洁明了）
- 描述（具体详细）
- 建议类型（recommended: true表示强烈推荐，false表示可选）

请用JSON格式返回，格式如下：
{
  "advice": [
    {
      "title": "xxx",
      "description": "xxx",
      "recommended": true
    }
  ]
}`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        const content = response.content.toString();
        // logger.info('[strategy] adviceGenerator response: %s', content);

        // 解析JSON响应
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          const advice = data.advice.map((item: any) => ({
            ...item,
            id: randomUUID(),
          }));
          return { advice };
        }

        return { advice: [] };
      } catch (error) {
        logger.error('Error in strategy advice generator:', error);
        return { error: '策略建议生成失败', advice: [] };
      }
    };
  }

  async generateAdvice(
    positions: PositionAsset[],
    portfolio: Portfolio,
    marketContext?: any,
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      recommended: boolean;
    }>
  > {
    try {
      const initialState = {
        positions,
        portfolio,
        marketContext,
        advice: [],
      };

      const result = await this.graph?.invoke(initialState);

      return (result as unknown as StrategyAdviceState).advice || [];
    } catch (error) {
      console.error('Error in strategy advice graph:', error);
      return this.getFallbackAdvice();
    }
  }

  private getFallbackAdvice(): Array<{
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
}
