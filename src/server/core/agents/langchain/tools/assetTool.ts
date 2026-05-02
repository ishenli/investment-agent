import { tool as langchainTool } from '@langchain/core/tools';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import logger from '@server/base/logger';
import { searchAssetInfo } from '@server/dataflows/finnhubUtil';

/**
 *市资产信息查询参数 Schema
 */
const AssetInfoParams = z.object({
  query: z.string().describe('市场资产查询请求'),
});

/**
 *市资产信息查询核心逻辑
 */
async function executeAssetInfoQuery(query: string): Promise<string> {
  logger.info(`[searchAssetInfoTool]: ${query}`);
  try {
    const result = await searchAssetInfo(query);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[searchAssetInfoTool] query failed:`, error);
    return `资产信息查询失败: ${errorMsg}`;
  }
}

/**
 * LangChain规范的市场资产信息查询工具
 */
export const searchAssetInfoTool = langchainTool(
  async (params): Promise<string> => {
    const { query } = params as z.infer<typeof AssetInfoParams>;
    return executeAssetInfoQuery(query);
  },
  {
    name: 'searchAssetInfoTool',
    description:
      '查询市场资产信息，当前支持查询股票、基金、黄金。当询问资产价格的时候，必须使用此工具查询',
    schema: AssetInfoParams,
  },
);

/**
 * Claude Agent SDK规范的市场资产信息查询工具
 */
export const searchAssetInfoClaudeTool = claudeTool(
  'searchAssetInfoTool',
  '查询市场资产信息，当前支持查询股票、基金、黄金。当询问资产价格的时候，必须使用此工具查询',
  {
    query: z.string().describe('市场资产查询请求'),
  },
  async (args) => {
    try {
      const result = await executeAssetInfoQuery(args.query);
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
      logger.error(`[searchAssetInfoClaudeTool] failed:`, error);
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
