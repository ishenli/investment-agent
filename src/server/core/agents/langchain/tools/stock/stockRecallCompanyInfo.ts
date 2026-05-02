import logger from '@server/base/logger';
import { fetchStockCompanyInfo } from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 * 资产代号参数 Schema
 */
const AssetSymbolParams = z.object({
  symbol: z.string().describe('资产代号、可能是公司名称、股票、ETF等'),
});

/**
 * 公司信息查询核心逻辑
 */
async function executeCompanyInfoQuery(symbol: string): Promise<string> {
  try {
    return await fetchStockCompanyInfo(symbol);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[recallCompanyInfoTool] query failed:`, error);
    return `公司信息查询失败: ${errorMsg}`;
  }
}

/**
 * LangChain规范的公司信息查询工具
 */
export const stockRecallCompanyInfoTool = langchainTool(
  async (params): Promise<string> => {
    const { symbol } = params as z.infer<typeof AssetSymbolParams>;
    return executeCompanyInfoQuery(symbol);
  },
  {
    name: 'stockRecallCompanyInfoTool',
    description:
      '查询知识库中关于记录的股票或者公司财务信息、管理层人员信息、每个季度的财报历史等使用此工具',
    schema: AssetSymbolParams,
  },
);

/**
 * Claude Agent SDK规范的公司信息查询工具
 */
export const stockRecallCompanyInfoClaudeTool = claudeTool(
  'stockRecallCompanyInfoTool',
  '查询知识库中关于记录的股票或者公司财务信息、管理层人员信息、每个季度的财报历史等使用此工具',
  {
    symbol: z.string().describe('资产代号、可能是公司名称、股票、ETF等'),
  },
  async (args) => {
    try {
      const result = await executeCompanyInfoQuery(args.symbol);
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
      logger.error(`[stockRecallCompanyInfoClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `公司信息查询失败: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
