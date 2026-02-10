import { db } from '@server/lib/db';
import { assetMeta } from '@/drizzle/schema';
import { eq, like, asc, desc, isNull, and } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AssetMetaType } from '@/types/assetMeta';

export class AssetMetaService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 获取所有 assetMeta 记录
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns assetMeta 记录列表
   */
  async getAllAssetMetas(includeDeleted: boolean = false): Promise<AssetMetaType[]> {
    try {
      const whereClause = includeDeleted ? undefined : isNull(assetMeta.deletedAt);
      
      const assetMetas = await db.query.assetMeta.findMany({
        where: whereClause,
        orderBy: [asc(assetMeta.symbol)],
      });

      return assetMetas.map((asset: AssetMetaType) => ({
        ...asset,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
        updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : new Date(),
      }));
    } catch (error) {
      logger.error(`Failed to get all asset metas: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 根据 ID 获取 assetMeta 记录
   * @param id assetMeta ID
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns assetMeta 记录
   */
  async getAssetMetaById(id: number, includeDeleted: boolean = false): Promise<AssetMetaType | null> {
    try {
      const whereClause = includeDeleted 
        ? eq(assetMeta.id, id)
        : and(eq(assetMeta.id, id), isNull(assetMeta.deletedAt));
        
      const asset = await db.query.assetMeta.findFirst({
        where: whereClause,
      });

      return asset
        ? {
            ...asset,
            createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
          }
        : null;
    } catch (error) {
      logger.error(`Failed to get asset meta by id ${id}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 根据 symbol 搜索 assetMeta 记录
   * @param symbol 股票代码
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns assetMeta 记录列表
   */
  async searchAssetMetasBySymbol(symbol: string, includeDeleted: boolean = false): Promise<AssetMetaType[]> {
    try {
      const baseCondition = like(assetMeta.symbol, `%${symbol}%`);
      const whereClause = includeDeleted 
        ? baseCondition
        : and(baseCondition, isNull(assetMeta.deletedAt));
        
      const assetMetas = await db.query.assetMeta.findMany({
        where: whereClause,
        orderBy: [asc(assetMeta.symbol)],
      });

      return assetMetas.map((asset: AssetMetaType) => ({
        ...asset,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
      }));
    } catch (error) {
      logger.error(`Failed to search asset metas by symbol ${symbol}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 创建新的 assetMeta 记录
   * @param assetMetaData assetMeta 数据
   * @returns 创建的 assetMeta 记录
   */
  async createAssetMeta(
    assetMetaData: Omit<AssetMetaType, 'id' | 'createdAt'>,
  ): Promise<AssetMetaType> {
    try {
      const [newAssetMeta] = await db
        .insert(assetMeta)
        .values({
          symbol: assetMetaData.symbol,
          priceCents: assetMetaData.priceCents,
          assetType: assetMetaData.assetType,
          currency: assetMetaData.currency,
          createdAt: new Date(),
          updatedAt: new Date(),
          source: assetMetaData.source,
          market: assetMetaData.market,
          chineseName: assetMetaData.chineseName,
          investmentMemo: assetMetaData.investmentMemo,
        })
        .returning();

      return {
        ...newAssetMeta,
        createdAt: newAssetMeta.createdAt ? new Date(newAssetMeta.createdAt) : new Date(),
      };
    } catch (error) {
      logger.error(`Failed to create asset meta: ${error}`);
      throw new Error(`Database insert failed: ${error}`);
    }
  }

  /**
   * 更新 assetMeta 记录
   * @param id assetMeta ID
   * @param assetMetaData assetMeta 更新数据
   * @returns 更新的 assetMeta 记录
   */
  async updateAssetMeta(
    id: number,
    assetMetaData: Partial<Omit<AssetMetaType, 'id'>>,
  ): Promise<AssetMetaType | null> {
    try {
      const [updatedAssetMeta] = await db
        .update(assetMeta)
        .set({
          symbol: assetMetaData.symbol,
          priceCents: assetMetaData.priceCents,
          assetType: assetMetaData.assetType,
          currency: assetMetaData.currency,
          createdAt: assetMetaData.createdAt,
          updatedAt: new Date(),
          source: assetMetaData.source,
          market: assetMetaData.market,
          chineseName: assetMetaData.chineseName,
          investmentMemo: assetMetaData.investmentMemo,
        })
        .where(eq(assetMeta.id, id))
        .returning();

      return updatedAssetMeta
        ? {
            ...updatedAssetMeta,
            createdAt: updatedAssetMeta.createdAt
              ? new Date(updatedAssetMeta.createdAt)
              : new Date(),
          }
        : null;
    } catch (error) {
      logger.error(`Failed to update asset meta with id ${id}: ${error}`);
      throw new Error(`Database update failed: ${error}`);
    }
  }

  /**
   * 软删除 assetMeta 记录
   * @param id assetMeta ID
   * @returns 删除是否成功
   */
  async softDeleteAssetMeta(id: number): Promise<boolean> {
    try {
      const [result] = await db
        .update(assetMeta)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(assetMeta.id, id))
        .returning();

      const success = !!result;
      logger.info('[AssetMetaService] softDeleteAssetMeta result', {
        id,
        success,
      });
      return success;
    } catch (error) {
      logger.error(`Failed to soft delete asset meta with id ${id}: ${error}`);
      throw new Error(`Database soft delete failed: ${error}`);
    }
  }

  /**
   * 物理删除 assetMeta 记录（谨慎使用）
   * @param id assetMeta ID
   * @returns 删除是否成功
   */
  async hardDeleteAssetMeta(id: number): Promise<boolean> {
    try {
      const result = await db.delete(assetMeta).where(eq(assetMeta.id, id));

      logger.info('[AssetMetaService] hardDeleteAssetMeta result', {
        changes: result.rowsAffected,
      });
      return result.rowsAffected > 0;
    } catch (error) {
      logger.error(`Failed to hard delete asset meta with id ${id}: ${error}`);
      throw new Error(`Database hard delete failed: ${error}`);
    }
  }

  /**
   * 恢复已软删除的 assetMeta 记录
   * @param id assetMeta ID
   * @returns 恢复是否成功
   */
  async restoreAssetMeta(id: number): Promise<boolean> {
    try {
      const [result] = await db
        .update(assetMeta)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(assetMeta.id, id))
        .returning();

      const success = !!result;
      logger.info('[AssetMetaService] restoreAssetMeta result', {
        id,
        success,
      });
      return success;
    } catch (error) {
      logger.error(`Failed to restore asset meta with id ${id}: ${error}`);
      throw new Error(`Database restore failed: ${error}`);
    }
  }

  /**
   * 检查 assetMeta 记录是否已被软删除
   * @param id assetMeta ID
   * @returns 是否已删除
   */
  async isAssetMetaDeleted(id: number): Promise<boolean> {
    try {
      const asset = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.id, id),
        columns: { deletedAt: true },
      });

      return !!asset?.deletedAt;
    } catch (error) {
      logger.error(`Failed to check if asset meta is deleted with id ${id}: ${error}`);
      throw new Error(`Database query failed: ${error}`);
    }
  }
}

const assetMetaService = new AssetMetaService();

export default assetMetaService;
