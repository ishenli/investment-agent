import { db } from '@server/lib/db';
import { assetPriceHistory } from '@/drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import { finnhubClient } from '@server/dataflows/finnhubUtil';
import type { CandleData } from '../stockDataService/formatters';
import { unifiedPriceService } from '../unifiedPriceService';

/**
 * Finnhub 原生 Candle 数据格式
 */
export interface FinnhubCandles {
  c: number[]; // 收盘价
  h: number[]; // 最高价
  l: number[]; // 最低价
  o: number[]; // 开盘价
  s: string;  // 状态: 'ok' | 'no_data'
  t: number[]; // 时间戳（秒）
  v: number[]; // 成交量
}

/**
 * 历史价格数据
 */
export interface HistoricalPrice {
  date: Date;
  price: number;
  open?: number;
  high?: number;
  low?: number;
}

/**
 * 时间段选项
 */
export interface DateRangeOptions {
  startDate: string;
  endDate: string;
}

/**
 * 蜡烛图查询选项
 */
export interface CandlesOptions extends DateRangeOptions {
  resolution?: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'; // 时间间隔
}

/**
 * 历史数据服务
 *
 * 专门处理历史行情/蜡烛图数据的获取和存储
 * 与 UnifiedPriceService (实时报价) 分离，职责单一
 */
export class HistoryService {
  private defaultResolution: 'D' | 'W' | 'M' = 'D';

  /**
   * 获取历史蜡烛图数据
   *
   * @param symbol 资产代码
   * @param resolution 时间间隔（D=日, W=周, M=月, 1=1分钟等）
   * @param from 开始时间戳（秒）
   * @param to 结束时间戳（秒）
   * @returns Finnhub 原生格式数据，如果失败返回 null
   */
  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
  ): Promise<FinnhubCandles | null> {
    return new Promise((resolve) => {
      finnhubClient.stockCandles(symbol, resolution, from, to, (error: unknown, data: any) => {
        if (error) {
          logger.error(`[HistoryService] Failed to get candles for ${symbol} with ${resolution}`);
          resolve(null);
          return;
        }

        if (data.s === 'no_data') {
          logger.warn(`[HistoryService] No candles data for ${symbol}`);
          resolve(null);
          return;
        }

        logger.debug(
          `[HistoryService] Got ${data.c?.length || 0} candles for ${symbol} (${resolution})`,
        );
        resolve(data);
      });
    });
  }

  /**
   * 获取日期范围内的完整历史价格数据
   *
   * 先从数据库查询，如果缺失则从 Finnhub 同步
   *
   * @param symbol 资产代码
   * @param options 日期范围选项
   * @param market 市场类型
   * @returns CandleData 统计数据或 null
   */
  async getCandleDataForDateRange(
    symbol: string,
    options: DateRangeOptions,
    market: MarketType = 'US',
  ): Promise<CandleData | null> {
    const { startDate, endDate } = options;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. 尝试从数据库获取
    const fromDb = await this.getHistoricalPrices(symbol, start, end, market);
    if (fromDb && fromDb.length > 0) {
      logger.info(`[HistoryService] Loaded ${fromDb.length} prices from DB for ${symbol}`);
      return this.calculateCandleStatistics(symbol, fromDb);
    }

    // 2. 数据库无数据，从 Finnhub 同步
    logger.info(`[HistoryService] No DB data for ${symbol}, fetching from Finnhub`);
    await this.syncHistoricalData(symbol, start, end, market);

    // 3. 再次尝试从数据库获取
    const afterSync = await this.getHistoricalPrices(symbol, start, end, market);
    if (afterSync && afterSync.length > 0) {
      return this.calculateCandleStatistics(symbol, afterSync);
    }

    return null;
  }

  /**
   * 从数据库获取历史价格
   *
   * @param symbol 资产代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param market 市场类型
   * @returns 历史价格数组
   */
  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date,
    market: MarketType = 'US',
  ): Promise<HistoricalPrice[]> {
    try {
      const records = await db.query.assetPriceHistory.findMany({
        where: and(
          eq(assetPriceHistory.symbol, symbol),
          eq(assetPriceHistory.market, market),
          gte(assetPriceHistory.date, startDate),
          lte(assetPriceHistory.date, endDate),
        ),
        orderBy: (assetPriceHistory, { asc }) => [asc(assetPriceHistory.date)],
      });

      return records.map((r) => ({
        date: r.date,
        price: r.priceCents / 100,
        open: r.openCents ? r.openCents / 100 : undefined,
        high: r.highCents ? r.highCents / 100 : undefined,
        low: r.lowCents ? r.lowCents / 100 : undefined,
      }));
    } catch (error) {
      logger.error(`[HistoryService] Failed to query historical prices for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 同步历史数据到数据库
   *
   * 优先使用 Finnhub 蜡烛图数据，如果不可用则回退到实时价格
   *
   * @param symbol 资产代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param market 市场类型
   */
  async syncHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    market: MarketType = 'US',
  ): Promise<void> {
    try {
      logger.info(
        `[HistoryService] Syncing historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      // 计算时间戳（秒）
      const from = Math.floor(startDate.getTime() / 1000);
      const to = Math.floor(endDate.getTime() / 1000);

      const candles = await this.getCandles(symbol, this.defaultResolution, from, to);

      let prices: { date: Date; priceCents: number; openCents?: number; highCents?: number; lowCents?: number }[] = [];

      if (candles && candles.c && candles.s === 'ok') {
        // 转换 Finnhub 数据格式
        prices = candles.t.map((timestamp, index) => {
          const date = new Date(timestamp * 1000);
          return {
            date,
            priceCents: Math.round(candles.c[index] * 100),
            openCents: Math.round(candles.o[index] * 100),
            highCents: Math.round(candles.h[index] * 100),
            lowCents: Math.round(candles.l[index] * 100),
          };
        });
        logger.info(`[HistoryService] Got ${prices.length} candles from Finnhub for ${symbol}`);
      } else {
        // 蜡烛图数据不可用，回退到使用实时价格
        logger.warn(`[HistoryService] No candles found for ${symbol}, falling back to real-time price`);
        const realtimePrice = await this.getRealtimePriceAsHistory(symbol, market);
        if (realtimePrice) {
          prices = [realtimePrice];
        }
      }

      if (prices.length === 0) {
        logger.warn(`[HistoryService] No prices available for ${symbol}`);
        return;
      }

      // 过滤掉已存在的日期，避免重复
      const existing = await db
        .select({ date: assetPriceHistory.date })
        .from(assetPriceHistory)
        .where(
          and(
            eq(assetPriceHistory.symbol, symbol),
            eq(assetPriceHistory.market, market),
            gte(assetPriceHistory.date, startDate),
            lte(assetPriceHistory.date, endDate),
          ),
        );

      const existingDates = new Set(
        existing.map((e) => e.date.toISOString().split('T')[0]),
      );

      const newPrices = prices.filter(
        (p) => !existingDates.has(p.date.toISOString().split('T')[0]),
      );

      if (newPrices.length > 0) {
        await this.saveHistoricalPrices(newPrices, symbol, market);
      } else {
        logger.info(`[HistoryService] No new prices to save for ${symbol}`);
      }
    } catch (error) {
      logger.error(`[HistoryService] Failed to sync historical data for ${symbol}:`, error);
    }
  }

  /**
   * 获取实时价格作为历史数据
   *
   * 当蜡烛图数据不可用时，使用当天的实时收盘价作为历史数据
   *
   * @param symbol 资产代码
   * @param market 市场类型
   * @returns 价格数据或 null
   */
  private async getRealtimePriceAsHistory(
    symbol: string,
    market: MarketType,
  ): Promise<{ date: Date; priceCents: number; openCents?: number; highCents?: number; lowCents?: number } | null> {
    try {
      const quote = await unifiedPriceService.getQuote(symbol, market, { forceRefresh: true });

      if (!quote) {
        logger.warn(`[HistoryService] Failed to get real-time quote for ${symbol}`);
        return null;
      }

      // 使用当天的日期和实时价格
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const priceCents = Math.round(quote.price * 100);

      logger.info(
        `[HistoryService] Using real-time price ${quote.price} (${priceCents} cents) for ${symbol} on ${today.toISOString().split('T')[0]}`,
      );

      return {
        date: today,
        priceCents,
        // 实时价格没有开高低数据，使用收盘价作为所有价格
        openCents: priceCents,
        highCents: priceCents,
        lowCents: priceCents,
      };
    } catch (error) {
      logger.error(`[HistoryService] Error getting real-time price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 保存历史价格数据到数据库
   *
   * @param prices 价格数组
   * @param symbol 资产代码
   * @param market 市场类型
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

      logger.info(`[HistoryService] Saved ${prices.length} historical prices for ${symbol}`);
    } catch (error) {
      logger.error(`[HistoryService] Failed to save historical prices for ${symbol}:`, error);
    }
  }

  /**
   * 获取特定日期的历史价格
   *
   * @param symbol 资产代码
   * @param date 日期
   * @param market 市场类型
   * @returns 价格，如果找不到返回 null
   */
  async getHistoricalPrice(
    symbol: string,
    date: Date,
    market: MarketType = 'US',
  ): Promise<number | null> {
    try {
      // 扩展搜索范围以覆盖全天
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const record = await db.query.assetPriceHistory.findFirst({
        where: and(
          eq(assetPriceHistory.symbol, symbol),
          eq(assetPriceHistory.market, market),
          gte(assetPriceHistory.date, startOfDay),
          lte(assetPriceHistory.date, endOfDay),
        ),
      });

      if (record) {
        return record.priceCents / 100;
      }

      // 如果缺失则尝试同步（获取日期周围的窗口）
      const syncStart = new Date(date);
      syncStart.setDate(date.getDate() - 5);
      const syncEnd = new Date(date);
      syncEnd.setDate(date.getDate() + 5);

      await this.syncHistoricalData(symbol, syncStart, syncEnd, market);

      // 再次尝试获取
      const recordAfterSync = await db.query.assetPriceHistory.findFirst({
        where: and(
          eq(assetPriceHistory.symbol, symbol),
          eq(assetPriceHistory.market, market),
          gte(assetPriceHistory.date, startOfDay),
          lte(assetPriceHistory.date, endOfDay),
        ),
      });

      return recordAfterSync ? recordAfterSync.priceCents / 100 : null;
    } catch (error) {
      logger.error(`[HistoryService] Error getting historical price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 计算蜡烛图统计数据
   *
   * @param symbol 资产代码
   * @param prices 历史价格数组
   * @returns CandleData 统计数据
   */
  private calculateCandleStatistics(
    symbol: string,
    prices: HistoricalPrice[],
  ): CandleData | null {
    if (!prices.length) {
      return null;
    }

    const closes = prices.map((p) => p.price);
    const highs = prices
      .map((p) => p.high)
      .filter((h): h is number => h !== undefined);
    const lows = prices
      .map((p) => p.low)
      .filter((l): l is number => l !== undefined);

    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const high = highs.length > 0 ? Math.max(...highs) : Math.max(...closes);
    const low = lows.length > 0 ? Math.min(...lows) : Math.min(...closes);
    const change = lastClose - firstClose;
    const changePercent = (change / firstClose) * 100;

    return {
      symbol,
      count: prices.length,
      firstClose,
      lastClose,
      high,
      low,
      change,
      changePercent,
    };
  }
}