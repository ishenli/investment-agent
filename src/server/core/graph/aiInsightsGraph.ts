import { StateGraph, END, START, Annotation, CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AIInsight } from '@renderer/store/position/aiInsightsTypes';
import { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { randomUUID } from 'node:crypto';
import { chatModelOpenAI, ModelMap } from '@server/core/provider/chatModel';
import logger from '@/server/base/logger';
import { recordPrompt } from '@/server/utils/file';

// 定义状态类型
export interface AIInsightsState {
  positions: PositionAsset[];
  portfolio: Portfolio;
  marketContext?: any;
  portfolioAnalysis?: string;
  riskAssessment?: string;
  opportunities?: string;
  insights: AIInsight[];
  error?: string;
}

const StateAnnotation = Annotation.Root({
  positions: Annotation<PositionAsset[]>(),
  portfolio: Annotation<Portfolio>(),
  marketContext: Annotation<any>(),
  portfolioAnalysis: Annotation<string>(),
  riskAssessment: Annotation<string>(),
  opportunities: Annotation<string>(),
  insights: Annotation<AIInsight[]>(),
  error: Annotation<string>(),
});

type State = typeof StateAnnotation.State;

// 创建 LangGraph 工作流
export class AIInsightsGraph {
  private llm: ChatOpenAI;
  graph: CompiledStateGraph<typeof StateAnnotation, unknown, string> | null;

  constructor() {
    this.llm = chatModelOpenAI(ModelMap['Qwen3-Next-80B-A3B-Instruct']);
    this.graph = null;
    this.setupGraph();
  }

  private setupGraph() {
    const graph = new StateGraph(StateAnnotation);
    // 添加节点
    graph
      .addNode('portfolio_analyzer', this.createPortfolioAnalyzer())
      .addNode('risk_assessor', this.createRiskAssessor())
      .addNode('opportunity_finder', this.createOpportunityFinder())
      .addNode('insight_generator', this.createInsightGenerator())
      .addEdge(START, 'portfolio_analyzer')
      .addEdge('portfolio_analyzer', 'risk_assessor')
      .addEdge('portfolio_analyzer', 'opportunity_finder')
      .addEdge('risk_assessor', 'insight_generator')
      .addEdge('opportunity_finder', 'insight_generator')
      .addEdge('insight_generator', END);

    // @ts-expect-error
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
${JSON.stringify(portfolio, null, 2)}

请提供以下分析：
1. 行业分布分析
2. 集中度分析
3. 流动性分析
4. 估值水平分析

请用简洁的中文描述，每个分析点1-2句话。`;

      try {
        recordPrompt(prompt, 'ai-insights-portfolio-analyzer.md');
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { portfolioAnalysis: response.content };
      } catch (error) {
        return { error: '投资组合分析失败' };
      }
    };
  }

  private createRiskAssessor() {
    return async (state: State) => {
      const { positions, portfolioAnalysis } = state;

      const prompt = `基于投资组合分析，评估以下风险：

**投资组合分析：**
${JSON.stringify(portfolioAnalysis, null, 2)}

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
        recordPrompt(prompt, 'ai-insights-risk-assessor.md');
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { riskAssessment: response.content };
      } catch (error) {
        return { error: '风险评估失败' };
      }
    };
  }

  private createOpportunityFinder() {
    return async (state: State) => {
      const { positions, portfolio } = state;

      const prompt = `基于投资组合分析，寻找以下投资机会：

**投资组合分析：**
${JSON.stringify(portfolio, null, 2)}

**当前持仓：**
${positions.map((pos) => `${pos.symbol}${pos.investmentMemo ? ` (${pos.investmentMemo})` : ''}`).join(', ')}

请识别以下机会类型：
1. 分散化机会（建议新增的行业或股票）
2. 再平衡机会（建议调整的配置）
3. 市场时机机会（基于当前市场环境）
4. 个股机会（被低估或高估的股票）

对每个机会给出：
- 具体建议
- 预期收益/风险比
- 实施时间框架

请用中文回答，提供具体可操作的建议。`;

      try {
        recordPrompt(prompt, 'ai-insights-opportunity-finder.md');
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        return { opportunities: response.content };
      } catch (error) {
        logger.error('[AIInsightsGraph] Error in opportunity finder:', error);
        return { error: '机会识别失败' };
      }
    };
  }

  private createInsightGenerator() {
    return async (state: State) => {
      const { portfolioAnalysis, riskAssessment, opportunities } = state;

      const prompt = `基于以下分析，生成3-5个具体的AI投资洞察：

**投资组合分析：**
${portfolioAnalysis}

**风险评估：**
${riskAssessment}

**投资机会：**
${opportunities}

请生成以下类型的洞察：
1. 风险警告（1-2个）
2. 投资机会（1-2个）
3. 优化建议（1-2个）

每个洞察需要包含：
- 标题（简洁明了）
- 描述（具体详细）
- 置信度（70-95%）
- 类型（risk/opportunity/suggestion）
- 相关股票代码（如适用）

请用JSON格式返回，格式如下：
{
  "insights": [
    {
      "title": "xxx",
      "description": "xxx",
      "confidence": 85,
      "type": "risk",
      "relatedAssets": ["AAPL", "GOOGL"]
    }
  ]
}`;

      try {

        recordPrompt(prompt, 'ai-insights-insight-generator.md');
        const response = await this.llm.invoke([new HumanMessage(prompt)]);
        const content = response.content.toString();
        // logger.info('[insight] insightGenerator response: %s', content);

        // 解析JSON响应
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          const insights: AIInsight[] = data.insights.map((insight: any) => ({
            id: randomUUID(),
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            type: insight.type,
            timestamp: new Date(),
            metadata: {
              relatedAssets: insight.relatedAssets || [],
            },
          }));
          return { insights };
        }

        return { insights: [] };
      } catch (error) {
        return { error: '洞察生成失败', insights: [] };
      }
    };
  }

  async generateInsights(
    positions: PositionAsset[],
    portfolio: Portfolio,
    marketContext?: any,
  ): Promise<AIInsight[]> {
    try {
      const initialState = {
        positions,
        portfolio,
        marketContext,
        insights: [],
      };

      const result = await this.graph?.invoke(initialState);

      return (result as unknown as AIInsightsState).insights || [];
    } catch (error) {
      logger.error('[AIInsightsGraph] Error in AI insights graph:', error);
      return this.getFallbackInsights();
    }
  }

  private getFallbackInsights(): AIInsight[] {
    return [
      {
        id: randomUUID(),
        title: '投资组合分析',
        description: '当前系统繁忙，请稍后重试获取详细的投资洞察。',
        confidence: 100,
        type: 'suggestion',
        timestamp: new Date(),
      },
    ];
  }
}
