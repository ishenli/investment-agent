// finnhubService: legacy compatibility layer
// 价格获取相关方法已迁移到 unifiedPriceService
// 此文件保留用于向后兼容，和历史数据相关功能继续使用

import logger from '../base/logger';
import type { MarketType } from '@typings/asset';
import { unifiedPriceService } from './unifiedPriceService';
import { HistoryService } from './historyService';

class FinnhubService {
  private historyService: HistoryService;

  constructor() {
    this.historyService = new HistoryService();
  }

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
   * 获取历史 candle 数据（委托给 HistoryService）
   * 
   * @deprecated 请直接使用 HistoryService.getCandles()
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
    try {
      const result = await this.historyService.getCandles(symbol, resolution, from, to);
      if (!result) return null;
      
      // 转换为 finnhubService 期望的格式
      return {
        c: result.c,
        h: result.h,
        l: result.l,
        o: result.o,
        s: result.s,
        t: result.t,
        v: result.v
      };
    } catch (error) {
      logger.error(`[finnhubService#getCandles] Failed to get candles for ${symbol}:`, error);
      return null;
    }
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
   * 保存历史价格数据（委托给 HistoryService）
   * 
   * @deprecated 请直接使用 HistoryService.saveHistoricalPrices()
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
    try {
      // 注意：HistoryService 的 saveHistoricalPrices 方法签名略有不同
      // 需要调整参数格式
      await this.historyService.saveHistoricalPrices(prices, symbol, market);
    } catch (error) {
      logger.error(`[finnhubService#saveHistoricalPrices] Failed to save historical prices for ${symbol}:`, error);
    }
  }

  /**
   * 同步历史数据（委托给 HistoryService）
   * 
   * @deprecated 请直接使用 HistoryService.syncHistoricalData()
   */
  async syncHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    market: MarketType = 'US',
  ): Promise<void> {
    try {
      await this.historyService.syncHistoricalData(symbol, startDate, endDate, market);
    } catch (error) {
      logger.error(`[finnhubService#syncHistoricalData] Failed to sync historical data for ${symbol}:`, error);
    }
  }

  /**
   * 获取特定日期的历史价格（委托给 HistoryService）
   * 
   * @deprecated 请直接使用 HistoryService.getHistoricalPrice()
   */
  async getHistoricalPrice(
    symbol: string,
    date: Date,
    market: MarketType = 'US',
  ): Promise<number | null> {
    try {
      return await this.historyService.getHistoricalPrice(symbol, date, market);
    } catch (error) {
      logger.error(`[finnhubService#getHistoricalPrice] Error getting historical price for ${symbol}:`, error);
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