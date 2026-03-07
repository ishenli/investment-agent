/**
 * Asset Market Info Repository
 *
 * 数据访问层：负责 asset_market_info 表的数据库操作
 */
import { assetMarketInfo, assetMarketInfoToAssetMeta, assetMeta } from '@/drizzle/schema';
import { eq, desc, gte, lte, and, inArray, sql } from 'drizzle-orm';
import { db } from '@server/lib/db';
import { BaseIntRepository, type CreateData, type UpdateData } from './base';

/**
 * Asset Market Info 实体类型
 */
export type AssetMarketInfoEntity = typeof assetMarketInfo.$inferSelect;

/**
 * Asset Market Info to Asset Meta 关联实体类型
 */
export type AssetMarketInfoToAssetMetaEntity = typeof assetMarketInfoToAssetMeta.$inferSelect;

/**
 * 创建 Asset Market Info 数据类型
 */
export type CreateAssetMarketInfoData = Omit<AssetMarketInfoEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Asset Meta 详情（简化版）
 */
export interface AssetMetaDetail {
  id: number;
  symbol: string;
  chineseName: string | null;
}

/**
 * Asset Market Info Repository
 * 管理资产市场信息
 */
export class AssetMarketInfoRepository extends BaseIntRepository<AssetMarketInfoEntity> {
  constructor() {
    super(assetMarketInfo);
  }

  // ============== 查询操作 ==============

  /**
   * 根据 ID 查询市场信息
   */
  async findById(id: number): Promise<AssetMarketInfoEntity | null> {
    return this.findOne(eq(assetMarketInfo.id, id));
  }

  /**
   * 根据符号查询最新的市场信息
   */
  async findLatestBySymbol(symbol: string): Promise<AssetMarketInfoEntity | null> {
    const results = await this.findMany(eq(assetMarketInfo.symbol, symbol), {
      orderBy: [desc(assetMarketInfo.createdAt)],
      limit: 1,
    });
    return results[0] ?? null;
  }

  /**
   * 获取最新的市场信息列表
   */
  async findLatest(limit: number = 20): Promise<AssetMarketInfoEntity[]> {
    return this.findMany(undefined, {
      orderBy: [desc(assetMarketInfo.createdAt)],
      limit,
    });
  }

  /**
   * 根据时间范围查询市场信息
   */
  async findByDateRange(startDate: Date, endDate: Date, limit: number = 50): Promise<AssetMarketInfoEntity[]> {
    return this.findMany(
      and(gte(assetMarketInfo.createdAt, startDate), lte(assetMarketInfo.createdAt, endDate)),
      {
        orderBy: [desc(assetMarketInfo.createdAt)],
        limit,
      }
    );
  }

  /**
   * 统计记录数
   */
  async countByAssetMetaId(assetMetaId: number): Promise<number> {
    const result = await (db as any)
      .select({ count: sql<number>`count(*)` })
      .from(assetMarketInfo)
      .innerJoin(
        assetMarketInfoToAssetMeta,
        eq(assetMarketInfo.id, assetMarketInfoToAssetMeta.assetMarketInfoId)
      )
      .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId));

    return result[0]?.count ?? 0;
  }

  // ============== 创建操作 ==============

  /**
   * 创建市场信息并关联 assetMeta
   */
  async createWithRelations(
    data: CreateAssetMarketInfoData,
    assetMetaIds: number[]
  ): Promise<AssetMarketInfoEntity> {
    const marketInfo = await this.create(data);

    // 创建关联记录
    if (assetMetaIds.length > 0) {
      await (db as any).insert(assetMarketInfoToAssetMeta).values(
        assetMetaIds.map((id) => ({
          assetMarketInfoId: marketInfo.id,
          assetMetaId: id,
        }))
      );
    }

    return marketInfo;
  }

  // ============== 删除操作 ==============

  /**
   * 根据 ID 删除
   */
  async deleteById(id: number): Promise<boolean> {
    return this.delete(id);
  }

  // ============== 关联表操作 ==============

  /**
   * 获取市场信息关联的 assetMeta IDs
   */
  async getRelatedAssetMetaIds(marketInfoId: number): Promise<number[]> {
    const relations = await (db as any)
      .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
      .from(assetMarketInfoToAssetMeta)
      .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, marketInfoId));

    return relations.map((r: any) => r.assetMetaId);
  }

  /**
   * 根据 assetMeta ID 获取关联的市场信息 IDs
   */
  async getMarketInfoIdsByAssetMetaId(assetMetaId: number): Promise<number[]> {
    const relations = await (db as any)
      .select({ assetMarketInfoId: assetMarketInfoToAssetMeta.assetMarketInfoId })
      .from(assetMarketInfoToAssetMeta)
      .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId));

    return relations.map((r: any) => r.assetMarketInfoId);
  }

  /**
   * 根据 assetMeta ID 获取市场信息列表
   */
  async findByAssetMetaId(assetMetaId: number, limit: number = 20, offset: number = 0): Promise<AssetMarketInfoEntity[]> {
    const results = await (db as any)
      .select({ info: assetMarketInfo })
      .from(assetMarketInfo)
      .innerJoin(
        assetMarketInfoToAssetMeta,
        eq(assetMarketInfo.id, assetMarketInfoToAssetMeta.assetMarketInfoId)
      )
      .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId))
      .orderBy(desc(assetMarketInfo.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map((r: any) => r.info as AssetMarketInfoEntity);
  }

  /**
   * 批量获取多个市场信息的关联资产详情
   */
  async getAssetMetaDetailsByMarketInfoIds(marketInfoIds: number[]): Promise<Map<number, AssetMetaDetail[]>> {
    if (marketInfoIds.length === 0) return new Map();

    // 获取关联关系
    const relations = await (db as any)
      .select()
      .from(assetMarketInfoToAssetMeta)
      .where(inArray(assetMarketInfoToAssetMeta.assetMarketInfoId, marketInfoIds));

    // 获取对应的 assetMeta 详情
    const assetMetaIds = [...new Set(relations.map((r: any) => r.assetMetaId as number))];
    let assetMetas: AssetMetaDetail[] = [];

    if (assetMetaIds.length > 0) {
      assetMetas = await (db as any)
        .select({
          id: assetMeta.id,
          symbol: assetMeta.symbol,
          chineseName: assetMeta.chineseName,
        })
        .from(assetMeta)
        .where(inArray(assetMeta.id, assetMetaIds as number[]));
    }

    // 构建结果 Map
    const result = new Map<number, AssetMetaDetail[]>();
    for (const relation of relations) {
      const marketInfoId = relation.assetMarketInfoId;
      const details = assetMetas.filter((m) => m.id === relation.assetMetaId);

      if (!result.has(marketInfoId)) {
        result.set(marketInfoId, []);
      }
      result.get(marketInfoId)!.push(...details);
    }

    return result;
  }
}

// 导出单例实例
export const assetMarketInfoRepository = new AssetMarketInfoRepository();