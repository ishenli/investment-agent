/**
 * Asset Meta Repository
 *
 * 数据访问层：负责 asset_meta 表的数据库操作
 */
import { assetMeta } from '@/drizzle/schema';
import { eq, like, and, isNull, asc, desc, inArray, SQL } from 'drizzle-orm';
import { db } from '@server/lib/db';
import { BaseIntRepository, type CreateData, type UpdateData, type QueryOptions } from './base';
import { type MarketType } from '@/types/asset';

/**
 * Asset Meta 实体类型
 */
export type AssetMetaEntity = typeof assetMeta.$inferSelect;

/**
 * 创建 Asset Meta 数据类型
 */
export type CreateAssetMetaData = Omit<AssetMetaEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * 更新 Asset Meta 数据类型
 */
export type UpdateAssetMetaData = Partial<Omit<AssetMetaEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;

/**
 * Asset Meta Repository
 * 管理资产元数据
 */
export class AssetMetaRepository extends BaseIntRepository<AssetMetaEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(assetMeta);
  }

  // ============== 查询操作 ==============

  /**
   * 根据符号查找资产
   */
  async findBySymbol(symbol: string): Promise<AssetMetaEntity | null> {
    return this.findOne(eq(assetMeta.symbol, symbol));
  }

  /**
   * 根据符号和市场查找资产
   */
  async findBySymbolAndMarket(symbol: string, market: MarketType): Promise<AssetMetaEntity | null> {
    return this.findOne(and(
      eq(assetMeta.symbol, symbol),
      eq(assetMeta.market, market)
    )!);
  }

  /**
   * 模糊搜索资产
   */
  async searchBySymbol(symbol: string, includeDeleted = false): Promise<AssetMetaEntity[]> {
    return this.findMany(like(assetMeta.symbol, `%${symbol}%`), {
      orderBy: [asc(assetMeta.symbol)],
      includeDeleted,
    });
  }

  /**
   * 根据市场查找资产
   */
  async findByMarket(market: MarketType, options?: QueryOptions): Promise<AssetMetaEntity[]> {
    return this.findMany(eq(assetMeta.market, market), options);
  }

  /**
   * 批量查询资产
   */
  async findByIds(ids: number[]): Promise<AssetMetaEntity[]> {
    if (ids.length === 0) return [];
    return (db as any)
      .select()
      .from(assetMeta)
      .where(inArray(assetMeta.id, ids));
  }

  /**
   * 批量根据符号查询资产，返回 Map
   */
  async findBySymbolsBatch(symbols: string[]): Promise<Map<string, AssetMetaEntity>> {
    if (symbols.length === 0) return new Map();

    const results = await (db as any)
      .select()
      .from(assetMeta)
      .where(inArray(assetMeta.symbol, symbols));

    const map = new Map<string, AssetMetaEntity>();
    for (const result of results) {
      map.set(result.symbol, result as AssetMetaEntity);
    }
    return map;
  }

  // ============== 创建操作 ==============

  /**
   * 创建资产元数据
   */
  async createAssetMeta(data: CreateAssetMetaData): Promise<AssetMetaEntity> {
    return this.create(data as CreateData<AssetMetaEntity>);
  }

  // ============== 更新操作 ==============

  /**
   * 更新资产元数据
   */
  async updateAssetMeta(id: number, data: UpdateAssetMetaData): Promise<AssetMetaEntity | null> {
    return this.update(id, data);
  }

  /**
   * 更新资产价格
   */
  async updatePrice(id: number, priceCents: number): Promise<AssetMetaEntity | null> {
    return this.update(id, { priceCents });
  }

  /**
   * 更新投资备忘录
   */
  async updateInvestmentMemo(id: number, investmentMemo: string): Promise<AssetMetaEntity | null> {
    return this.update(id, { investmentMemo });
  }
}

// 导出单例实例
export const assetMetaRepository = new AssetMetaRepository();