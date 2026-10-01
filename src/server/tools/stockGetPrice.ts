import logger from '@server/base/logger';
import { fetchStockPrice } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeStockPriceQuery(
  stockCode: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  try {
    return await fetchStockPrice(stockCode, startDate, endDate);
  } catch (error) {
    const err = error as Error;
    logger.error(`[StockGetPriceTool] ${err.message}`);
    return err.message;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const stockGetPriceClaudeTool = claudeTool(
  'stockGetPriceTool',
  '获取公司的股票价格信息',
  {
    stock_code: z.string(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    curr_date: z.string().optional(),
  },
  async (args) => {
    try {
      const result = await executeStockPriceQuery(
        args.stock_code,
        args.start_date,
        args.end_date,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error(`[stockGetPriceClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `股票价格查询失败: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const stockGetPriceSchema: TObject = Type.Object({
  stock_code: Type.String({ description: '股票代码，如 AAPL, 600519, 0700.HK' }),
  start_date: Type.Optional(Type.String({ description: '开始日期 (YYYY-MM-DD)，默认30天前' })),
  end_date: Type.Optional(Type.String({ description: '结束日期 (YYYY-MM-DD)，默认今天' })),
});

export const stockGetPriceHermesConfig: HermesToolConfig = {
  name: 'stock_get_price',
  description: '获取股票价格数据（支持美股、A股、港股）。根据代码自动识别市场。',
  schema: stockGetPriceSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeStockPriceQuery(
        String(args.stock_code),
        args.start_date ? String(args.start_date) : undefined,
        args.end_date ? String(args.end_date) : undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};