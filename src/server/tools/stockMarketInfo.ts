import logger from '@server/base/logger';
import { fetchStockMarketInfo } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeMarketInfoQuery(symbol: string): Promise<string> {
  try {
    return await fetchStockMarketInfo(symbol);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[StockMarketInfoTool] query failed:`, error);
    return `资产信息查询失败: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const stockRecallMarketInfoClaudeTool = claudeTool(
  'stockRecallMarketInfoTool',
  '查询个人知识库中记录的市场股票评级、市场财报分析、市场的投资笔记等使用此工具',
  {
    symbol: z.string().describe('资产代号、可能是股票、ETF等'),
  },
  async (args) => {
    try {
      const result = await executeMarketInfoQuery(args.symbol);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[stockRecallMarketInfoClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `资产信息查询失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const stockMarketInfoSchema: TObject = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

export const stockMarketInfoHermesConfig: HermesToolConfig = {
  name: 'stock_market_info',
  description: '查询资产的市场分析信息（评级、财报分析、投资笔记）',
  schema: stockMarketInfoSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeMarketInfoQuery(String(args.symbol));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};