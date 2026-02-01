import logger, { Logger } from '@server/base/logger';
import { getStockData } from '@server/service/stockDataService';
import { StructuredTool, tool } from 'langchain';
import z from 'zod';
import type { MarketType } from '@typings/asset';

const StockMarketDataParams = z.object({
  stock_code: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  curr_date: z.string().optional(),
});

/**
 * 根据股票代码识别市场类型
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
 * 统一的股票市场数据获取工具
 *
 * 使用 StockDataService 提供统一的 API 来获取实时报价和历史行情数据
 */
export class StockMarketDataUnifiedTool extends StructuredTool {
  schema = StockMarketDataParams;
  name = 'get_stock_market_data_unified';
  description = '统一的股票市场数据获取工具，自动识别股票类型（A股、港股、美股）并调用相应的数据源';
  logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async _call(params: z.infer<typeof StockMarketDataParams>): Promise<string> {
    const { stock_code, start_date, end_date, curr_date } = params;
    const logger = this.logger;

    logger.info(
      `[StockMarketDataUnifiedTool] 调用统一市场数据工具，参数: ${JSON.stringify(params)}`,
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
        logger,
      );

      return data;
    } catch (error) {
      const err = error as Error;
      const errorMsg = `统一市场数据工具执行失败: ${err.message}`;
      logger.error(`[StockMarketDataUnifiedTool] ${errorMsg}`, error);
      return errorMsg;
    }
  }
}

export const stockGetPriceTool = tool(
  async (params) => {
    const toolInstance = new StockMarketDataUnifiedTool(logger);
    const result = await toolInstance.invoke(params);
    return result;
  },
  {
    name: 'stockGetPriceTool',
    description: '获取公司的股票价格信息',
    schema: StockMarketDataParams,
  },
);
