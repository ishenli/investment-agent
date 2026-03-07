/**
 * Asset Company Info Repository
 *
 * 数据访问层：负责 asset_company_info 表的数据库操作
 */
import { assetCompanyInfo, assetMeta } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@server/lib/db';
import { BaseIntRepository, type CreateData, type UpdateData } from './base';

/**
 * Asset Company Info 实体类型
 */
export type AssetCompanyInfoEntity = typeof assetCompanyInfo.$inferSelect;

/**
 * 创建 Asset Company Info 数据类型
 */
export type CreateAssetCompanyInfoData = Omit<AssetCompanyInfoEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新 Asset Company Info 数据类型
 */
export type UpdateAssetCompanyInfoData = Partial<Omit<AssetCompanyInfoEntity, 'id' | 'assetMetaId' | 'createdAt' | 'updatedAt'>>;

/**
 * Asset Company Info Repository
 * 管理资产公司信息
 */
export class AssetCompanyInfoRepository extends BaseIntRepository<AssetCompanyInfoEntity> {
  constructor() {
    super(assetCompanyInfo);
  }

  // ============== 查询操作 ==============

  /**
   * 根据 ID 查询公司信息
   */
  async findById(id: number): Promise<AssetCompanyInfoEntity | null> {
    return this.findOne(eq(assetCompanyInfo.id, id));
  }

  /**
   * 根据 assetMeta ID 查询公司信息列表
   */
  async findByAssetMetaId(assetMetaId: number, limit: number = 20, offset: number = 0): Promise<AssetCompanyInfoEntity[]> {
    return this.findMany(eq(assetCompanyInfo.assetMetaId, assetMetaId), {
      orderBy: [desc(assetCompanyInfo.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * 根据 assetMeta ID 获取最新的公司信息
   */
  async findLatestByAssetMetaId(assetMetaId: number): Promise<AssetCompanyInfoEntity | null> {
    const results = await this.findMany(eq(assetCompanyInfo.assetMetaId, assetMetaId), {
      orderBy: [desc(assetCompanyInfo.createdAt)],
      limit: 1,
    });
    return results[0] ?? null;
  }

  /**
   * 根据符号获取最新的公司信息
   */
  async findLatestBySymbol(symbol: string): Promise<AssetCompanyInfoEntity | null> {
    // 先获取 assetMeta ID
    const meta = await (db as any)
      .select({ id: assetMeta.id })
      .from(assetMeta)
      .where(eq(assetMeta.symbol, symbol))
      .limit(1);

    if (meta.length === 0) return null;

    return this.findLatestByAssetMetaId(meta[0].id);
  }

  /**
   * 统计 assetMeta ID 的公司信息数量
   */
  async countByAssetMetaId(assetMetaId: number): Promise<number> {
    return this.count(eq(assetCompanyInfo.assetMetaId, assetMetaId));
  }

  // ============== 创建操作 ==============

  /**
   * 创建公司信息
   */
  async createCompanyInfo(data: CreateAssetCompanyInfoData): Promise<AssetCompanyInfoEntity> {
    return this.create(data);
  }

  // ============== 更新操作 ==============

  /**
   * 更新公司信息
   */
  async updateCompanyInfo(id: number, data: UpdateAssetCompanyInfoData): Promise<AssetCompanyInfoEntity | null> {
    return this.update(id, data);
  }

  // ============== 删除操作 ==============

  /**
   * 根据 ID 删除
   */
  async deleteById(id: number): Promise<boolean> {
    return this.delete(id);
  }
}

// 导出单例实例
export const assetCompanyInfoRepository = new AssetCompanyInfoRepository();