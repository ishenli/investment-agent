import logger, { Logger } from '@server/base/logger';
import { fetchStockPrice } from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 *票市场数据参数 Schema
 */
const StockMarketDataParams = z.object({
  stock_code: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  curr_date: z.string().optional(),
});

/**
 *股票价格查询核心逻辑
 */
async function executeStockPriceQuery(
  params: z.infer<typeof StockMarketDataParams>,
): Promise<string> {
  try {
    return await fetchStockPrice(params.stock_code, params.start_date, params.end_date);
  } catch (error) {
    const err = error as Error;
    logger.error(`[StockMarketDataUnifiedTool] ${err.message}`);
    return err.message;
  }
}

/**
 * LangChain规范的股票价格查询工具
 */
export const stockGetPriceTool = langchainTool(
  async (params): Promise<string> => {
    return executeStockPriceQuery(params as z.infer<typeof StockMarketDataParams>);
  },
  {
    name: 'stockGetPriceTool',
    description: '获取公司的股票价格信息',
    schema: StockMarketDataParams,
  },
);

/**
 * Claude Agent SDK规范的股票价格查询工具
 */
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
      const result = await executeStockPriceQuery(args);
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
      logger.error(`[stockGetPriceClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `股票价格查询失败: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
