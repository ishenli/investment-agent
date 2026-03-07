import {
  assetMarketInfoRepository,
  type AssetMarketInfoEntity,
  type AssetMetaDetail,
} from '@server/repository/assetMarketInfoRepository';
import { assetMetaRepository } from '@server/repository/assetMetaRepository';
import logger from '@server/base/logger';
import {
  CreateAssetMarketInfoRequest,
  AssetMarketInfoType,
  AssetMetaDetails,
} from '@/types/marketInfo';

// ============== DTO 转换函数 ==============

/**
 * 将实体转换为响应 DTO
 */
function toAssetMarketInfoResponse(
  entity: AssetMarketInfoEntity,
  assetMetaIds: number[],
  assetMetas: AssetMetaDetail[]
): AssetMarketInfoType {
  return {
    id: entity.id,
    assetMetaIds,
    assetMetas: assetMetas.map((m) => ({
      id: m.id,
      symbol: m.symbol,
      chineseName: m.chineseName,
    })),
    title: entity.title,
    symbol: entity.symbol,
    sentiment: entity.sentiment,
    importance: entity.importance,
    summary: entity.summary,
    keyTopics: entity.keyTopics,
    marketImpact: entity.marketImpact,
    keyDataPoints: entity.keyDataPoints,
    sourceUrl: entity.sourceUrl,
    sourceName: entity.sourceName,
    originalContent: entity.originalContent,
    contentMode: entity.contentMode as 'ai_summary' | 'original',
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  };
}

export class AssetMarketInfoService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  // ============== 创建操作 ==============

  /**
   * 创建新的 assetMarketInfo 记录
   * @param request 创建请求
   * @returns 创建的 assetMarketInfo 记录
   */
  async createAssetMarketInfo(request: CreateAssetMarketInfoRequest): Promise<AssetMarketInfoType> {
    try {
      logger.info('[AssetMarketInfoService] 开始创建资产市场信息: %s', request.symbol);

      // 检查 assetMeta 是否存在
      const existingAssetMetas = await assetMetaRepository.findByIds(request.assetMetaIds);

      if (existingAssetMetas.length !== request.assetMetaIds.length) {
        throw new Error(`Some AssetMetas not found`);
      }

      // 创建 assetMarketInfo 记录及关联
      const newAssetMarketInfo = await assetMarketInfoRepository.createWithRelations(
        {
          title: request.title,
          symbol: request.symbol || existingAssetMetas.map((m) => m.symbol).join(','),
          sentiment: request.sentiment,
          importance: request.importance,
          summary: request.summary,
          keyTopics: request.keyTopics || null,
          marketImpact: request.marketImpact,
          keyDataPoints: request.keyDataPoints || null,
          sourceUrl: request.sourceUrl || null,
          sourceName: request.sourceName || null,
          originalContent: request.originalContent || null,
          contentMode: request.contentMode,
        },
        request.assetMetaIds
      );

      logger.info('[AssetMarketInfoService] 成功创建资产市场信息: %d', newAssetMarketInfo.id);

      const assetMetasDetails: AssetMetaDetails[] = existingAssetMetas.map((meta) => ({
        id: meta.id,
        symbol: meta.symbol,
        chineseName: meta.chineseName,
      }));

      return toAssetMarketInfoResponse(newAssetMarketInfo, request.assetMetaIds, assetMetasDetails);
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 创建资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ============== 查询操作 ==============

  /**
   * 根据 ID 获取 assetMarketInfo 记录
   * @param id assetMarketInfo ID
   * @returns assetMarketInfo 记录
   */
  async getAssetMarketInfoById(id: number): Promise<AssetMarketInfoType | null> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息: %d', id);

      const assetMarketInfoRecord = await assetMarketInfoRepository.findById(id);

      if (!assetMarketInfoRecord) {
        return null;
      }

      // 获取关联的 assetMeta IDs 和详情
      const relatedAssetMetaIds = await assetMarketInfoRepository.getRelatedAssetMetaIds(id);
      const assetMetasDetails = await this.getAssetMetaDetails(relatedAssetMetaIds);

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

      return toAssetMarketInfoResponse(assetMarketInfoRecord, relatedAssetMetaIds, assetMetasDetails);
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * 根据 symbol 获取最新的 assetMarketInfo 记录
   */
  async getLatestAssetMarketInfoBySymbol(symbol: string): Promise<AssetMarketInfoType | null> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息: %s', symbol);

      // 首先尝试通过关联表查找
      const assetMetas = await assetMetaRepository.findBySymbol(symbol)
        ? [await assetMetaRepository.findBySymbol(symbol)]
        : [];

      const assetMetaRecords = assetMetas.filter(Boolean) as AssetMetaDetail[];
      let assetMarketInfoRecord: AssetMarketInfoEntity | null = null;

      if (assetMetaRecords.length > 0) {
        const assetMetaIds = assetMetaRecords.map((meta) => meta.id);
        const marketInfoIds = await Promise.all(
          assetMetaIds.map((id) => assetMarketInfoRepository.getMarketInfoIdsByAssetMetaId(id))
        );
        const allMarketInfoIds = [...new Set(marketInfoIds.flat())];

        if (allMarketInfoIds.length > 0) {
          // 获取最新的记录
          const allRecords = await Promise.all(
            allMarketInfoIds.map((id) => assetMarketInfoRepository.findById(id))
          );
          const validRecords = allRecords.filter(Boolean) as AssetMarketInfoEntity[];
          if (validRecords.length > 0) {
            assetMarketInfoRecord = validRecords.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
          }
        }
      }

      // 回退：直接通过 symbol 查找
      if (!assetMarketInfoRecord) {
        assetMarketInfoRecord = await assetMarketInfoRepository.findLatestBySymbol(symbol);
      }

      if (!assetMarketInfoRecord) {
        return null;
      }

      // 获取关联的 assetMeta IDs 和详情
      const relatedAssetMetaIds = await assetMarketInfoRepository.getRelatedAssetMetaIds(
        assetMarketInfoRecord.id
      );
      const assetMetasDetails = await this.getAssetMetaDetails(relatedAssetMetaIds);

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

      return toAssetMarketInfoResponse(assetMarketInfoRecord, relatedAssetMetaIds, assetMetasDetails);
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * 根据 assetMetaId 获取最新的 assetMarketInfo 记录
   * @param assetMetaId assetMeta ID
   * @returns assetMarketInfo 记录
   */
  async getLatestAssetMarketInfoByAssetMetaId(
    assetMetaId: number,
  ): Promise<AssetMarketInfoType | null> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息: %d', assetMetaId);

      // 通过关联表查找
      const marketInfoIds = await assetMarketInfoRepository.getMarketInfoIdsByAssetMetaId(assetMetaId);

      let assetMarketInfoRecord: AssetMarketInfoEntity | null = null;

      if (marketInfoIds.length > 0) {
        // 获取最新的记录
        const records = await assetMarketInfoRepository.findByAssetMetaId(assetMetaId, 1, 0);
        assetMarketInfoRecord = records[0] ?? null;
      }

      // 向后兼容：如果通过关联表找不到，则尝试直接通过 symbol 查找
      if (!assetMarketInfoRecord) {
        const assetMetaRecord = await assetMetaRepository.findById(assetMetaId);
        if (assetMetaRecord) {
          assetMarketInfoRecord = await assetMarketInfoRepository.findLatestBySymbol(assetMetaRecord.symbol);
        }
      }

      if (!assetMarketInfoRecord) {
        return null;
      }

      // 获取关联的 assetMeta IDs 和详情
      const relatedAssetMetaIds = await assetMarketInfoRepository.getRelatedAssetMetaIds(
        assetMarketInfoRecord.id
      );
      const finalAssetMetaIds = relatedAssetMetaIds.length > 0 ? relatedAssetMetaIds : [assetMetaId];
      const assetMetasDetails = await this.getAssetMetaDetails(finalAssetMetaIds);

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

      return toAssetMarketInfoResponse(assetMarketInfoRecord, finalAssetMetaIds, assetMetasDetails);
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * 获取最新的 assetMarketInfo 记录列表
   * @param limit 限制返回的记录数
   * @returns assetMarketInfo 记录列表
   */
  async getLatestAssetMarketInfos(limit: number = 20): Promise<AssetMarketInfoType[]> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取最新的资产市场信息，限制数量: %d', limit);

      const records = await assetMarketInfoRepository.findLatest(limit);

      logger.info(
        '[AssetMarketInfoService] 成功获取资产市场信息列表，数量: %d',
        records.length,
      );

      // 批量获取关联的 assetMeta 详情
      const infoIds = records.map((r) => r.id);
      const detailsMap = await assetMarketInfoRepository.getAssetMetaDetailsByMarketInfoIds(infoIds);

      return records.map((record) => {
        const details = detailsMap.get(record.id) ?? [];
        const assetMetaIds = details.map((d) => d.id);
        return toAssetMarketInfoResponse(record, assetMetaIds, details);
      });
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取最新的资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * 根据时间范围获取 assetMarketInfo 记录列表
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param limit 限制返回的记录数
   * @returns assetMarketInfo 记录列表
   */
  async getAssetMarketInfosByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
  ): Promise<AssetMarketInfoType[]> {
    try {
      logger.info(
        '[AssetMarketInfoService] 开始获取时间范围内的资产市场信息: %s 到 %s',
        startDate.toISOString(),
        endDate.toISOString(),
      );

      const records = await assetMarketInfoRepository.findByDateRange(startDate, endDate, limit);

      logger.info(
        '[AssetMarketInfoService] 成功获取时间范围内的资产市场信息，数量: %d',
        records.length,
      );

      // 批量获取关联的 assetMeta 详情
      const infoIds = records.map((r) => r.id);
      const detailsMap = await assetMarketInfoRepository.getAssetMetaDetailsByMarketInfoIds(infoIds);

      return records.map((record) => {
        const details = detailsMap.get(record.id) ?? [];
        const assetMetaIds = details.map((d) => d.id);
        return toAssetMarketInfoResponse(record, assetMetaIds, details);
      });
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取时间范围内的资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * 根据 assetMetaId 获取所有 assetMarketInfo 记录
   * @param assetMetaId assetMeta ID
   * @param limit 限制返回的记录数
   * @param offset 偏移量，用于分页
   * @returns assetMarketInfo 记录列表
   */
  async getAssetMarketInfosByAssetMetaId(
    assetMetaId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<AssetMarketInfoType[]> {
    try {
      logger.info(
        '[AssetMarketInfoService] 开始获取资产市场信息列表: %d, limit: %d, offset: %d',
        assetMetaId,
        limit,
        offset,
      );

      const records = await assetMarketInfoRepository.findByAssetMetaId(assetMetaId, limit, offset);

      logger.info(
        '[AssetMarketInfoService] 成功获取资产市场信息列表，数量: %d',
        records.length,
      );

      // 批量获取关联的 assetMeta 详情
      const infoIds = records.map((r) => r.id);
      const detailsMap = await assetMarketInfoRepository.getAssetMetaDetailsByMarketInfoIds(infoIds);

      return records.map((record) => {
        const details = detailsMap.get(record.id) ?? [];
        const assetMetaIds = details.map((d) => d.id);
        return toAssetMarketInfoResponse(record, assetMetaIds, details);
      });
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息列表失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * 根据 assetMetaId 获取 assetMarketInfo 记录总数
   * @param assetMetaId assetMeta ID
   * @returns 记录总数
   */
  async getAssetMarketInfoCountByAssetMetaId(assetMetaId: number): Promise<number> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息总数: %d', assetMetaId);

      const count = await assetMarketInfoRepository.countByAssetMetaId(assetMetaId);

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息总数: %d', count);

      return count;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息总数失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      return 0;
    }
  }

  // ============== 删除操作 ==============

  /**
   * 根据 ID 删除 assetMarketInfo 记录
   * @param id assetMarketInfo ID
   * @returns 删除是否成功
   */
  async deleteAssetMarketInfoById(id: number): Promise<boolean> {
    try {
      logger.info('[AssetMarketInfoService] 开始删除资产市场信息: %d', id);

      const success = await assetMarketInfoRepository.deleteById(id);

      logger.info('[AssetMarketInfoService] 成功删除资产市场信息: %d', id);

      return success;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 删除资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ============== 私有辅助方法 ==============

  /**
   * 获取 assetMeta 详情列表
   */
  private async getAssetMetaDetails(assetMetaIds: number[]): Promise<AssetMetaDetail[]> {
    if (assetMetaIds.length === 0) return [];

    const metas = await assetMetaRepository.findByIds(assetMetaIds);
    return metas.map((m) => ({
      id: m.id,
      symbol: m.symbol,
      chineseName: m.chineseName,
    }));
  }
}

const assetMarketInfoService = new AssetMarketInfoService();

export default assetMarketInfoService;