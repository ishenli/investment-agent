import logger from '@server/base/logger';
import { fetchStockCompanyInfo } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeCompanyInfoQuery(symbol: string): Promise<string> {
  try {
    return await fetchStockCompanyInfo(symbol);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[StockCompanyInfoTool] query failed:`, error);
    return `公司信息查询失败: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const stockRecallCompanyInfoClaudeTool = claudeTool(
  'stockRecallCompanyInfoTool',
  '查询知识库中关于记录的股票或者公司财务信息、管理层人员信息、每个季度的财报历史等使用此工具',
  {
    symbol: z.string().describe('资产代号、可能是公司名称、股票、ETF等'),
  },
  async (args) => {
    try {
      const result = await executeCompanyInfoQuery(args.symbol);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[stockRecallCompanyInfoClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `公司信息查询失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const stockCompanyInfoSchema: TObject = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

export const stockCompanyInfoHermesConfig: HermesToolConfig = {
  name: 'stock_company_info',
  description: '查询公司基本信息（行业、市值、简介等）',
  schema: stockCompanyInfoSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeCompanyInfoQuery(String(args.symbol));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};