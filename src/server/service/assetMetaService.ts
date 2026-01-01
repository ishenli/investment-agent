import { db } from '@server/lib/db';
import { assetMeta } from '@/drizzle/schema';
import { eq, like, asc, desc } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AssetMetaType } from '@/types/assetMeta';

export class AssetMetaService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 获取所有 assetMeta 记录
   * @returns assetMeta 记录列表
   */
  async getAllAssetMetas(): Promise<AssetMetaType[]> {
    try {
      const assetMetas = await db.query.assetMeta.findMany({
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
   * @returns assetMeta 记录
   */
  async getAssetMetaById(id: number): Promise<AssetMetaType | null> {
    try {
      const asset = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.id, id),
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
   * @returns assetMeta 记录列表
   */
  async searchAssetMetasBySymbol(symbol: string): Promise<AssetMetaType[]> {
    try {
      const assetMetas = await db.query.assetMeta.findMany({
        where: like(assetMeta.symbol, `%${symbol}%`),
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
            createdAt: updatedAssetMeta.createdAt ? new Date(updatedAssetMeta.createdAt) : new Date(),
          }
        : null;
    } catch (error) {
      logger.error(`Failed to update asset meta with id ${id}: ${error}`);
      throw new Error(`Database update failed: ${error}`);
    }
  }

  /**
   * 删除 assetMeta 记录
   * @param id assetMeta ID
   * @returns 删除是否成功
   */
  async deleteAssetMeta(id: number): Promise<boolean> {
    try {
      const result = await db.delete(assetMeta).where(eq(assetMeta.id, id));

      logger.info('[AssetMetaService] deleteAssetMeta result', {
        result,
      });
      return result.lastInsertRowid === 0;
    } catch (error) {
      logger.error(`Failed to delete asset meta with id ${id}: ${error}`);
      throw new Error(`Database delete failed: ${error}`);
    }
  }
}

const assetMetaService = new AssetMetaService();

export default assetMetaService;
