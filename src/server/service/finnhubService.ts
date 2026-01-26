// finnhubService: legacy compatibility layer
// 价格获取相关方法已迁移到 unifiedPriceService
// 此文件保留用于向后兼容，和历史数据相关功能继续使用

import { db } from '@server/lib/db';

import { assetPriceHistory } from '@/drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import logger from '../base/logger';
import type { MarketType } from '@typings/asset';
import { unifiedPriceService } from './unifiedPriceService';
import { finnhubClient } from '../dataflows/finnhubUtil';

class FinnhubService {
  /**
   * 获取资产价格（兼容方法）
   *
   * @deprecated 请使用 unifiedPriceService.getQuote() 代替
   * 此方法保留用于向后兼容，内部路由到 UnifiedPriceService
   *
   * @param symbol 资产代码
   * @param market 市场类型，默认为 'US'
   * @returns 资产价格，如果获取失败则返回 null
   */
  async getPrice(symbol: string, market: MarketType = 'US'): Promise<number | null> {
    try {
      const result = await unifiedPriceService.getQuote(symbol, market);
      return result?.price ?? null;
    } catch (error) {
      logger.error(`[finnhubService#getPrice] Failed to get price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 获取历史 candle 数据（保留原有实现）
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
      finnhubClient.stockCandles(symbol, resolution, from, to, (error: unknown, data: any) => {
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
      });
    });
  }

  /**
   * 批量获取港股价格（兼容方法）
   *
   * @deprecated 请使用 unifiedPriceService.batchGetQuote() 代替
   * 此方法保留用于向后兼容，内部路由到 UnifiedPriceService
   *
   * @param hkPosition 港股持仓列表
   * @returns 格式化的价格数组
   */
  async batchQuoteByTencent(
    hkPosition: Array<{ symbol: string; market?: string }>,
  ): Promise<Array<{ symbol: string; price: number }>> {
    try {
      const requests = hkPosition.map((pos) => ({
        symbol: pos.symbol,
        market: (pos.market || 'HK') as MarketType,
      }));

      const result = await unifiedPriceService.batchGetQuote(requests);

      return result.succeeded.map((s) => ({
        symbol: s.symbol,
        price: s.price,
      }));
    } catch (error) {
      logger.error(`[finnhubService#batchQuoteByTencent] Failed to batch quote:`, error);
      return [];
    }
  }

  /**
   * 保存历史价格数据
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

      await db.insert(assetPriceHistory).values(values);

      logger.info(`[FinnhubService] Saved ${prices.length} historical prices for ${symbol}`);
    } catch (error) {
      logger.error(`[FinnhubService] Failed to save historical prices for ${symbol}:`, error);
    }
  }

  /**
   * 同步历史数据
   */
  async syncHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    market: MarketType = 'US',
  ): Promise<void> {
    try {
      logger.info(
        `[FinnhubService] Syncing historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

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

      // Filter out existing dates to avoid duplicates
      const existing = await db
        .select({ date: assetPriceHistory.date })
        .from(assetPriceHistory)
        .where(
          and(
            eq(assetPriceHistory.symbol, symbol),
            gte(assetPriceHistory.date, startDate),
            lte(assetPriceHistory.date, endDate),
          ),
        );

      const existingDates = new Set(existing.map((e) => e.date.toISOString().split('T')[0]));

      const newPrices = prices.filter(
        (p) => !existingDates.has(p.date.toISOString().split('T')[0]),
      );

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
   */
  async getHistoricalPrice(
    symbol: string,
    date: Date,
    market: MarketType = 'US',
  ): Promise<number | null> {
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
          lte(assetPriceHistory.date, endOfDay),
        ),
      });

      if (record) {
        return record.priceCents / 100;
      }

      // Try to sync if missing (fetch a small window around the date)
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
          lte(assetPriceHistory.date, endOfDay),
        ),
      });

      return recordAfterSync ? recordAfterSync.priceCents / 100 : null;
    } catch (error) {
      logger.error(`[FinnhubService] Error getting historical price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 批量获取价格（兼容方法）
   *
   * @deprecated 请使用 unifiedPriceService.batchGetQuote() 代替
   */
  async getQuotes(
    symbols: string[],
    market: MarketType = 'US',
  ): Promise<Record<string, number | null>> {
    const result: Record<string, number | null> = {};
    for (const s of symbols) {
      try {
        result[s] = await this.getPrice(s, market);
      } catch (e) {
        logger.error(`Error fetching quote for ${s}:`, e);
        result[s] = null;
      }
    }
    return result;
  }
}

const finnhubService = new FinnhubService();

export default finnhubService;