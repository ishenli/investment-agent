import logger from '@server/base/logger';
import { searchStockNews } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import dayjs from 'dayjs';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeNewsSearch(ticker: string, startDate?: string, endDate?: string): Promise<string> {
  const start = startDate ?? dayjs().subtract(1, 'month').format('YYYY-MM-DD');
  const end = endDate ?? dayjs().format('YYYY-MM-DD');
  logger.info(`[StockSearchNewsTool]: ${ticker} ${start} ${end}`);
  try {
    return await searchStockNews(ticker, start, end);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[StockSearchNewsTool] search failed:`, error);
    return `新闻查询失败: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const stockSearchNewsClaudeTool = claudeTool(
  'stockSearchNewsTool',
  '获取某个股票以及对应公司在最近市场上的最新消息，主要是公司的新闻、财报信息、产品信息等',
  {
    symbol: z.string().describe('资产代号（股票、ETF等）'),
  },
  async (args) => {
    try {
      const result = await executeNewsSearch(args.symbol);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[stockSearchNewsClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `新闻查询失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const stockNewsSchema: TObject = Type.Object({
  symbol: Type.String({ description: '资产代号（股票、ETF等）' }),
});

export const stockSearchNewsHermesConfig: HermesToolConfig = {
  name: 'stock_search_news',
  description: '搜索股票相关新闻和资讯',
  schema: stockNewsSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeNewsSearch(String(args.symbol));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};