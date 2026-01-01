import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { randomUUID } from 'node:crypto';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import logger from '@server/base/logger';
import { RecommendationType } from '@typings/insight';

// 定义状态类型
export interface DiversificationState {
  positions: PositionAsset[];
  portfolio: Portfolio;
  marketContext?: any;
  portfolioAnalysis?: string;
  correlationAnalysis?: string;
  sectorAnalysis?: string;
  liquidityAnalysis?: string;
  recommendations: Array<{
    id: string;
    assetId: string;
    assetSymbol: string;
    assetName: string;
    amount: number;
    correlation: number;
    liquidityScore: number;
    reason: string;
  }>;
  error?: string;
}

const StateAnnotation = Annotation.Root({
  positions: Annotation<PositionAsset[]>(),
  portfolio: Annotation<Portfolio>(),
  marketContext: Annotation<any>(),
  portfolioAnalysis: Annotation<string>(),
  correlationAnalysis: Annotation<string>(),
  sectorAnalysis: Annotation<string>(),
  liquidityAnalysis: Annotation<string>(),
  recommendations: Annotation<
    Array<{
      id: string;
      assetId: string;
      assetSymbol: string;
      assetName: string;
      amount: number;
      correlation: number;
      liquidityScore: number;
      reason: string;
    }>
  >(),
  error: Annotation<string>(),
});

type State = typeof StateAnnotation.State;

// 创建 LangGraph 工作流
export class DiversificationGraph {
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
      .addNode('correlation_analyzer', this.createCorrelationAnalyzer())
      .addNode('sector_analyzer', this.createSectorAnalyzer())
      .addNode('liquidity_analyzer', this.createLiquidityAnalyzer())
      .addNode('recommendation_generator', this.createRecommendationGenerator())
      .addEdge(START, 'portfolio_analyzer')
      .addEdge('portfolio_analyzer', 'correlation_analyzer')
      .addEdge('portfolio_analyzer', 'sector_analyzer')
      .addEdge('portfolio_analyzer', 'liquidity_analyzer')
      .addEdge('correlation_analyzer', 'recommendation_generator')
      .addEdge('sector_analyzer', 'recommendation_generator')
      .addEdge('liquidity_analyzer', 'recommendation_generator')
      .addEdge('recommendation_generator', END);

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
3. 相关性分析
4. 流动性分析

请用简洁的中文描述，每个分析点1-2句话。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { portfolioAnalysis: response.content };
      } catch (error) {
        return { error: '投资组合分析失败' };
      }
    };
  }

  private createCorrelationAnalyzer() {
    return async (state: State) => {
      const { positions, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，评估资产间的相关性：

**投资组合分析：**
${portfolioAnalysis}

**当前持仓：**
${positions.map((pos) => `${pos.symbol}${pos.investmentMemo ? ` (${pos.investmentMemo})` : ''}`).join(', ')}

请识别以下相关性风险：
1. 高相关性资产组（相关性 > 0.7）
2. 中等相关性资产组（相关性 0.3-0.7）
3. 低相关性资产组（相关性 < 0.3）

请用中文回答，格式清晰。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { correlationAnalysis: response.content };
      } catch (error) {
        return { error: '相关性分析失败' };
      }
    };
  }

  private createSectorAnalyzer() {
    return async (state: State) => {
      const { positions, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，分析行业分布情况：

**投资组合分析：**
${portfolioAnalysis}

**当前持仓：**
${positions.map((pos) => `${pos.symbol} (${pos.sector || '未分类'})${pos.investmentMemo ? ` - ${pos.investmentMemo}` : ''}`).join(', ')}

请识别以下行业风险：
1. 行业集中度分析
2. 缺失的重要行业板块
3. 行业轮动趋势

请用中文回答，格式清晰。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { sectorAnalysis: response.content };
      } catch (error) {
        return { error: '行业分析失败' };
      }
    };
  }

  private createLiquidityAnalyzer() {
    return async (state: State) => {
      const { positions, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，分析资产流动性：

**投资组合分析：**
${portfolioAnalysis}

**当前持仓：**
${positions.map((pos) => `${pos.symbol} (流动性评分: ${pos.liquidityScore || 80})${pos.investmentMemo ? ` - ${pos.investmentMemo}` : ''}`).join(', ')}

请评估以下流动性风险：
1. 整体流动性水平
2. 低流动性资产识别
3. 流动性风险评级

请用中文回答，格式清晰。`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { liquidityAnalysis: response.content };
      } catch (error) {
        return { error: '流动性分析失败' };
      }
    };
  }

  private createRecommendationGenerator() {
    return async (state: State) => {
      const {
        portfolioAnalysis,
        correlationAnalysis,
        sectorAnalysis,
        liquidityAnalysis,
        portfolio,
      } = state;

      const prompt = `基于以下分析，生成3个具体的分散投资建议：

**投资组合分析：**
${portfolioAnalysis}

**相关性分析：**
${correlationAnalysis}

**行业分析：**
${sectorAnalysis}

**流动性分析：**
${liquidityAnalysis}

请提供以下类型的分散投资建议：
1. 与现有持仓低相关性的资产
2. 填补行业空白的资产
3. 高流动性且有增长潜力的资产

每个建议需要包含：
- 资产代码
- 资产名称
- 建议投资金额（美元）
- 与现有持仓的相关性（0-1数值）
- 流动性评分（0-100）
- 推荐理由

请用JSON格式返回，格式如下：
{
  "recommendations": [
    {
      "assetId": "xxx",
      "assetSymbol": "xxx",
      "assetName": "xxx",
      "amount": 5000,
      "correlation": 0.25,
      "liquidityScore": 95,
      "reason": "xxx"
    }
  ]
}`;

      try {
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        const content = response.content.toString();
        // logger.info('[diversification] recommendationGenerator response: %s', content);

        // 解析JSON响应
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          const recommendations = data.recommendations.map((rec: any) => ({
            ...rec,
            id: randomUUID(),
          }));
          return { recommendations };
        }

        return { recommendations: [] };
      } catch (error) {
        logger.error('Error in diversification recommendation generator:', error);
        return { error: '分散投资建议生成失败', recommendations: [] };
      }
    };
  }

  async generateRecommendations(
    positions: PositionAsset[],
    portfolio: Portfolio,
    marketContext?: any,
  ): Promise<Array<RecommendationType>> {
    try {
      const initialState = {
        positions,
        portfolio,
        marketContext,
        recommendations: [],
      };

      const result = await this.graph?.invoke(initialState);

      return (result as unknown as DiversificationState).recommendations || [];
    } catch (error) {
      console.error('Error in diversification graph:', error);
      return this.getFallbackRecommendations();
    }
  }

  private getFallbackRecommendations(): Array<{
    id: string;
    assetId: string;
    assetSymbol: string;
    assetName: string;
    amount: number;
    correlation: number;
    liquidityScore: number;
    reason: string;
  }> {
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
}
