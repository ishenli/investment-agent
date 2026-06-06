import { db } from '@server/lib/db';
import { assetMeta } from '@/drizzle/schema';
import { eq, and, desc, gte, lt, isNull } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AssetType, MarketType } from '@typings/asset';

// 资产价格类型定义
export type AssetPriceType = {
  id: string;
  symbol: string;
  price: number;
  assetType: AssetType;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  market: string;
};

// 批量价格更新请求类型
export type BatchPriceUpdateRequest = {
  symbol: string;
  price: number;
  assetType?: AssetType;
  currency?: string;
  source?: string;
  market?: MarketType;
}[];

export class PriceService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 获取资产的最新价格
   * @param symbol 资产代码
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns 最新价格信息
   */
  async getLatestPrice(symbol: string, includeDeleted: boolean = false): Promise<AssetPriceType | null> {
    try {
      const whereClause = includeDeleted 
        ? eq(assetMeta.symbol, symbol)
        : and(eq(assetMeta.symbol, symbol), isNull(assetMeta.deletedAt));
        
      const latestPrice = await db.query.assetMeta.findFirst({
        where: whereClause,
        orderBy: [desc(assetMeta.createdAt)],
      });

      if (!latestPrice) {
        return null;
      }

      return {
        id: latestPrice.id.toString(),
        symbol: latestPrice.symbol,
        price: (latestPrice.priceCents ?? 0) / 100,
        assetType: latestPrice.assetType as AssetType,
        currency: latestPrice.currency,
        createdAt: latestPrice.createdAt,
        updatedAt: latestPrice.updatedAt,
        source: latestPrice.source,
        market: latestPrice.market,
      };
    } catch (error) {
      logger.error(`Failed to get latest price for ${symbol}: ${error}`);
      return null;
    }
  }

  /**
   * 批量获取多个资产的最新价格
   * @param symbols 资产代码数组
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns 资产价格映射
   */
  async getLatestPrices(symbols: string[], includeDeleted: boolean = false): Promise<Record<string, AssetPriceType>> {
    try {
      const prices: Record<string, AssetPriceType> = {};

      // 对于每个符号，获取最新的价格
      for (const symbol of symbols) {
        const latestPrice = await this.getLatestPrice(symbol, includeDeleted);
        if (latestPrice) {
          prices[symbol] = latestPrice;
        }
      }

      return prices;
    } catch (error) {
      logger.error(`Failed to get latest prices: ${error}`);
      return {};
    }
  }

  private marketToDBMarket(market?: MarketType): 'CN' | 'US' | 'HK' {
    if (!market) return 'US';
    const m = market.toLowerCase();
    if (m === 'cn') return 'CN';
    if (m === 'hk') return 'HK';
    return 'US';
  }

  /**
   * 更新单个资产价格
   * @param priceData 价格数据
   * @returns 更新后的价格记录，如果资产已被软删除则返回 null
   */
  async updatePrice(priceData: {
    symbol: string;
    price: number;
    assetType?: 'stock' | 'etf' | 'fund' | 'crypto';
    currency?: string;
    source?: string;
    market?: MarketType;
  }): Promise<AssetPriceType | null> {
    try {
      const priceCents = Math.round(priceData.price * 100);
      const dbMarket: 'CN' | 'US' | 'HK' = this.marketToDBMarket(priceData.market);
      const assetType = priceData.assetType || 'stock';

      // 检查是否存在相同symbol和asset_type的最新记录（排除已删除的）
      const existingPrice = await db.query.assetMeta.findFirst({
        where: and(
          eq(assetMeta.symbol, priceData.symbol),
          eq(assetMeta.market, dbMarket),
          isNull(assetMeta.deletedAt)
        ),
        orderBy: [desc(assetMeta.createdAt)],
      });

      let result;
      if (existingPrice) {
        // 更新现有记录
        const [updated] = await db
          .update(assetMeta)
          .set({
            priceCents,
            source: priceData.source || 'finnhub',
            currency: priceData.currency || 'USD',
            market: dbMarket,
            updatedAt: new Date(),
          })
          .where(eq(assetMeta.id, existingPrice.id))
          .returning();

        result = updated;
        logger.info(
          `[priceService#updatePrice] Updated price for ${priceData.symbol}: ${priceData.price}: ${priceData.market}`,
        );
      } else {
        // 检查是否存在已软删除的记录，如果存在则跳过插入
        const softDeletedPrice = await db.query.assetMeta.findFirst({
          where: and(
            eq(assetMeta.symbol, priceData.symbol),
            eq(assetMeta.market, dbMarket)
          ),
          orderBy: [desc(assetMeta.createdAt)],
        });

        if (softDeletedPrice && softDeletedPrice.deletedAt) {
          // 资产已被软删除，跳过插入
          logger.info(
            `[priceService#updatePrice] Skipped soft-deleted asset ${priceData.symbol}, not inserting new record`,
          );
          return null;
        }

        // 原子 upsert：按 (symbol, market) 做冲突更新，避免并发竞态和唯一索引冲突
        const values = {
          symbol: priceData.symbol,
          priceCents,
          assetType,
          currency: priceData.currency || 'USD',
          createdAt: new Date(),
          source: priceData.source || 'finnhub',
          market: dbMarket,
          updatedAt: new Date(),
        } as const;

        const [inserted] = await db
          .insert(assetMeta)
          .values(values)
          .onConflictDoUpdate({
            target: [assetMeta.symbol, assetMeta.market],
            set: {
              priceCents,
              updatedAt: new Date(),
              source: priceData.source || 'finnhub',
              currency: priceData.currency || 'USD',
            },
          })
          .returning();

        result = inserted;
        logger.info(
          `[priceService#updatePrice] Inserted price for ${priceData.symbol}: ${priceData.price}: ${priceData.market}`,
        );
      }

      return {
        id: result.id.toString(),
        symbol: result.symbol,
        price: (result.priceCents ?? 0) / 100,
        assetType: result.assetType as 'stock' | 'etf' | 'fund' | 'crypto',
        currency: result.currency,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        source: result.source,
        market: (result.market || 'US').toLowerCase(),
      };
    } catch (error) {
      logger.error(
        `[priceService#updatePrice] Failed to upsert price for ${priceData.symbol}: ${error}`,
      );
      throw new Error(`Failed to upsert price: ${error}`);
    }
  }

  /**
   * 批量更新资产价格
   * @param prices 价格数据数组
   * @returns 更新结果统计
   */
  async batchUpdatePrices(prices: BatchPriceUpdateRequest): Promise<{
    successCount: number;
    failureCount: number;
    errors: string[];
  }> {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const priceData of prices) {
      try {
        await this.updatePrice(priceData);
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push(
          `Failed to update ${priceData.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        logger.error(`Batch update failed for ${priceData.symbol}:`, error);
      }
    }

    return { successCount, failureCount, errors };
  }

  /**
   * 获取资产的历史价格（最近24小时）
   * @param symbol 资产代码
   * @param hours 小时数，默认24小时
   * @returns 历史价格列表
   */
  async getHistoricalPrices(symbol: string, hours: number = 24): Promise<AssetPriceType[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const historicalPrices = await db.query.assetMeta.findMany({
        where: and(
          eq(assetMeta.symbol, symbol), 
          gte(assetMeta.createdAt, since),
          isNull(assetMeta.deletedAt)
        ),
        orderBy: [desc(assetMeta.createdAt)],
      });

      return historicalPrices.map((price) => ({
        id: price.id.toString(),
        symbol: price.symbol,
        price: (price.priceCents ?? 0) / 100,
        assetType: price.assetType,
        currency: price.currency,
        createdAt: price.createdAt,
        updatedAt: price.updatedAt,
        source: price.source,
        market: price.market,
      }));
    } catch (error) {
      logger.error(`Failed to get historical prices for ${symbol}: ${error}`);
      return [];
    }
  }

  /**
   * 清理过期的价格数据（保留最近30天）
   * @returns 清理的记录数
   */
  async cleanupOldPrices(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 只清理未被软删除的旧价格记录
      const result = await db.delete(assetMeta).where(
        and(
          lt(assetMeta.createdAt, thirtyDaysAgo),
          isNull(assetMeta.deletedAt)
        )
      );

      logger.info(`Cleaned up ${result.rowsAffected} old price records`);
      return result.rowsAffected;
    } catch (error) {
      logger.error(`Failed to cleanup old prices: ${error}`);
      return 0;
    }
  }

  /**
   * 软删除特定资产的价格记录（逻辑删除）
   * @param symbol 资产代码
   * @returns 是否成功软删除
   */
  async softDeletePriceCache(symbol: string): Promise<boolean> {
    try {
      const [result] = await db
        .update(assetMeta)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(assetMeta.symbol, symbol),
          isNull(assetMeta.deletedAt)  // 只软删除未被删除的记录
        ))
        .returning();
      
      const success = !!result;
      logger.info(`Soft deleted price cache for ${symbol}, success: ${success}`);
      return success;
    } catch (error) {
      logger.error(`Failed to soft delete price cache for ${symbol}: ${error}`);
      return false;
    }
  }

  /**
   * 清除特定资产的价格缓存（物理删除 - 谨慎使用）
   * @param symbol 资产代码
   * @returns 是否成功清除
   */
  async clearPriceCache(symbol: string): Promise<boolean> {
    try {
      // 物理删除特定资产的所有价格记录（包括已软删除的）
      const result = await db.delete(assetMeta).where(eq(assetMeta.symbol, symbol));
      
      logger.info(`Physically cleared price cache for ${symbol}, deleted ${result.rowsAffected} records`);
      return result.rowsAffected > 0;
    } catch (error) {
      logger.error(`Failed to physically clear price cache for ${symbol}: ${error}`);
      return false;
    }
  }

  /**
   * 恢复特定资产的软删除记录
   * @param symbol 资产代码
   * @returns 是否成功恢复
   */
  async restorePriceCache(symbol: string): Promise<boolean> {
    try {
      const result = await db
        .update(assetMeta)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(assetMeta.symbol, symbol))
        .returning();
      
      const success = result.length > 0;
      logger.info(`Restored price cache for ${symbol}, restored ${result.length} records`);
      return success;
    } catch (error) {
      logger.error(`Failed to restore price cache for ${symbol}: ${error}`);
      return false;
    }
  }
}

const priceService = new PriceService();

export default priceService;
