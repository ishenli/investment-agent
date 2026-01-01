import { SSEEmitter } from '@server/base/sseEmitter';
import { InvestmentAdvisorGraph } from '@server/core/graph/investmentAdvisorGraph';
import { MarketInformationGraph } from '@server/core/graph/marketInformationGraph';
import { ScenarioAnalyzerGraph } from '@server/core/graph/scenarioAnalyzerGraph';
import { DiversificationGraph } from '@server/core/graph/diversificationGraph';
import { AIInsightsGraph } from '@server/core/graph/aiInsightsGraph';
import { AuthService } from '@server/service/authService';
import { defaultConfig } from '@shared/config/config.default';
import logger from '@server/base/logger';
import portfolioAnalysisService from '@server/service/portfolioAnalysisService';
import type { Logger } from '@server/base/logger';
import type { PositionAsset, Portfolio } from '@renderer/store/position/types';
import { chatModelOpenAI, ModelMap, ModelNameType } from '@server/core/provider/chatModel';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';

// 定义支持的 Graph 类型
export type GraphType =
  | 'investment_advisor'
  | 'market_information'
  | 'scenario_analyzer'
  | 'diversification'
  | 'ai_insights'
  | 'default';

// 定义聊天请求参数
export interface ChatRequest {
  messages?: BaseMessage[];
  query: string;
  agentId: GraphType;
  model?: ModelNameType;
  accountId?: string;
  // 额外参数，根据不同 Graph 类型可能需要不同的参数
  extraParams?: Record<string, any>;
}

// 定义场景分析参数
export interface ScenarioParams {
  asset: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
}

/**
 * 聊天服务类
 * 负责调用不同的 langgraph 实例进行对话，并支持流式结果输出
 */
export class ChatService {
  private logger: Logger;

  constructor() {
    this.logger = logger;
  }

  /**
   * 主要的聊天方法，根据指定的 Graph 类型调用相应的 langgraph 实例
   * @param request 聊天请求参数
   * @param emitter SSEEmitter 实例，用于流式输出
   */
  async chat(request: ChatRequest, emitter: SSEEmitter): Promise<void> {
    try {
      this.logger.info(`[ChatService] 开始处理聊天请求: ${request.query}, Graph类型: ${request.agentId}`);
      
      // 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();

      if (!accountInfo) {
        throw new Error('获取账户信息失败');
      }

      const accountId = accountInfo.id
      
      switch (request.agentId) {
        case 'investment_advisor':
          await this.handleInvestmentAdvisorChat(request, emitter, accountId);
          break;
          
        case 'market_information':
          await this.handleMarketInformationChat(request, emitter);
          break;
          
        case 'scenario_analyzer':
          await this.handleScenarioAnalyzerChat(request, emitter, accountId);
          break;
          
        case 'diversification':
          await this.handleDiversificationChat(request, emitter, accountId);
          break;
          
        case 'ai_insights':
          await this.handleAIInsightsChat(request, emitter, accountId);
          break;
          
        default:
            await this.handleDefaultChat(request, emitter);

      }
    } catch (error) {
      this.logger.error(`[ChatService] 处理聊天请求时发生错误:`, error);
      emitter.sendError(error instanceof Error ? error.message : '未知错误');
    } finally {
      emitter.close();
    }
  }

  /**
   * 处理投资顾问聊天请求
   */
  private async handleInvestmentAdvisorChat(
    request: ChatRequest,
    emitter: SSEEmitter,
    accountId: string
  ): Promise<void> {
    try {
      // 创建投资顾问图实例
      const investmentAdvisorGraph = new InvestmentAdvisorGraph({
        logger: this.logger,
        config: defaultConfig,
        emitter,
        modelCode: request.model || 'default',
      });

      // 使用投资顾问图处理用户查询
      const graph = investmentAdvisorGraph.setupInvestmentAdvisorGraph();

      // 初始化状态 - 使用个性化初始状态
      const initialState = await investmentAdvisorGraph.createPersonalizedInitialState(
        accountId,
        request.query,
      );

      // 执行图
      await graph.invoke(initialState);
    } catch (error) {
      this.logger.error('[ChatService] 投资顾问聊天处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理市场信息聊天请求
   */
  private async handleMarketInformationChat(
    request: ChatRequest,
    emitter: SSEEmitter,
  ): Promise<void> {
    try {
      // 创建市场信息图实例
      const marketInfoGraph = new MarketInformationGraph({
        logger: this.logger,
        modelCode: request.model || 'Kimi-K2-Instruct',
      });

      // 设置图
      await marketInfoGraph.setup();

      // 创建初始状态
      const initialState = marketInfoGraph.createInitialState(request.query);

      // 编译图
      const graph = marketInfoGraph.setupMarketInformationGraph();

      // 执行图
      const result = await graph.invoke(initialState);
      
      // 发送结果
      await emitter.sendOpenAICompatibleMessage({
        id: 'market_info_result',
        type: 'text',
        content: result.marketAnalysis,
      });

    } catch (error) {
      this.logger.error('[ChatService] 市场信息聊天处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理场景分析聊天请求
   */
  private async handleScenarioAnalyzerChat(
    request: ChatRequest,
    emitter: SSEEmitter,
    accountId: string
  ): Promise<void> {
    try {
      // 获取投资组合数据
      const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
      
      // 创建场景分析图实例
      const scenarioGraph = new ScenarioAnalyzerGraph();
      
      // 获取场景参数
      const scenarioParams = request.extraParams?.scenario as ScenarioParams | undefined;
      if (!scenarioParams) {
        throw new Error('场景分析需要提供场景参数');
      }
      
      // 转换持仓数据格式
      const positionAssets: PositionAsset[] = portfolioAnalysis.holdingsSummary.map(pos => ({
        id: pos.id,
        symbol: pos.symbol,
        name: pos.chineseName || pos.symbol,
        quantity: pos.quantity,
        liquidityScore: 80, // 默认值
        averageCost: pos.averageCost,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercentage: pos.averageCost > 0 ?
          ((pos.currentPrice - pos.averageCost) / pos.averageCost) * 100 : 0,
        weight: pos.positionRatio || 0,
        lastUpdated: new Date(),
      }));
      
      // 创建完整的 Portfolio 对象
      const portfolio: Portfolio = {
        id: 'portfolio-' + accountId,
        userId: accountId,
        totalValue: portfolioAnalysis.portfolioMetrics.totalAssetsValue,
        totalNonCashValue: portfolioAnalysis.portfolioMetrics.totalMarketValue,
        cashValue: portfolioAnalysis.cashAsset.amount,
        concentrationRiskScore: 0, // 默认值
        correlationRiskScore: 0, // 默认值
        liquidityRiskScore: 0, // 默认값
        allocationRiskScore: 0, // 默认값
        overallRiskScore: 0, // 默认값
        riskLevel: 'medium', // 默认值
        lastUpdated: new Date(),
        riskMode: 'retail', // 默认값
      };
      
      // 执行分析
      const result = await scenarioGraph.analyzeScenario(
        positionAssets,
        portfolio,
        scenarioParams
      );
      
      // 发送结果
      await emitter.send({
        type: 'scenario_analysis_result',
        data: result,
      });
    } catch (error) {
      this.logger.error('[ChatService] 场景分析聊天处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理分散投资聊天请求
   */
  private async handleDiversificationChat(
    request: ChatRequest,
    emitter: SSEEmitter,
    accountId: string
  ): Promise<void> {
    try {
      // 获取投资组合数据
      const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
      
      // 创建分散投资图实例
      const diversificationGraph = new DiversificationGraph();
      
      // 转换持仓数据格式
      const positionAssets: PositionAsset[] = portfolioAnalysis.holdingsSummary.map(pos => ({
        id: pos.id,
        symbol: pos.symbol,
        name: pos.chineseName || pos.symbol,
        quantity: pos.quantity,
        liquidityScore: 80, // 默认值
        averageCost: pos.averageCost,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercentage: pos.averageCost > 0 ?
          ((pos.currentPrice - pos.averageCost) / pos.averageCost) * 100 : 0,
        weight: pos.positionRatio || 0,
        lastUpdated: new Date(),
      }));
      
      // 创建完整的 Portfolio 对象
      const portfolio: Portfolio = {
        id: 'portfolio-' + accountId,
        userId: accountId,
        totalValue: portfolioAnalysis.portfolioMetrics.totalAssetsValue,
        totalNonCashValue: portfolioAnalysis.portfolioMetrics.totalMarketValue,
        cashValue: portfolioAnalysis.cashAsset.amount,
        concentrationRiskScore: 0, // 默认值
        correlationRiskScore: 0, // 默认값
        liquidityRiskScore: 0, // 默认값
        allocationRiskScore: 0, // 默认값
        overallRiskScore: 0, // 默认값
        riskLevel: 'medium', // 默认값
        lastUpdated: new Date(),
        riskMode: 'retail', // 默认값
      };
      
      // 生成推荐
      const recommendations = await diversificationGraph.generateRecommendations(
        positionAssets,
        portfolio
      );
      
      // 发送结果
      await emitter.send({
        type: 'diversification_result',
        data: recommendations,
      });
    } catch (error) {
      this.logger.error('[ChatService] 分散投资聊天处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理AI洞察聊天请求
   */
  private async handleAIInsightsChat(
    request: ChatRequest,
    emitter: SSEEmitter,
    accountId: string
  ): Promise<void> {
    try {
      // 获取投资组合数据
      const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
      
      // 创建AI洞察图实例
      const aiInsightsGraph = new AIInsightsGraph();
      
      // 转换持仓数据格式
      const positionAssets: PositionAsset[] = portfolioAnalysis.holdingsSummary.map(pos => ({
        id: pos.id,
        symbol: pos.symbol,
        name: pos.chineseName || pos.symbol,
        quantity: pos.quantity,
        liquidityScore: 80, // 默认值
        averageCost: pos.averageCost,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercentage: pos.averageCost > 0 ?
          ((pos.currentPrice - pos.averageCost) / pos.averageCost) * 100 : 0,
        weight: pos.positionRatio || 0,
        lastUpdated: new Date(),
      }));
      
      // 创建完整的 Portfolio 对象
      const portfolio: Portfolio = {
        id: 'portfolio-' + accountId,
        userId: accountId,
        totalValue: portfolioAnalysis.portfolioMetrics.totalAssetsValue,
        totalNonCashValue: portfolioAnalysis.portfolioMetrics.totalMarketValue,
        cashValue: portfolioAnalysis.cashAsset.amount,
        concentrationRiskScore: 0, // 默认值
        correlationRiskScore: 0, // 默认값
        liquidityRiskScore: 0, // 默认값
        allocationRiskScore: 0, // 默认값
        overallRiskScore: 0, // 默认값
        riskLevel: 'medium', // 默认값
        lastUpdated: new Date(),
        riskMode: 'retail', // 默认값
      };
      
      // 生成洞察
      const insights = await aiInsightsGraph.generateInsights(
        positionAssets,
        portfolio
      );
      
      // 发送结果
      await emitter.send({
        type: 'ai_insights_result',
        data: insights,
      });
    } catch (error) {
      this.logger.error('[ChatService] AI洞察聊天处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理默认聊天请求，直接对接 LLM
   */
  private async handleDefaultChat(
    request: ChatRequest,
    emitter: SSEEmitter,
  ): Promise<void> {

    logger.info('[ChatService] 处理默认聊天请求: model=%s', request.model);
    try {
      // 初始化模型
      const llm = chatModelOpenAI(request.model);
      
      // 创建消息
      const messages = request.messages || [new HumanMessage(request.query)];
      
      // 调用模型获取响应
      const response = await llm.stream(messages);

      for await (const chunk of response) {
        await emitter.sendOpenAICompatibleMessage({
          id: 'default_llm_result',
          type: 'text',
          content: chunk.content.toString(),
        });
      }
    } catch (error) {
      this.logger.error('[ChatService] 默认聊天处理失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const chatService = new ChatService();

export default chatService;