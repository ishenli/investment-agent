import dayjs from 'dayjs';
import logger from '@server/base/logger';
import priceService from '@server/service/priceService';
import type { MarketType } from '@typings/asset';

/**
 * 缓存条目
 */
interface CacheEntry {
  /** 资产代码 */
  symbol: string;
  /** 市场类型 */
  market: MarketType;
  /** 价格 */
  price: number;
  /** 货币代码 */
  currency: string;
  /** 价格时间戳 */
  timestamp: Date;
  /** 数据源 */
  source: string;
}

/**
 * 当日价格缓存策略
 *
 * 使用现有的 assetMeta 表作为缓存存储。
 * 通过 priceService 与数据库交互。
 *
 * 缓存策略：如果价格在今天（UTC）已更新过，则直接返回缓存值。
 */
export class SameDayPriceCache {
  /**
   * 从缓存获取价格
   *
   * @param symbol 资产代码
   * @param market 市场类型
   * @returns 缓存条目，如果不存在或已过期则返回 null
   */
  async get(symbol: string, market: MarketType): Promise<CacheEntry | null> {
    try {
      const latestPrice = await priceService.getLatestPrice(symbol);

      if (!latestPrice) {
        return null;
      }

      // 检查缓存是否有效
      if (!this.isValidForToday(latestPrice.updatedAt)) {
        return null;
      }

      // 构建缓存条目
      return {
        symbol: latestPrice.symbol,
        market: latestPrice.market as MarketType,
        price: latestPrice.price,
        currency: latestPrice.currency,
        timestamp: latestPrice.updatedAt,
        source: latestPrice.source,
      };
    } catch (error) {
      logger.error(`[SameDayPriceCache] Failed to get cache for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 保存价格到缓存
   *
   * 注意：这不是直接的缓存操作，而是通过调用 priceService.updatePrice()
   * 来持久化价格。此方法由 UnifiedPriceService 在调用外部 API 成功后调用。
   *
   * @param symbol 资产代码
   * @param price 价格
   * @param currency 货币代码
   * @param source 数据源
   * @param market 市场类型
   * @param assetType 资产类型
   */
  async save(
    symbol: string,
    price: number,
    currency: string,
    source: string,
    market: MarketType,
    assetType: 'stock' | 'etf' | 'fund' | 'crypto' = 'stock',
  ): Promise<void> {
    try {
      await priceService.updatePrice({
        symbol,
        price,
        currency,
        source,
        market,
        assetType,
      });
    } catch (error) {
      logger.error(`[SameDayPriceCache] Failed to save cache for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 检查缓存是否在当天有效
   *
   * @param timestamp 价格时间戳
   * @returns 是否当天有效
   */
  isValidForToday(timestamp: Date): boolean {
    const timestampDate = dayjs(timestamp).format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    return timestampDate === today;
  }

  /**
   * 从缓存获取价格（便捷方法）
   *
   * @param symbol 资产代码
   * @param market 市场类型
   * @returns 价格，如果缓存未命中则返回 null
   */
  async getFromCache(symbol: string, market: MarketType): Promise<number | null> {
    const entry = await this.get(symbol, market);
    return entry?.price ?? null;
  }
}