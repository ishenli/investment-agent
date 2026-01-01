import logger from '@server/base/logger';
import { searchNews } from '@server/dataflows/finnhubUtil';
import dayjs from 'dayjs';
import { DynamicStructuredTool } from '@langchain/core/tools';
import z from 'zod';

const StockNewsParams = z.object({
  ticker: z.string().describe('股票标识或者公司名称'),
  start_date: z
    .string()
    .describe('开始日期')
    .default(dayjs().subtract(1, 'month').format('YYYY-MM-DD')),
  end_date: z.string().describe('结束日期').default(dayjs().format('YYYY-MM-DD')),
});

export const stockSearchNewsTool = new DynamicStructuredTool({
  name: '获取某个股票以及公司的新闻消息',
  description: '获取某个股票以及对应公司在最近市场上的最新消息，主要是公司的新闻、财报信息、产品信息等',
  schema: StockNewsParams,
  func: async (params: z.infer<typeof StockNewsParams>): Promise<string> => {
    const { start_date, end_date, ticker } = params;
    logger.info(`[stockSearchNewsTool]: ${ticker} ${start_date} ${end_date}`);
    const finnhub_news = await searchNews(`${ticker} ${start_date} ${end_date}`);
    return finnhub_news;
  },
});
