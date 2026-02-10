import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import type { QuoteRequest, QuoteResponse } from '@server/service/unifiedPriceService/types';
import { PriceSourceAdapter } from './PriceSourceAdapter';
import { finnhubClient, isFinnhubApiKeySet } from '@server/dataflows/finnhubUtil';

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

    if (!isFinnhubApiKeySet()) {
      logger.warn('[FinnhubAdapter] FINNHUB_API_KEY not set');
      return null;
    }

    if (!this.supportedMarkets.includes(market)) {
      logger.warn(`[FinnhubAdapter] Market ${market} not supported`);
      return null;
    }

    logger.info(`[FinnhubAdapter] Fetching price for ${symbol} (${market})`);

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
  private async callFinnhubQuote(symbol: string, retries: number = 3): Promise<number | null> {
    for (let i = 0; i < retries; i++) {
      try {
        return await new Promise((resolve) => {
          finnhubClient.quote(symbol, (error: unknown, data: { c: number }) => {
            if (error) {
              logger.error(
                `[FinnhubAdapter] Finnhub API error for ${symbol} (attempt ${i + 1}/${retries}). Code: ${(error as any).code}, Message: ${(error as any).message}`,
                error,
              );
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
      } catch (error) {
        logger.error(
          `[FinnhubAdapter] Error calling Finnhub API for ${symbol} (attempt ${i + 1}/${retries}):`,
          error,
        );

        // 如果不是最后一次尝试，等待一段时间后重试
        if (i < retries - 1) {
          const delay = Math.pow(2, i) * 1000; // 指数退避：1s, 2s, 4s...
          logger.info(`[FinnhubAdapter] Retrying ${symbol} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`[FinnhubAdapter] Failed to get price for ${symbol} after ${retries} attempts`);
    return null;
  }

  async healthCheck(): Promise<boolean> {
    if (!isFinnhubApiKeySet()) {
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
