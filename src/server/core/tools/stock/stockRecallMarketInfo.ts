import logger from '@server/base/logger';
import assetMarketInfoService from '@server/service/assetMarketInfoService';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 *资产代号参数 Schema
 */
const AssetSymbolParams = z.object({
  symbol: z.string().describe('资产代号、可能是股票、ETF等'),
});

/**
 *资市场信息查询核心逻辑
 */
async function executeMarketInfoQuery(symbol: string): Promise<string> {
  logger.info(`[recallAssetMarketInfoTool]: ${symbol}`);
  try {
    const result = await assetMarketInfoService.getLatestAssetMarketInfoBySymbol(symbol);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[recallAssetMarketInfoTool] query failed:`, error);
    return `资产信息查询失败: ${errorMsg}`;
  }
}

/**
 * LangChain规范的资产市场信息查询工具
 */
export const stockRecallMarketInfoTool = langchainTool(
  async (params): Promise<string> => {
    const { symbol } = params as z.infer<typeof AssetSymbolParams>;
    return executeMarketInfoQuery(symbol);
  },
  {
    name: 'stockRecallMarketInfoTool',
    description: '查询个人知识库中记录的市场股票评级、市场财报分析、市场的投资笔记等使用此工具',
    schema: AssetSymbolParams,
  },
);

/**
 * Claude Agent SDK 规范的资产市场信息查询工具
 */
export const stockRecallMarketInfoClaudeTool = claudeTool(
  'stockRecallMarketInfoTool',
  '查询个人知识库中记录的市场股票评级、市场财报分析、市场的投资笔记等使用此工具',
  {
    symbol: z.string().describe('资产代号、可能是股票、ETF等'),
  },
  async (args) => {
    try {
      const result = await executeMarketInfoQuery(args.symbol);
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[stockRecallMarketInfoClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `资产信息查询失败: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
