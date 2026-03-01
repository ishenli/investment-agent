import logger from '@server/base/logger';
import { searchNews } from '@server/dataflows/finnhubUtil';
import dayjs from 'dayjs';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 *新闻查询参数 Schema
 */
const StockNewsParams = z.object({
  ticker: z.string().describe('股票标识或者公司名称'),
  start_date: z
    .string()
    .describe('开始日期')
    .default(dayjs().subtract(1, 'month').format('YYYY-MM-DD')),
  end_date: z.string().describe('结束日期').default(dayjs().format('YYYY-MM-DD')),
});

/**
 *新闻查询核心逻辑
 */
async function executeNewsSearch(params: z.infer<typeof StockNewsParams>): Promise<string> {
  const { start_date, end_date, ticker } = params;
  logger.info(`[stockSearchNewsTool]: ${ticker} ${start_date} ${end_date}`);
  try {
    const finnhub_news = await searchNews(`${ticker} ${start_date} ${end_date}`);
    return finnhub_news;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    logger.error(`[stockSearchNewsTool] search failed:`, error);
    return `新闻查询失败: ${errorMsg}`;
  }
}

/**
 * LangChain规范的股票新闻查询工具
 */
export const stockSearchNewsTool = langchainTool(
  async (params): Promise<string> => {
    return executeNewsSearch(params as z.infer<typeof StockNewsParams>);
  },
  {
    name: 'stockSearchNewsTool',
    description:
      '获取某个股票以及对应公司在最近市场上的最新消息，主要是公司的新闻、财报信息、产品信息等',
    schema: StockNewsParams,
  },
);

/**
 * Claude Agent SDK规范的股票新闻查询工具
 */
export const stockSearchNewsClaudeTool = claudeTool(
  'stockSearchNewsTool',
  '获取某个股票以及对应公司在最近市场上的最新消息，主要是公司的新闻、财报信息、产品信息等',
  {
    ticker: z.string().describe('股票标识或者公司名称'),
    start_date: z.string().describe('开始日期').default(dayjs().subtract(1, 'month').format('YYYY-MM-DD')),
    end_date: z.string().describe('结束日期').default(dayjs().format('YYYY-MM-DD')),
  },
  async (args) => {
    try {
      const result = await executeNewsSearch(args);
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
      logger.error(`[stockSearchNewsClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `新闻查询失败: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
