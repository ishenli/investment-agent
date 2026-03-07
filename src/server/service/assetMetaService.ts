import { assetMetaRepository, type AssetMetaEntity } from '@server/repository/assetMetaRepository';
import logger from '@server/base/logger';
import { AssetMetaType } from '@/types/assetMeta';

// ============== DTO 转换函数 ==============

/**
 * 将实体转换为响应 DTO
 */
function toAssetMetaResponse(entity: AssetMetaEntity): AssetMetaType {
  return {
    ...entity,
    createdAt: entity.createdAt ? new Date(entity.createdAt) : new Date(),
    updatedAt: entity.updatedAt ? new Date(entity.updatedAt) : new Date(),
  };
}

export class AssetMetaService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  // ============== 查询操作 ==============

  /**
   * 获取所有 assetMeta 记录
   * @param includeDeleted 是否包含已删除的记录，默认为 false
   * @returns assetMeta 记录列表
   */
  async getAllAssetMetas(includeDeleted: boolean = false): Promise<AssetMetaType[]> {
    try {
      const assetMetas = await assetMetaRepository.findMany(undefined, {
        includeDeleted,
      });
      return assetMetas.map(toAssetMetaResponse);
    } catch (error) {
      logger.error(`Failed to get all asset metas: ${error}`);
      return []; // 读操作返回安全默认值
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
      const asset = await assetMetaRepository.findById(id, { includeDeleted });
      return asset ? toAssetMetaResponse(asset) : null;
    } catch (error) {
      logger.error(`Failed to get asset meta by id ${id}: ${error}`);
      return null; // 读操作返回安全默认值
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
      const assetMetas = await assetMetaRepository.searchBySymbol(symbol, includeDeleted);
      return assetMetas.map(toAssetMetaResponse);
    } catch (error) {
      logger.error(`Failed to search asset metas by symbol ${symbol}: ${error}`);
      return []; // 读操作返回安全默认值
    }
  }

  // ============== 创建操作 ==============

  /**
   * 创建新的 assetMeta 记录
   * @param assetMetaData assetMeta 数据
   * @returns 创建的 assetMeta 记录
   */
  async createAssetMeta(
    assetMetaData: Omit<AssetMetaType, 'id' | 'createdAt'>,
  ): Promise<AssetMetaType> {
    try {
      const newAssetMeta = await assetMetaRepository.createAssetMeta({
        symbol: assetMetaData.symbol,
        priceCents: assetMetaData.priceCents,
        assetType: assetMetaData.assetType,
        currency: assetMetaData.currency,
        source: assetMetaData.source,
        market: assetMetaData.market,
        chineseName: assetMetaData.chineseName,
        fullName: assetMetaData.fullName,
        logoUrl: assetMetaData.logoUrl,
        investmentMemo: assetMetaData.investmentMemo,
      });

      logger.info(`[AssetMetaService] Created asset meta: ${newAssetMeta.id}`);
      return toAssetMetaResponse(newAssetMeta);
    } catch (error) {
      logger.error(`Failed to create asset meta: ${error}`);
      throw error; // 写操作重新抛出
    }
  }

  // ============== 更新操作 ==============

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
      const updated = await assetMetaRepository.updateAssetMeta(id, {
        symbol: assetMetaData.symbol,
        priceCents: assetMetaData.priceCents,
        assetType: assetMetaData.assetType,
        currency: assetMetaData.currency,
        source: assetMetaData.source,
        market: assetMetaData.market,
        chineseName: assetMetaData.chineseName,
        fullName: assetMetaData.fullName,
        logoUrl: assetMetaData.logoUrl,
        investmentMemo: assetMetaData.investmentMemo,
      });

      if (!updated) {
        return null;
      }

      logger.info(`[AssetMetaService] Updated asset meta: ${id}`);
      return toAssetMetaResponse(updated);
    } catch (error) {
      logger.error(`Failed to update asset meta with id ${id}: ${error}`);
      throw error; // 写操作重新抛出
    }
  }

  // ============== 软删除操作 ==============

  /**
   * 软删除 assetMeta 记录
   * @param id assetMeta ID
   * @returns 删除是否成功
   */
  async softDeleteAssetMeta(id: number): Promise<boolean> {
    try {
      const success = await assetMetaRepository.softDelete(id);
      logger.info(`[AssetMetaService] Soft delete asset meta: ${id}, success: ${success}`);
      return success;
    } catch (error) {
      logger.error(`Failed to soft delete asset meta with id ${id}: ${error}`);
      throw error; // 写操作重新抛出
    }
  }

  /**
   * 物理删除 assetMeta 记录（谨慎使用）
   * @param id assetMeta ID
   * @returns 删除是否成功
   */
  async hardDeleteAssetMeta(id: number): Promise<boolean> {
    try {
      const success = await assetMetaRepository.delete(id);
      logger.info(`[AssetMetaService] Hard delete asset meta: ${id}, success: ${success}`);
      return success;
    } catch (error) {
      logger.error(`Failed to hard delete asset meta with id ${id}: ${error}`);
      throw error; // 写操作重新抛出
    }
  }

  /**
   * 恢复已软删除的 assetMeta 记录
   * @param id assetMeta ID
   * @returns 恢复是否成功
   */
  async restoreAssetMeta(id: number): Promise<boolean> {
    try {
      const restored = await assetMetaRepository.restore(id);
      logger.info(`[AssetMetaService] Restore asset meta: ${id}, success: ${!!restored}`);
      return !!restored;
    } catch (error) {
      logger.error(`Failed to restore asset meta with id ${id}: ${error}`);
      throw error; // 写操作重新抛出
    }
  }

  /**
   * 检查 assetMeta 记录是否已被软删除
   * @param id assetMeta ID
   * @returns 是否已删除
   */
  async isAssetMetaDeleted(id: number): Promise<boolean> {
    try {
      const asset = await assetMetaRepository.findById(id, { includeDeleted: true });
      return !!asset?.deletedAt;
    } catch (error) {
      logger.error(`Failed to check if asset meta is deleted with id ${id}: ${error}`);
      return false; // 读操作返回安全默认值
    }
  }
}

const assetMetaService = new AssetMetaService();

export default assetMetaService;