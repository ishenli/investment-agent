/* eslint-disable @typescript-eslint/ban-ts-comment */
import { chatModelOpenAI } from '../../provider/chatModel';
import { ChatOpenAI } from '@langchain/openai';
import type { DefaultConfigType } from '@shared/config/config.default';
import type { Logger } from '@server/base/logger';
import { InvestmentChatStateAnnotation, type InvestmentChatState } from './investmentChatState';
import { create_invest_consult } from '../../agents/consult/invest_consult';
import { StateGraph, END, START } from '@langchain/langgraph';
import portfolioAnalysisService from '@server/service/portfolioAnalysisService';
import { SSEEmitter } from '@server/base/sseEmitter';
import { ChatCompletionChunk } from '@typings/openai/chat';

export type InvestmentAdvisorGraphOptionsType = {
  logger: Logger;
  config: Partial<DefaultConfigType>;
  emitter: SSEEmitter;
  modelCode?: string;
};

export class InvestmentAdvisorGraph {
  llm: ChatOpenAI;
  logger: Logger;
  emitter: SSEEmitter;
  investConsultNode: ReturnType<typeof create_invest_consult>;

  constructor(options: InvestmentAdvisorGraphOptionsType) {
    this.logger = options.logger;
    this.emitter = options.emitter;
    this.llm = chatModelOpenAI(options.modelCode as any);

    // 创建聊天代理节点
    this.investConsultNode = create_invest_consult(
      this.llm,
      this.logger,
      (data: ChatCompletionChunk) => {
        // this.emitter.sendAISdkMessage(data);
        this.emitter.send(data);
      },
    );
  }

  setupInvestmentAdvisorGraph() {
    const workflow = new StateGraph(InvestmentChatStateAnnotation);

    // 添加投资咨询对话节点
    workflow
      .addNode('chat_agent', this.investConsultNode)
      .addEdge(START, 'chat_agent')
      .addEdge('chat_agent', END);

    return workflow.compile();
  }

  /**
   * 扩展个性化逻辑 - 增强初始状态以包含用户上下文
   * @param accountId 账户ID
   * @returns 增强的初始状态
   */
  async createPersonalizedInitialState(
    accountId: string,
    userQuery: string,
  ): Promise<InvestmentChatState> {
    const portfolioAnalysis = await portfolioAnalysisService.getPortfolioAnalysis(accountId);
    const riskAnalysis = portfolioAnalysisService.calculateRiskScore(
      portfolioAnalysis.portfolioMetrics,
    );

    // 构建初始状态
    const initialState: InvestmentChatState = {
      userQuery,
      analysisStage: 'initial',
      context: {
        holdingsSummary: portfolioAnalysis.holdingsSummary,
        cashAsset: portfolioAnalysis.cashAsset,
        portfolioMetrics: portfolioAnalysis.portfolioMetrics,
        assetBreakdown: portfolioAnalysis.assetBreakdown,
        marketSentiment: {
          overall: 'neutral',
          sectors: {},
          newsSentiment: 0,
        },
      },
      marketAnalysis: '',
      riskAssessment: {
        riskLevel: riskAnalysis.level,
        riskScore: riskAnalysis.score,
        volatility: 0,
        maxDrawdown: 0,
        recommendations: riskAnalysis.recommendations,
      },
      specificRecommendation: [],
      followups: [],
      chatHistory: [],
      turnCount: 0,
      userIntent: 'general_inquiry',
      sidenotes: [],
    };

    this.logger.info(
      `[InvestmentAdvisorGraph] 创建个性化初始状态，用户持仓数量: ${portfolioAnalysis.holdingsSummary.length}, 现金余额: ${portfolioAnalysis.cashAsset.amount} ${portfolioAnalysis.cashAsset.currency}, 总资产: ${portfolioAnalysis.portfolioMetrics.totalAssetsValue}`,
    );
    return initialState;
  }
}
