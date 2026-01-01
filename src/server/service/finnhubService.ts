// finnhubService: fetch quotes with same-day caching backed by asset_prices table
// Uses priceService to persist new prices so other parts of the app can reuse them
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { db } from '@server/lib/db';

import { assetMeta, assetPriceHistory } from '@/drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import priceService from '@server/service/priceService';
import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import { finnhubClient } from '../dataflows/finnhubUtil';
import dayjs from 'dayjs';
import { TencentHKQuote } from '../dataflows/tencentUtil';
import { EXCHANGE_RATES } from '@shared/constant';

class FinnhubService {
  /**
   * 统一的价格获取接口，支持不同市场的资产价格获取
   * - 对于港股（HK）资产，使用Driven API获取价格
   * - 对于其他市场资产，使用原有的Finnhub API
   * - 保留现有缓存机制：如果已有当日价格记录，则直接返回缓存结果
   * @param symbol 资产代码
   * @param market 市场类型，默认为'US'
   * @returns 资产价格，如果获取失败则返回null
   */
  async getPrice(symbol: string, market: MarketType = 'US'): Promise<number | null> {
    try {
      // 检查最新的持久化价格（缓存机制）
      const latest = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.symbol, symbol),
        orderBy: [desc(assetMeta.createdAt)],
      });

      if (latest && latest.updatedAt) {
        const latestDate = dayjs(latest.updatedAt).format('YYYY-MM-DD');
        const today = dayjs().format('YYYY-MM-DD');
        if (latestDate === today) {
          logger.info(
            `[finnhubService#getPrice] Using cached price for ${symbol}: ${latest.priceCents}`,
          );
          // 今日已有缓存价格，直接返回
          return (latest.priceCents ?? 0) / 100;
        }
      }

      return await this.getQuoteByFinnhub(symbol, market);
    } catch (err) {
      logger.error(`[finnhubService#getPrice] Failed to get price for ${symbol}:`, err);
      return null;
    }
  }

  /**
   * Get a quote for a symbol with same-day caching.
   *  - If we already have a price in asset_prices for the same UTC day, return it
   *  - Otherwise call Finnhub, persist via priceService, and return
   */
  async getQuoteByFinnhub(symbol: string, market: MarketType = 'US'): Promise<number | null> {
    try {
      // Check latest persisted price
      const latest = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.symbol, symbol),
        orderBy: [desc(assetMeta.createdAt)],
      });

      if (latest && latest.updatedAt) {
        const latestDate = dayjs(latest.updatedAt).format('YYYY-MM-DD');
        const today = dayjs().format('YYYY-MM-DD');
        if (latestDate === today) {
          // cached for today
          return (latest.priceCents ?? 0) / 100;
        }
      }

      // If no same-day price, call Finnhub
      if (!process.env.FINNHUB_API_KEY) {
        logger.warn('FINNHUB_API_KEY not set, cannot fetch remote price');
        return null;
      }

      const quotePromise = new Promise<number | null>((resolve) => {
        finnhubClient.quote(symbol, async (error: unknown, data: { c: number }) => {
          if (error) {
            logger.error(`Finnhub API error for ${symbol}:`);
            resolve(null);
            return;
          }

          const c = data?.c ?? 0;
          if (!c) {
            resolve(null);
            return;
          }

          // persist via priceService so asset_prices is populated consistently
          try {
            // map API market to DB style MarketType ('US'|'CN'|'HK')
            const upperMarket = String(market).toUpperCase();
            const dbMarket: MarketType =
              upperMarket === 'CN' || upperMarket === 'HK' ? upperMarket : 'US';
            await priceService.updatePrice({
              symbol,
              price: c,
              assetType: 'stock',
              currency: 'USD',
              source: 'finnhub',
              market: dbMarket,
            });
          } catch (e) {
            logger.warn(`Failed to persist price for ${symbol}: ${e}`);
          }

          resolve(c);
        });
      });

      return await quotePromise;
    } catch (err) {
      logger.error(`Failed to get quote for ${symbol}:`, err);
      return null;
    }
  }

  /** Batch helper: gets quotes for many symbols using the single getQuote logic */
  async getQuotes(
    symbols: string[],
    market: MarketType = 'US',
  ): Promise<Record<string, number | null>> {
    const result: Record<string, number | null> = {};
    for (const s of symbols) {
      try {
        result[s] = await this.getQuoteByFinnhub(s, market);
      } catch (e) {
        logger.error(`Error fetching quote for ${s}:`, e);
        result[s] = null;
      }
    }
    return result;
  }

  /**
   * Get historical candles for a symbol.
   * @param symbol Asset symbol
   * @param resolution Supported resolutions: '1', '5', '15', '30', '60', 'D', 'W', 'M'
   * @param from UNIX timestamp (seconds)
   * @param to UNIX timestamp (seconds)
   */
  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
  ): Promise<{
    c: number[];
    h: number[];
    l: number[];
    o: number[];
    s: string;
    t: number[];
    v: number[];
  } | null> {
    const api_key = process.env.FINNHUB_API_KEY;
    if (!api_key) {
      logger.warn('FINNHUB_API_KEY not set, cannot fetch candles');
      return null;
    }

    return new Promise((resolve) => {
      finnhubClient.stockCandles(
        symbol,
        resolution,
        from,
        to,
        (error: unknown, data: any) => {
          if (error) {
            logger.error(`Failed to get candles for ${symbol}:`, error);
            resolve(null);
            return;
          }

          if (data.s === 'no_data') {
            resolve(null);
            return;
          }

          resolve(data);
        },
      );
    });
  }

  makeHKDToUSD(hkd: number): number {
    return hkd * EXCHANGE_RATES.HKD_TO_USD;
  }

  async batchQuoteByTencent(hkPosition: { symbol: string }[]) {
    // 使用 TencentHKQuote 的 getStockData 来调用
    const tencentQuote = new TencentHKQuote();
    const stockCodes = hkPosition.map((pos) => pos.symbol);
    const result = await tencentQuote.getStockData(stockCodes);

    // 将结果转换为与之前相同的格式
    const formattedResult = Object.entries(result).map(([symbol, data]) => ({
      symbol,
      price: this.makeHKDToUSD(data.price),
    }));

    if (formattedResult.length > 0) {
      const priceUpdates = formattedResult.map((position) => {
        return {
          symbol: position.symbol,
          price: position.price,
          assetType: 'stock' as const,
          currency: 'HKD',
          source: 'tencent',
          market: 'HK' as MarketType,
        };
      });
      if (priceUpdates.length > 0) {
        try {
          const priceUpdateResult = await priceService.batchUpdatePrices(priceUpdates);
          logger.info(
            `[finnhubService#batchQuoteByTencent] 账户价格更新结果: ${priceUpdateResult.successCount} 成功, ${priceUpdateResult.failureCount} 失败`,
          );
        } catch (error) {
          logger.error(`[finnhubService#batchQuoteByTencent] 账户价格更新失败:`, error);
        }
      }
      return formattedResult;
    }

    return [];
  }


  /**
   * 保存历史价格数据
   * @param prices 价格数据数组
   * @param symbol 资产代码
   * @param market 市场
   */
  async saveHistoricalPrices(
    prices: {
      date: Date;
      priceCents: number;
      openCents?: number;
      highCents?: number;
      lowCents?: number;
    }[],
    symbol: string,
    market: MarketType = 'US',
  ): Promise<void> {
    if (!prices.length) return;

    try {
      const values = prices.map((p) => ({
        symbol,
        priceCents: p.priceCents,
        openCents: p.openCents,
        highCents: p.highCents,
        lowCents: p.lowCents,
        date: p.date,
        market,
        source: 'finnhub',
        createdAt: new Date(),
      }));

      // 使用 SQLite 的 insert ignore 或者是逐条插入检查
      // 这里为了简单，我们假设不做复杂的去重，或者依赖业务层逻辑避免重复同步
      // 实际上 drizzle 的 sqlite 插入可以 batch
      await db.insert(assetPriceHistory).values(values);

      logger.info(`[FinnhubService] Saved ${prices.length} historical prices for ${symbol}`);
    } catch (error) {
      logger.error(`[FinnhubService] Failed to save historical prices for ${symbol}:`, error);
    }
  }

  /**
   * 同步历史数据
   * @param symbol 资产代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param market 市场
   */
  async syncHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    market: MarketType = 'US',
  ): Promise<void> {
    try {
      logger.info(`[FinnhubService] Syncing historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Calculate timestamps in seconds
      const from = Math.floor(startDate.getTime() / 1000);
      const to = Math.floor(endDate.getTime() / 1000);

      const candles = await this.getCandles(symbol, 'D', from, to);

      if (!candles || !candles.c || candles.s !== 'ok') {
        logger.warn(`[FinnhubService] No candles found for ${symbol}`);
        return;
      }

      const prices = candles.t.map((timestamp, index) => {
        // Finnhub stamps are in seconds, make Date
        const date = new Date(timestamp * 1000);
        return {
          date,
          priceCents: Math.round(candles.c[index] * 100),
          openCents: Math.round(candles.o[index] * 100),
          highCents: Math.round(candles.h[index] * 100),
          lowCents: Math.round(candles.l[index] * 100),
        };
      });

      // Filter out existing dates to avoid duplicates (naive check)
      // For better performance, query existing range first
      const existing = await db
        .select({ date: assetPriceHistory.date })
        .from(assetPriceHistory)
        .where(
          and(
            eq(assetPriceHistory.symbol, symbol),
            gte(assetPriceHistory.date, startDate),
            lte(assetPriceHistory.date, endDate)
          )
        );

      const existingDates = new Set(existing.map(e => e.date.toISOString().split('T')[0]));

      const newPrices = prices.filter(p => !existingDates.has(p.date.toISOString().split('T')[0]));

      if (newPrices.length > 0) {
        await this.saveHistoricalPrices(newPrices, symbol, market);
      } else {
        logger.info(`[FinnhubService] No new prices to save for ${symbol}`);
      }

    } catch (error) {
      logger.error(`[FinnhubService] Failed to sync historical data for ${symbol}:`, error);
    }
  }

  /**
   * 获取特定日期的历史价格
   * 如果数据库中没有，尝试同步
   */
  async getHistoricalPrice(symbol: string, date: Date, market: MarketType = 'US'): Promise<number | null> {
    try {
      // Expand search range to cover the whole day in UTC
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const record = await db.query.assetPriceHistory.findFirst({
        where: and(
          eq(assetPriceHistory.symbol, symbol),
          gte(assetPriceHistory.date, startOfDay),
          lte(assetPriceHistory.date, endOfDay)
        )
      });

      if (record) {
        return record.priceCents / 100;
      }

      // Try to sync if missing (fetch a small window around the date)
      // To ensure we get the specific date, we fetch 5 days around it just in case of weekend/holiday
      const syncStart = new Date(date);
      syncStart.setDate(date.getDate() - 5);
      const syncEnd = new Date(date);
      syncEnd.setDate(date.getDate() + 5);

      await this.syncHistoricalData(symbol, syncStart, syncEnd, market);

      // Try fetch again
      const recordAfterSync = await db.query.assetPriceHistory.findFirst({
        where: and(
          eq(assetPriceHistory.symbol, symbol),
          gte(assetPriceHistory.date, startOfDay),
          lte(assetPriceHistory.date, endOfDay)
        )
      });

      return recordAfterSync ? recordAfterSync.priceCents / 100 : null;

    } catch (error) {
      logger.error(`[FinnhubService] Error getting historical price for ${symbol}:`, error);
      return null;
    }
  }
}

const finnhubService = new FinnhubService();

export default finnhubService;
