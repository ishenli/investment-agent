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
      const { portfolioAnalysis, riskAssessment, opportunities, positions, portfolio } = state;

      // 获取时间相关信息
      const now = new Date();
      const nowStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

      // 计算数据新鲜度
      const dataFreshnessMap = calculateDataFreshness(positions);
      const dataFreshnessInfo = Object.entries(dataFreshnessMap)
        .map(([symbol, info]) => `${symbol}: ${info.label} (${info.agoText})`)
        .join('\n');

      const prompt = `基于以下分析，生成3-5个具体的AI投资洞察：

**重要时间信息：**
- 当前分析时间：${nowStr}
- 数据时效性分析：
${dataFreshnessInfo}

**投资组合分析：**
${portfolioAnalysis}

**风险评估：**
${riskAssessment}

**投资机会：**
${opportunities}

**置信度评分标准：**
- 95%：基于最新实时数据（30分钟内），明确的市场信号，趋势清晰
- 90%：基于近期实时数据（2小时内），较强趋势，信号较明确
- 85%：基于当日数据，趋势明确但存在一定不确定性
- 80%：基于近3日数据，有参考价值但需谨慎
- 75%：基于近一周数据，存在明显滞后风险，仅供参考
- 70%：基于较旧数据，仅作为观察视角

**置信度调整规则：**
- 日内交易操作类建议，若数据非实时（>1小时），需扣减5-10%置信度
- 基本面分析建议，可用周级数据，置信度保持
- 长期配置建议，可用月级数据，置信度保持

请生成以下类型的洞察：
1. 风险警告（1-2个）
2. 投资机会（1-2个）
3. 优化建议（1-2个）

每个洞察需要包含：
- title（简洁明了）
- description（具体详细）
- confidence（70-95%，严格按照上述标准）
- type（risk/opportunity/suggestion）
- relatedAssets（相关股票代码数组）
- confidenceReason（说明具体给出此置信度的原因，如"基于最新实时数据，技术指标显示明显突破"）
- dataFreshness（realtime/near-realtime/daily/historical）
- requiresConfirmation（true/false：是否需要用户在执行前二次确认价格/市场状态）

请用JSON格式返回，格式如下：
{
  "insights": [
    {
      "title": "xxx",
      "description": "xxx",
      "confidence": 85,
      "type": "risk",
      "relatedAssets": ["AAPL", "GOOGL"],
      "confidenceReason": "基于2小时前的实时数据，技术面显示上行趋势明确",
      "dataFreshness": "near-realtime",
      "requiresConfirmation": true
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
          const insights: AIInsight[] = data.insights.map((insight: any) => {
            // 获取相关股票的最后更新时间
            const lastDataUpdate = getLatestDataUpdate(insight.relatedAssets || [], positions);

            return {
              id: randomUUID(),
              title: insight.title,
              description: insight.description,
              confidence: insight.confidence,
              type: insight.type,
              timestamp: new Date(),
              metadata: {
                relatedAssets: insight.relatedAssets || [],
                confidenceReason: insight.confidenceReason,
                dataFreshness: insight.dataFreshness,
                lastDataUpdate: lastDataUpdate,
              },
            };
          });
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

// 数据新鲜度计算辅助函数
interface DataFreshnessInfo {
  label: string;
  agoText: string;
}

function calculateDataFreshness(positions: PositionAsset[]): Record<string, DataFreshnessInfo> {
  const now = new Date();
  const result: Record<string, DataFreshnessInfo> = {};

  for (const position of positions) {
    const lastUpdated = new Date(position.lastUpdated);
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let label: string;
    let agoText: string;

    if (diffMinutes < 30) {
      label = '实时';
      agoText = '30分钟内更新';
    } else if (diffMinutes < 60) {
      label = '近实时';
      agoText = '1小时前更新';
    } else if (diffHours < 2) {
      label = '近实时';
      agoText = '2小时前更新';
    } else if (diffHours < 24) {
      label = '当日数据';
      agoText = `${Math.floor(diffHours)}小时前更新`;
    } else if (diffDays <= 3) {
      label = '近几日';
      agoText = `${Math.floor(diffDays)}天前更新`;
    } else {
      label = '历史数据';
      agoText = `${Math.floor(diffDays)}天前更新`;
    }

    result[position.symbol] = { label, agoText };
  }

  return result;
}

// 获取相关股票的最新数据更新时间
function getLatestDataUpdate(relatedAssets: string[], positions: PositionAsset[]): Date {
  if (!relatedAssets || relatedAssets.length === 0) {
    return new Date();
  }

  const updates = relatedAssets
    .map(symbol => {
      const position = positions.find(p => p.symbol === symbol);
      return position ? new Date(position.lastUpdated) : new Date();
    })
    .sort((a, b) => b.getTime() - a.getTime());

  return updates.length > 0 ? updates[0] : new Date();
}
