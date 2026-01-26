// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as finnhub from 'finnhub';
import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import type { QuoteRequest, QuoteResponse } from '@server/service/unifiedPriceService/types';
import { PriceSourceAdapter } from './PriceSourceAdapter';

/**
 * Finnhub API 配置
 */
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;

/**
 * Finnhub 客户端实例
 */
const finnhubClient = new finnhub.DefaultApi();

/**
 * Finnhub 数据源适配器
 *
 * 支持 US 和 CN 市场的资产价格获取。
 * 不支持批量查询，使用循环调用单个接口。
 */
export class FinnhubAdapter extends PriceSourceAdapter {
  name = 'finnhub';
  supportedMarkets: MarketType[] = ['US', 'CN'];
  supportsBatch = false;

  async fetchQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    const { symbol, market } = request;

    // 检查 API key
    if (!process.env.FINNHUB_API_KEY) {
      logger.warn('[FinnhubAdapter] FINNHUB_API_KEY not set');
      return null;
    }

    try {
      const result = await this.callFinnhubQuote(symbol);
      if (!result) {
        return null;
      }

      return {
        symbol,
        price: result,
        currency: 'USD',
        timestamp: new Date(),
        source: 'finnhub',
        cached: false,
      };
    } catch (error) {
      logger.error(`[FinnhubAdapter] Failed to get price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 调用 Finnhub quote API
   *
   * @param symbol 资产代码
   * @returns 价格，如果获取失败则返回 null
   */
  private callFinnhubQuote(symbol: string): Promise<number | null> {
    return new Promise((resolve) => {
      finnhubClient.quote(symbol, (error: unknown, data: { c: number }) => {
        if (error) {
          logger.error(`[FinnhubAdapter] Finnhub API error for ${symbol}`, error);
          resolve(null);
          return;
        }

        const c = data?.c ?? 0;
        if (!c) {
          resolve(null);
          return;
        }

        resolve(c);
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!process.env.FINNHUB_API_KEY) {
      return false;
    }

    try {
      // 使用一个常见的股票代码进行健康检查
      const result = await this.callFinnhubQuote('AAPL');
      return result !== null;
    } catch {
      return false;
    }
  }
}