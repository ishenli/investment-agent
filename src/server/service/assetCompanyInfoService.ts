import { assetCompanyInfoRepository, type AssetCompanyInfoEntity } from '@server/repository/assetCompanyInfoRepository';
import { assetMetaRepository } from '@server/repository/assetMetaRepository';
import logger from '@server/base/logger';

// ============== 类型定义 ==============

export type AssetCompanyInfoType = {
  id: number;
  assetMetaId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAssetCompanyInfoRequest = {
  assetMetaId: number;
  title: string;
  content: string;
  symbol?: string; // Optional, used for logging or if we need to find assetMeta by symbol in future
};

export type UpdateAssetCompanyInfoRequest = {
  id: number;
  title?: string;
  content?: string;
};

// ============== DTO 转换函数 ==============

/**
 * 将实体转换为响应 DTO
 */
function toAssetCompanyInfoResponse(entity: AssetCompanyInfoEntity): AssetCompanyInfoType {
  return {
    id: entity.id,
    assetMetaId: entity.assetMetaId,
    title: entity.title,
    content: entity.content,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  };
}

export class AssetCompanyInfoService {
  constructor() {
    // Database connection is initialized in db.ts
  }

  // ============== 创建操作 ==============

  /**
   * Create a new assetCompanyInfo record
   * @param request Create request
   * @returns Created assetCompanyInfo record
   */
  async createAssetCompanyInfo(
    request: CreateAssetCompanyInfoRequest,
  ): Promise<AssetCompanyInfoType> {
    try {
      // Check if assetMeta exists
      const existingAssetMeta = await assetMetaRepository.findById(request.assetMetaId);

      if (!existingAssetMeta) {
        throw new Error(`AssetMeta with id ${request.assetMetaId} not found`);
      }

      // Create assetCompanyInfo record
      const newAssetCompanyInfo = await assetCompanyInfoRepository.createCompanyInfo({
        assetMetaId: request.assetMetaId,
        title: request.title,
        content: request.content,
      });

      logger.info(
        `[AssetCompanyInfoService] Successfully created asset company info: ${newAssetCompanyInfo.id}`,
      );

      return toAssetCompanyInfoResponse(newAssetCompanyInfo);
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to create asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ============== 更新操作 ==============

  /**
   * Update an existing assetCompanyInfo record
   * @param request Update request
   * @returns Updated assetCompanyInfo record
   */
  async updateAssetCompanyInfo(
    request: UpdateAssetCompanyInfoRequest,
  ): Promise<AssetCompanyInfoType> {
    try {
      const updateData: { title?: string; content?: string } = {};

      if (request.title !== undefined) updateData.title = request.title;
      if (request.content !== undefined) updateData.content = request.content;

      const updatedAssetCompanyInfo = await assetCompanyInfoRepository.updateCompanyInfo(
        request.id,
        updateData,
      );

      if (!updatedAssetCompanyInfo) {
        throw new Error(`AssetCompanyInfo with id ${request.id} not found`);
      }

      logger.info(
        `[AssetCompanyInfoService] Successfully updated asset company info: ${updatedAssetCompanyInfo.id}`,
      );

      return toAssetCompanyInfoResponse(updatedAssetCompanyInfo);
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to update asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ============== 查询操作 ==============

  /**
   * Get assetCompanyInfo records by assetMetaId
   * @param assetMetaId assetMeta ID
   * @param limit Limit number of records
   * @param offset Offset for pagination
   * @returns List of assetCompanyInfo records
   */
  async getAssetCompanyInfosByAssetMetaId(
    assetMetaId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<AssetCompanyInfoType[]> {
    try {
      const records = await assetCompanyInfoRepository.findByAssetMetaId(
        assetMetaId,
        limit,
        offset,
      );

      logger.info(
        `[AssetCompanyInfoService] Successfully got asset company info list, count: ${records.length}`,
      );

      return records.map(toAssetCompanyInfoResponse);
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get asset company info list: %s',
        error instanceof Error ? error.message : String(error),
      );
      return []; // 读操作返回安全默认值
    }
  }

  /**
   * Get latest assetCompanyInfo by symbol
   */
  async getLatestAssetCompanyInfoBySymbol(symbol: string): Promise<AssetCompanyInfoType | null> {
    try {
      const record = await assetCompanyInfoRepository.findLatestBySymbol(symbol);

      logger.info(
        `[AssetCompanyInfoService] Successfully got latest asset company info by symbol: ${symbol}`,
      );

      return record ? toAssetCompanyInfoResponse(record) : null;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get latest asset company info by symbol: %s',
        error instanceof Error ? error.message : String(error),
      );
      return null; // 读操作返回安全默认值
    }
  }

  /**
   * Get count of assetCompanyInfo records by assetMetaId
   * @param assetMetaId assetMeta ID
   * @returns Count of assetCompanyInfo records
   */
  async getAssetCompanyInfoCountByAssetMetaId(assetMetaId: number): Promise<number> {
    try {
      const count = await assetCompanyInfoRepository.countByAssetMetaId(assetMetaId);

      logger.info(
        `[AssetCompanyInfoService] Successfully got asset company info count: ${count}`,
      );

      return count;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get asset company info count: %s',
        error instanceof Error ? error.message : String(error),
      );
      return 0; // 读操作返回安全默认值
    }
  }

  // ============== 删除操作 ==============

  /**
   * Delete assetCompanyInfo record by ID
   * @param id assetCompanyInfo ID
   * @returns Whether deletion was successful
   */
  async deleteAssetCompanyInfoById(id: number): Promise<boolean> {
    try {
      const success = await assetCompanyInfoRepository.deleteById(id);

      logger.info(`[AssetCompanyInfoService] Successfully deleted asset company info: ${id}`);

      return success;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to delete asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

const assetCompanyInfoService = new AssetCompanyInfoService();

export default assetCompanyInfoService;