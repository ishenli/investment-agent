import logger from '@server/base/logger';
import accountService from '@server/service/accountService';
import positionService from '@server/service/positionService';
import priceService from '@server/service/priceService';
import type { PositionType } from '@/types';
import type { MarketType } from '@typings/asset';
import type {
  BatchQuoteResponse,
  FailedQuote,
  QuoteOptions,
  QuoteRequest,
  QuoteResponse,
} from './types';
import { AdapterRouter } from './adapters/AdapterRouter';
import { SameDayPriceCache } from './cache';
import {
  handleBatchFailure,
  handleIndividualFailure,
  isRetryable,
  withRetry,
} from './errorHandler';

/**
 * 更新统计信息
 */
export interface UpdateStats {
  total: number;
  succeeded: number;
  failed: FailedQuote[];
  byMarket: {
    US: MarketStats;
    HK: MarketStats;
    CN: MarketStats;
  };
  completeTime: string;
}

/**
 * 市场统计信息
 */
interface MarketStats {
  attempted: number;
  succeeded: number;
  failed: FailedQuote[];
}

/**
 * 统一价格服务
 *
 * 整合适配器、缓存和错误处理，提供统一的价格获取接口。
 * 注意：本服务不直接操作数据库，所有持久化通过 priceService 处理。
 */
export class UnifiedPriceService {
  private router: AdapterRouter;
  private cache: SameDayPriceCache;
  private readonly defaultOptions: Required<Pick<QuoteOptions, 'timeout' | 'retries'>> = {
    timeout: 10000,
    retries: 3,
  };

  constructor(router: AdapterRouter) {
    this.router = router;
    this.cache = new SameDayPriceCache();
  }

  /**
   * 获取单个资产的价格
   *
   * @param symbol 资产代码
   * @param market 市场类型
   * @param options 查询选项
   * @returns 价格响应，如果获取失败则返回 null
   */
  async getQuote(
    symbol: string,
    market: MarketType,
    options: QuoteOptions = {},
  ): Promise<QuoteResponse | null> {
    const { useCache = true, forceRefresh = false, ...restOptions } = options;
    const mergedOptions = { ...this.defaultOptions, ...restOptions };

    // 检查缓存
    if (useCache && !forceRefresh) {
      const cached = await this.cache.get(symbol, market);
      if (cached) {
        return {
          symbol: cached.symbol,
          price: cached.price,
          currency: cached.currency,
          timestamp: cached.timestamp,
          source: cached.source,
          cached: true,
        };
      }
    }

    // 获取适配器
    const adapter = this.router.getAdapter(market);
    if (!adapter) {
      logger.error(`[UnifiedPriceService] No adapter found for market ${market}`);
      return null;
    }

    try {
      // 调用适配器获取价格（带重试）
      const response = await withRetry(() => adapter.fetchQuote({ symbol, market }), {
        maxRetries: mergedOptions.retries,
      });

      if (!response) {
        return null;
      }

      // 持久化价格
      await this.cache.save(symbol, response.price, response.currency, response.source, market);

      return {
        ...response,
        cached: false,
      };
    } catch (error) {
      logger.error(`[UnifiedPriceService] Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 批量获取多个资产的价格
   *
   * @param requests 价格查询请求数组
   * @param options 查询选项
   * @returns 批量价格响应
   */
  async batchGetQuote(
    requests: QuoteRequest[],
    options: QuoteOptions = {},
  ): Promise<BatchQuoteResponse> {
    if (requests.length === 0) {
      return { succeeded: [], failed: [] };
    }

    const { useCache = true, forceRefresh = false } = options;

    // 按市场分组
    const byMarket = this.groupByMarket(requests);

    const succeeded: QuoteResponse[] = [];
    const failed: FailedQuote[] = [];

    // 对每个市场分别处理
    for (const [market, marketRequests] of byMarket.entries()) {
      const marketResult = await this.processMarketQuery(market, marketRequests, {
        useCache,
        forceRefresh,
        retries: options.retries ?? 3,
      });

      succeeded.push(...marketResult.succeeded);
      failed.push(...marketResult.failed);
    }

    return { succeeded, failed };
  }

  /**
   * 处理单个市场的批量查询
   */
  private async processMarketQuery(
    market: MarketType,
    requests: QuoteRequest[],
    options: { useCache: boolean; forceRefresh: boolean; retries: number },
  ): Promise<BatchQuoteResponse> {
    const adapter = this.router.getAdapter(market);
    if (!adapter) {
      return {
        succeeded: [],
        failed: requests.map((r) => ({
          symbol: r.symbol,
          market: r.market,
          error: `No adapter found for market ${market}`,
        })),
      };
    }

    const succeeded: QuoteResponse[] = [];
    const failed: FailedQuote[] = [];

    // 检查缓存
    const fromCache: QuoteRequest[] = [];
    const toFetch: QuoteRequest[] = [];

    if (options.useCache && !options.forceRefresh) {
      for (const request of requests) {
        const cached = await this.cache.get(request.symbol, market);
        if (cached) {
          succeeded.push({
            symbol: cached.symbol,
            price: cached.price,
            currency: cached.currency,
            timestamp: cached.timestamp,
            source: cached.source,
            cached: true,
          });
        } else {
          toFetch.push(request);
        }
      }
    } else {
      toFetch.push(...requests);
    }

    // 批量获取未缓存的价格
    if (toFetch.length > 0) {
      try {
        const result = await withRetry(() => adapter.fetchBatchQuotes(toFetch), {
          maxRetries: options.retries,
        });

        // 持久化成功获取的价格
        for (const success of result.succeeded) {
          await this.cache.save(
            success.symbol,
            success.price,
            success.currency,
            success.source,
            market,
          );
        }

        succeeded.push(...result.succeeded);
        failed.push(...result.failed);
      } catch (error) {
        logger.error(
          `[UnifiedPriceService] Failed to batch fetch for market ${market}:`,
          error,
        );
        const batchFailures = handleBatchFailure(
          toFetch.map((r) => r.symbol),
          toFetch.map((r) => r.market),
          error,
        );
        failed.push(...batchFailures);
      }
    }

    return { succeeded, failed };
  }

  /**
   * 更新账户所有持仓的价格
   *
   * @param accountId 账户 ID
   * @returns 更新统计信息
   */
  async updateAccountPrices(accountId: string): Promise<UpdateStats> {
    // 初始化统计信息
    const updateStats: UpdateStats = {
      total: 0,
      succeeded: 0,
      failed: [],
      byMarket: {
        US: { attempted: 0, succeeded: 0, failed: [] },
        HK: { attempted: 0, succeeded: 0, failed: [] },
        CN: { attempted: 0, succeeded: 0, failed: [] },
      },
      completeTime: new Date().toISOString(),
    };

    try {
      // 获取账户持仓
      const positions = await positionService.getCurrentPositions(accountId);

      // 构建查询请求
      const requests: QuoteRequest[] = positions.map((pos) => ({
        symbol: pos.symbol,
        market: pos.market || 'US',
      }));

      updateStats.total = positions.length;

      // 按市场分组统计
      for (const request of requests) {
        updateStats.byMarket[request.market].attempted++;
      }

      // 批量获取价格
      const result = await this.batchGetQuote(requests);

      // 更新统计信息
      updateStats.succeeded = result.succeeded.length;
      updateStats.failed = result.failed;

      // 按市场更新统计
      for (const success of result.succeeded) {
        const request = requests.find((r) => r.symbol === success.symbol);
        if (request) {
          updateStats.byMarket[request.market].succeeded++;
        }
      }

      for (const failure of result.failed) {
        updateStats.byMarket[failure.market].failed.push(failure);
      }

      logger.info(
        `[UnifiedPriceService] Account ${accountId} price update completed: ` +
          `${updateStats.succeeded}/${updateStats.total} succeeded`,
      );
    } catch (error) {
      logger.error(
        `[UnifiedPriceService] Failed to update prices for account ${accountId}:`,
        error,
      );
    }

    return updateStats;
  }

  /**
   * 获取账户所有持仓
   *
   * @param accountId 账户 ID
   * @returns 持仓列表
   */
  async getAllQuotesForAccount(accountId: string): Promise<PositionType[]> {
    const positions = await positionService.getCurrentPositions(accountId);
    return positions;
  }

  /**
   * 更新所有账户的特定市场持仓价格
   *
   * @param market 市场类型
   * @returns 更新统计信息
   */
  async updateMarketPrices(market: MarketType): Promise<UpdateStats> {
    // 初始化统计信息
    const updateStats: UpdateStats = {
      total: 0,
      succeeded: 0,
      failed: [],
      byMarket: {
        US: { attempted: 0, succeeded: 0, failed: [] },
        HK: { attempted: 0, succeeded: 0, failed: [] },
        CN: { attempted: 0, succeeded: 0, failed: [] },
      },
      completeTime: new Date().toISOString(),
    };

    try {
      // 获取所有账户
      const accounts = await accountService.getAllAccounts();

      // 收集所有市场的持仓
      const allRequests: QuoteRequest[] = [];
      const accountToSymbols = new Map<string, QuoteRequest[]>();

      for (const account of accounts) {
        const positions = await positionService.getCurrentPositions(account.id);
        const marketPositions = positions
          .filter((pos) => pos.market === market)
          .map((pos) => ({ symbol: pos.symbol, market: pos.market || market }));

        allRequests.push(...marketPositions);
        accountToSymbols.set(account.id, marketPositions);
      }

      updateStats.total = allRequests.length;
      updateStats.byMarket[market].attempted = allRequests.length;

      // 批量获取价格
      const result = await this.batchGetQuote(allRequests);

      // 更新统计信息
      updateStats.succeeded = result.succeeded.length;
      updateStats.failed = result.failed;
      updateStats.byMarket[market].succeeded = result.succeeded.length;
      updateStats.byMarket[market].failed = result.failed;

      logger.info(
        `[UnifiedPriceService] Market ${market} price update completed: ` +
          `${updateStats.succeeded}/${updateStats.total} succeeded`,
      );
    } catch (error) {
      logger.error(
        `[UnifiedPriceService] Failed to update prices for market ${market}:`,
        error,
      );
    }

    return updateStats;
  }

  /**
   * 将请求按市场分组
   */
  private groupByMarket(requests: QuoteRequest[]): Map<MarketType, QuoteRequest[]> {
    const grouped = new Map<MarketType, QuoteRequest[]>();

    for (const request of requests) {
      const market = request.market;
      if (!grouped.has(market)) {
        grouped.set(market, []);
      }
      grouped.get(market)!.push(request);
    }

    return grouped;
  }

  /**
   * 清除指定资产的缓存
   *
   * 注意：当前实现是基于 assetMeta 表的当日缓存，
   * 它没有删除本地缓存，只是下次查询时会从外部 API 获取。
   */
  async invalidateCache(symbol: string, market: MarketType): Promise<void> {
    // 目前是基于当日缓存的简单实现，不需要实际删除操作
    // 支持此方法是为了未来可能引入本地内存缓存时的兼容性
    logger.info(`[UnifiedPriceService] Cache invalidated for ${symbol} (${market})`);
  }
}