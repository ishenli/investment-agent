import logger, { Logger } from '@server/base/logger';
import { getStockData } from '@server/service/stockDataService';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';
import type { MarketType } from '@typings/asset';

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
 *据股票代码识别市场类型
 */
const getMarketType = (ticker: string): MarketType => {
  const tickerStr = ticker.toString().toUpperCase();

  // Check if it's a Hong Kong stock
  if (tickerStr.includes('.HK') || tickerStr.includes('.hk')) {
    return 'HK';
  }

  // Check if it's a China stock (6-digit number)
  if (/^\d{6}$/.test(tickerStr)) {
    return 'CN';
  }

  // Default to US stock
  return 'US';
};

/**
 *票价格查询核心逻辑
 */
async function executeStockPriceQuery(
  params: z.infer<typeof StockMarketDataParams>,
  loggerInstance: Logger = logger
): Promise<string> {
  const { stock_code, start_date, end_date, curr_date } = params;
  const log = loggerInstance;

  log.info(
    `[StockMarketDataUnifiedTool]调用统一市场数据工具，参数: ${JSON.stringify(params)}`,
  );

  try {
    // 自动识别市场类型
    const market = getMarketType(stock_code);

    // 设置默认日期
    const currentDate = curr_date || new Date().toISOString().split('T')[0];
    const startDate =
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || currentDate;

    // 使用 StockDataService 获取数据
    const data = await getStockData(
      stock_code,
      startDate,
      endDate,
      market,
      log,
    );

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMsg = `统一市场数据工具执行失败: ${err.message}`;
    log.error(`[StockMarketDataUnifiedTool] ${errorMsg}`, error);
    return errorMsg;
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
