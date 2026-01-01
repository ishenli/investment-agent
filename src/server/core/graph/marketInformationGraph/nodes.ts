import { ChatOpenAI } from '@langchain/openai';
import { createAgent, HumanMessage, SystemMessage } from 'langchain';
import type { Logger } from '@server/base/logger';
import { MarketInformationGraphState } from './state';
import { searchAssetInfoTool, stockGetPriceTool, stockSearchNewsTool } from '../../tools';
import { getAgentLastMessage } from '../../utils/messageUtils';

// 创建市场信息分析代理
export const createMarketInfoAnalyzer = (llm: ChatOpenAI, logger: Logger) => {
  // 创建工具列表
  // const tools = [getStockInfoTool, getFundInfoTool, getSectorInfoTool, getIndexInfoTool];
  const tools = [stockGetPriceTool, stockSearchNewsTool, searchAssetInfoTool];

  return async (state: typeof MarketInformationGraphState.State) => {
    logger.info('[MarketInfoAnalyzer] 开始分析市场信息');
    logger.info(`[MarketInfoAnalyzer] 用户问题: ${state.userQuery}`);

    try {
      // 构建系统提示词
      const systemPrompt = `你是一个专业的市场信息分析助手，专门负责分析股票、基金、板块和指数的相关信息。
      
你的任务是：
1. 理解用户的问题，识别他们想了解的资产类型（股票、基金、板块或指数）
2. 使用相应的工具获取所需信息
3. 提供清晰、结构化的分析结果

请严格按照以下规则操作：
- 当用户询问股票信息时，使用 stock 开头的 工具
- 当用户询问基金信息时，使用 getFundInfoTool 工具
- 当用户询问板块信息时，使用 getSectorInfoTool 工具
- 当用户询问指数信息时，使用 getIndexInfoTool 工具
- 以上工具不可用的时候，使用 searchAssetInfoTool 工具

请记住，你只能使用提供的工具来获取信息，不要编造数据。`;

      // 构建用户提示词
      const userPrompt = `请分析以下市场信息请求：

用户问题: ${state.userQuery}

请根据问题的类型使用相应的工具获取信息，并提供详细的分析。`;

      // 调用LLM进行分析
      const agent = createAgent({
        model: llm,
        tools,
      });
      const response = await agent.invoke({
        messages: [
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt),
        ],
      });

      logger.info('[MarketInfoAnalyzer] 分析完成');

      // 返回更新后的状态
      return {
        marketAnalysis: getAgentLastMessage(response.messages) as string,
      };
    } catch (error) {
      logger.error('[MarketInfoAnalyzer] 分析失败:', error);
      return {
        marketAnalysis: `市场信息分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  };
};