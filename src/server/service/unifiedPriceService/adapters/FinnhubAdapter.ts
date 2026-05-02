import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import type { QuoteRequest, QuoteResponse } from '@server/service/unifiedPriceService/types';
import { PriceSourceAdapter } from './PriceSourceAdapter';
import { finnhubClient, isFinnhubApiKeySet } from '@server/dataflows/finnhubUtil';
import settingService from '@server/service/settingService';
import accountService from '@server/service/accountService';

/**
 * Finnhub 数据源适配器
 *
 * 支持 US 市场的资产价格获取。
 * 不支持批量查询，使用循环调用单个接口。
 *
 * API Key 获取优先级：
 * 1. 用户 setting 配置 (FINNHUB_API_KEY) - 按账户区分
 * 2. 环境变量 FINNHUB_API_KEY (兜底)
 */
export class FinnhubAdapter extends PriceSourceAdapter {
  name = 'finnhub';
  supportedMarkets: MarketType[] = ['US'];
  supportsBatch = false;

  /**
   * 动态获取 Finnhub API Key
   * 优先级：用户 setting > 环境变量
   *
   * @param accountId 账户 ID，用于获取用户 setting
   * @returns API Key 或 null
   */
  private async getApiKey(accountId?: string): Promise<string | null> {
    // 优先从用户 setting 获取
    if (accountId) {
      try {
        const account = await accountService.getTradingAccount(accountId);
        if (account) {
          const userId = account.userId.toString();
          const setting = await settingService.getSettingByKey(userId, 'FINNHUB_API_KEY');
          if (setting?.value) {
            logger.debug(`[FinnhubAdapter] Using FINNHUB_API_KEY from user setting`);
            return setting.value;
          }
        }
      } catch (error) {
        logger.warn(`[FinnhubAdapter] Failed to get API key from setting:`, error);
      }
    }

    // 兜底：环境变量
    if (isFinnhubApiKeySet()) {
      logger.debug(`[FinnhubAdapter] Using FINNHUB_API_KEY from environment variable`);
      return process.env.FINNHUB_API_KEY!;
    }

    return null;
  }

  /**
   * 配置 Finnhub 客户端的 API Key
   *
   * @param apiKey API Key
   */
  private configureClient(apiKey: string): void {
    const apiKeyAuth = finnhubClient.apiClient.authentications['api_key'] as { apiKey: string };
    apiKeyAuth.apiKey = apiKey;
  }

  async fetchQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    const { symbol, market, accountId } = request;

    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      logger.warn('[FinnhubAdapter] FINNHUB_API_KEY not configured (no setting or env var)');
      return null;
    }

    // 动态配置客户端
    this.configureClient(apiKey);

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
        price: result.price,
        currency: 'USD',
        timestamp: new Date(),
        source: 'finnhub',
        cached: false,
        dayChangePercent: result.dayChangePercent,
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
  private async callFinnhubQuote(
    symbol: string,
    retries: number = 3,
  ): Promise<{ price: number; dayChangePercent: number } | null> {
    for (let i = 0; i < retries; i++) {
      try {
        return await new Promise((resolve) => {
          finnhubClient.quote(
            symbol,
            (error: unknown, data: { c: number; dp: number }) => {
              if (error) {
                logger.error(
                  `[FinnhubAdapter] Finnhub API error for ${symbol} (attempt ${i + 1}/${retries}). Code: ${(error as any).code}, Message: ${(error as any).message}`,
                );
                resolve(null);
                return;
              }

              const c = data?.c ?? 0;
              if (!c) {
                resolve(null);
                return;
              }

              resolve({ price: c, dayChangePercent: data?.dp ?? 0 });
            },
          );
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

    logger.error(
      `[FinnhubAdapter] Failed to get price for ${symbol} after ${retries} attempts`,
    );
    return null;
  }

  async healthCheck(accountId?: string): Promise<boolean> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      return false;
    }

    // 配置客户端
    this.configureClient(apiKey);

    try {
      // 使用一个常见的股票代码进行健康检查
      const result = await this.callFinnhubQuote('AAPL');
      return result !== null;
    } catch {
      return false;
    }
  }
}
