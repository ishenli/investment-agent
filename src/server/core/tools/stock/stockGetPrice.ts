import logger, { Logger } from "@server/base/logger";
import { getUsStockDataCached } from "@server/dataflows/optimizedUsData";
import { getHkStockDataCached } from "@server/dataflows/optimizedHkData";
import finnhubService from "@server/service/finnhubService";
import { StructuredTool, tool } from "langchain";
import z from "zod";

const StockMarketDataParams = z.object({
  stock_code: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  curr_date: z.string().optional(),
});

interface MarketInfo {
  is_china: boolean;
  is_hk: boolean;
  is_us: boolean;
  market_name: string;
  currency_name: string;
  currency_symbol: string;
}

const getMarketInfo = (ticker: string): MarketInfo => {
  // This is a simplified implementation - in a real scenario, this would be more complex
  const tickerStr = ticker.toString().toUpperCase();



  // Check if it's a Hong Kong stock
  if (tickerStr.includes('.HK') || tickerStr.includes('.hk')) {
    return {
      is_china: false,
      is_hk: true,
      is_us: false,
      market_name: '港股',
      currency_name: '港币',
      currency_symbol: 'HK$',
    };
  }

  // Assume it's a US stock otherwise
  return {
    is_china: false,
    is_hk: false,
    is_us: true,
    market_name: '美股',
    currency_name: '美元',
    currency_symbol: '$',
  };
};



// Local helper for China removed.
// Local helper for HK removed. replaced by cached provider.

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
    logger.info(`[StockMarketDataUnifiedTool]调用统一市场数据工具，参数: ${JSON.stringify(params)}`);
    try {
      // 自动识别股票类型
      const marketInfo = getMarketInfo(stock_code);
      const { is_china, is_hk, market_name, currency_name, currency_symbol } = marketInfo;

      // 设置默认日期
      const currentDate = curr_date || new Date().toISOString().split('T')[0];
      const startDate =
        start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = end_date || currentDate;

      const resultData: string[] = [];

      if (is_hk) {
        // 港股
        try {
          const hkData = await getHkStockDataCached(stock_code, startDate, endDate, false, this.logger);
          resultData.push(hkData);
        } catch (e) {
          const error = e as Error;
          resultData.push(`## 港股数据获取失败: ${error.message}`);
        }
      } else {
        // 美股 & 其他
        try {
          const usData = await getUsStockDataCached(
            stock_code,
            startDate,
            endDate,
            false,
            this.logger,
          );
          resultData.push(usData);
        } catch (e) {
          const error = e as Error;
          resultData.push(`## 美股数据获取失败: ${error.message}`);
        }
      }

      // 组合所有数据
      // Since specific providers now return full markdown with headers, we just join them.
      const combinedResult = resultData.join('\n\n');

      return combinedResult;
    } catch (e) {
      const error = e as Error;
      const errorMsg = `统一市场数据工具执行失败: ${error.message}`;
      return errorMsg;
    }
  }
}

export const stockGetPriceTool = tool(async (params) => {
  const toolInstance = new StockMarketDataUnifiedTool(logger);
  const result = toolInstance.invoke(params);
  return result;
}, {
  name: 'stockGetPriceTool',
  description: '获取公司的股票价格信息',
  schema: StockMarketDataParams,
})
