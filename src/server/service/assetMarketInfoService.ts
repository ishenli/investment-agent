import { db } from '@server/lib/db';
import { assetMarketInfo, assetMeta, assetMarketInfoToAssetMeta } from '@/drizzle/schema';
import { eq, desc, gte, lte, sql, inArray, and } from 'drizzle-orm';
import logger from '@server/base/logger';
import { CreateAssetMarketInfoRequest, AssetMarketInfoType, AssetMetaDetails } from '@/types/marketInfo';


export class AssetMarketInfoService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 创建新的 assetMarketInfo 记录
   * @param request 创建请求
   * @returns 创建的 assetMarketInfo 记录
   */
  async createAssetMarketInfo(request: CreateAssetMarketInfoRequest): Promise<AssetMarketInfoType> {
    try {
      logger.info('[AssetMarketInfoService] 开始创建资产市场信息: %s', request.symbol);

      // 检查 assetMeta 是否存在
      const existingAssetMetas = await db.query.assetMeta.findMany({
        where: inArray(assetMeta.id, request.assetMetaIds),
      });

      if (existingAssetMetas.length !== request.assetMetaIds.length) {
        throw new Error(`Some AssetMetas not found`);
      }

      // 创建 assetMarketInfo 记录
      const [newAssetMarketInfo] = await db
        .insert(assetMarketInfo)
        .values({
          title: request.title,
          symbol: request.symbol || existingAssetMetas.map(m => m.symbol).join(','),
          sentiment: request.sentiment,
          importance: request.importance,
          summary: request.summary,
          keyTopics: request.keyTopics,
          marketImpact: request.marketImpact,
          keyDataPoints: request.keyDataPoints,
          sourceUrl: request.sourceUrl,
          sourceName: request.sourceName,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 创建关联记录
      if (request.assetMetaIds.length > 0) {
        await db.insert(assetMarketInfoToAssetMeta).values(
          request.assetMetaIds.map((id) => ({
            assetMarketInfoId: newAssetMarketInfo.id,
            assetMetaId: id,
          }))
        );
      }

      logger.info('[AssetMarketInfoService] 成功创建资产市场信息: %d', newAssetMarketInfo.id);

      // 获取关联的 assetMeta 详细信息
      const assetMetasDetails = existingAssetMetas.map(meta => ({
        id: meta.id,
        symbol: meta.symbol,
        chineseName: meta.chineseName,
      }));

      return {
        id: newAssetMarketInfo.id,
        assetMetaIds: request.assetMetaIds,
        assetMetas: assetMetasDetails,
        title: newAssetMarketInfo.title,
        symbol: newAssetMarketInfo.symbol,
        sentiment: newAssetMarketInfo.sentiment,
        importance: newAssetMarketInfo.importance,
        summary: newAssetMarketInfo.summary,
        keyTopics: newAssetMarketInfo.keyTopics,
        marketImpact: newAssetMarketInfo.marketImpact,
        keyDataPoints: newAssetMarketInfo.keyDataPoints,
        sourceUrl: newAssetMarketInfo.sourceUrl,
        sourceName: newAssetMarketInfo.sourceName,
        createdAt: new Date(newAssetMarketInfo.createdAt),
        updatedAt: new Date(newAssetMarketInfo.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 创建资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `创建资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 根据 symbol 获取最新的 assetMarketInfo 记录
   */
  async getLatestAssetMarketInfoBySymbol(symbol: string): Promise<AssetMarketInfoType | null> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息: %s', symbol);

      // 首先尝试通过关联表查找
      // 获取与指定symbol相关的assetMeta IDs
      const assetMetas = await db.query.assetMeta.findMany({
        where: eq(assetMeta.symbol, symbol),
      });

      if (assetMetas.length > 0) {
        const assetMetaIds = assetMetas.map(meta => meta.id);
        
        // 通过assetMeta IDs查找关联的assetMarketInfo IDs
        const assetMarketInfoIds = await db
          .selectDistinct({ assetMarketInfoId: assetMarketInfoToAssetMeta.assetMarketInfoId })
          .from(assetMarketInfoToAssetMeta)
          .where(inArray(assetMarketInfoToAssetMeta.assetMetaId, assetMetaIds));

        if (assetMarketInfoIds.length > 0) {
          // 获取最新的 assetMarketInfo 记录
          const assetMarketInfos = await db
            .select()
            .from(assetMarketInfo)
            .where(inArray(assetMarketInfo.id, assetMarketInfoIds.map(item => item.assetMarketInfoId)))
            .orderBy(desc(assetMarketInfo.createdAt))
            .limit(1);

          if (assetMarketInfos.length > 0) {
            const latestRecord = assetMarketInfos[0];
            
            // 获取所有关联的 assetMeta IDs
            const relatedMetas = await db
              .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
              .from(assetMarketInfoToAssetMeta)
              .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, latestRecord.id));

            const assetMetaIds = relatedMetas.map(r => r.assetMetaId);
            
            // 获取关联的 assetMeta 详细信息
            const assetMetasDetails = assetMetas.map(meta => ({
              id: meta.id,
              symbol: meta.symbol,
              chineseName: meta.chineseName,
            }));

            logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', latestRecord.id);

            return {
              id: latestRecord.id,
              assetMetaIds: assetMetaIds,
              assetMetas: assetMetasDetails,
              title: latestRecord.title,
              symbol: latestRecord.symbol,
              sentiment: latestRecord.sentiment,
              importance: latestRecord.importance,
              summary: latestRecord.summary,
              keyTopics: latestRecord.keyTopics,
              marketImpact: latestRecord.marketImpact,
              keyDataPoints: latestRecord.keyDataPoints,
              sourceUrl: latestRecord.sourceUrl,
              sourceName: latestRecord.sourceName,
              createdAt: new Date(latestRecord.createdAt),
              updatedAt: new Date(latestRecord.updatedAt),
            };
          }
        }
      }

      // 回退到直接通过symbol查找（向后兼容）
      const assetMarketInfoRecords = await db
        .select()
        .from(assetMarketInfo)
        .where(eq(assetMarketInfo.symbol, symbol))
        .orderBy(desc(assetMarketInfo.createdAt))
        .limit(1);

      if (assetMarketInfoRecords.length === 0) {
        return null;
      }

      const latestRecord = assetMarketInfoRecords[0];
      
      // 获取所有关联的 assetMeta IDs
      const relatedMetas = await db
        .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
        .from(assetMarketInfoToAssetMeta)
        .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, latestRecord.id));

      // 向后兼容：如果在关联表中找不到关联记录，则尝试通过symbol查找
      let finalAssetMetaIds: number[] = relatedMetas.map(r => r.assetMetaId);
      let assetMetasDetails: AssetMetaDetails[] = [];
      if (finalAssetMetaIds.length === 0 && latestRecord.symbol) {
        try {
          // 尝试通过symbol查找对应的assetMeta
          const symbolBasedMetas = await db.query.assetMeta.findMany({
            where: eq(assetMeta.symbol, latestRecord.symbol),
          });
          
          finalAssetMetaIds = symbolBasedMetas.map(meta => meta.id);
          assetMetasDetails = symbolBasedMetas.map(meta => ({
            id: meta.id,
            symbol: meta.symbol,
            chineseName: meta.chineseName,
          }));
        } catch (symbolLookupError) {
          logger.warn(
            '[AssetMarketInfoService] 通过symbol查找assetMeta失败: %s',
            symbolLookupError instanceof Error ? symbolLookupError.message : String(symbolLookupError),
          );
        }
      }

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', latestRecord.id);

      return {
        id: latestRecord.id,
        assetMetaIds: finalAssetMetaIds,
        assetMetas: assetMetasDetails,
        title: latestRecord.title,
        symbol: latestRecord.symbol,
        sentiment: latestRecord.sentiment,
        importance: latestRecord.importance,
        summary: latestRecord.summary,
        keyTopics: latestRecord.keyTopics,
        marketImpact: latestRecord.marketImpact,
        keyDataPoints: latestRecord.keyDataPoints,
        sourceUrl: latestRecord.sourceUrl,
        sourceName: latestRecord.sourceName,
        createdAt: new Date(latestRecord.createdAt),
        updatedAt: new Date(latestRecord.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      // 使用子查询先获取 assetMarketInfo IDs
      const assetMarketInfoIds = await db
        .select({ id: assetMarketInfo.id })
        .from(assetMarketInfo)
        .innerJoin(assetMarketInfoToAssetMeta, eq(assetMarketInfo.id, assetMarketInfoToAssetMeta.assetMarketInfoId))
        .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId));

      if (assetMarketInfoIds.length === 0) {
        // 向后兼容：如果通过关联表找不到，则尝试直接通过symbol查找
        const assetMetaRecord = await db.query.assetMeta.findFirst({
          where: eq(assetMeta.id, assetMetaId),
        });
        
        if (!assetMetaRecord) {
          return null;
        }
        
        // 通过symbol查找assetMarketInfo
        const symbolBasedRecords = await db
          .select()
          .from(assetMarketInfo)
          .where(eq(assetMarketInfo.symbol, assetMetaRecord.symbol))
          .orderBy(desc(assetMarketInfo.createdAt))
          .limit(1);
        
        if (symbolBasedRecords.length === 0) {
          return null;
        }
        
        const assetMarketInfoRecord = symbolBasedRecords[0];
        
        // 获取关联的assetMeta IDs
        const relatedMetas = await db
          .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
          .from(assetMarketInfoToAssetMeta)
          .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, assetMarketInfoRecord.id));
        
        // 向后兼容：如果在关联表中找不到关联记录，则使用当前assetMetaId
        let finalAssetMetaIds: number[] = relatedMetas.map(r => r.assetMetaId);
        let assetMetasDetails: AssetMetaDetails[] = [];
        if (finalAssetMetaIds.length === 0) {
          finalAssetMetaIds = [assetMetaId];
          assetMetasDetails = [{
            id: assetMetaRecord.id,
            symbol: assetMetaRecord.symbol,
            chineseName: assetMetaRecord.chineseName,
          }];
        } else {
          // 获取关联的 assetMeta 详细信息
          const relatedAssetMetas = await db
            .select({
              id: assetMeta.id,
              symbol: assetMeta.symbol,
              chineseName: assetMeta.chineseName,
            })
            .from(assetMeta)
            .where(inArray(assetMeta.id, finalAssetMetaIds));
          
          assetMetasDetails = relatedAssetMetas;
        }

        logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

        return {
          id: assetMarketInfoRecord.id,
          assetMetaIds: finalAssetMetaIds,
          assetMetas: assetMetasDetails,
          title: assetMarketInfoRecord.title,
          symbol: assetMarketInfoRecord.symbol,
          sentiment: assetMarketInfoRecord.sentiment,
          importance: assetMarketInfoRecord.importance,
          summary: assetMarketInfoRecord.summary,
          keyTopics: assetMarketInfoRecord.keyTopics,
          marketImpact: assetMarketInfoRecord.marketImpact,
          keyDataPoints: assetMarketInfoRecord.keyDataPoints,
          sourceUrl: assetMarketInfoRecord.sourceUrl,
          sourceName: assetMarketInfoRecord.sourceName,
          createdAt: new Date(assetMarketInfoRecord.createdAt),
          updatedAt: new Date(assetMarketInfoRecord.updatedAt),
        };
      }

      // 获取最新的 assetMarketInfo 记录
      const latestAssetMarketInfo = await db
        .select()
        .from(assetMarketInfo)
        .where(inArray(assetMarketInfo.id, assetMarketInfoIds.map(item => item.id)))
        .orderBy(desc(assetMarketInfo.createdAt))
        .limit(1);

      if (latestAssetMarketInfo.length === 0) {
        return null;
      }

      const assetMarketInfoRecord = latestAssetMarketInfo[0];

      // 获取所有关联的 assetMeta IDs
      const relatedMetas = await db
        .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
        .from(assetMarketInfoToAssetMeta)
        .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, assetMarketInfoRecord.id));

      // 获取关联的 assetMeta 详细信息
      const relatedAssetMetaIds = relatedMetas.map(r => r.assetMetaId);
      const relatedAssetMetas = await db
        .select({
          id: assetMeta.id,
          symbol: assetMeta.symbol,
          chineseName: assetMeta.chineseName,
        })
        .from(assetMeta)
        .where(inArray(assetMeta.id, relatedAssetMetaIds));
      
      const assetMetasDetails = relatedAssetMetas;

      // 向后兼容：如果在关联表中找不到关联记录，则使用传入的assetMetaId
      let finalAssetMetaIds: number[] = relatedAssetMetaIds;
      if (finalAssetMetaIds.length === 0) {
        finalAssetMetaIds = [assetMetaId];
      }

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

      return {
        id: assetMarketInfoRecord.id,
        assetMetaIds: finalAssetMetaIds,
        assetMetas: assetMetasDetails,
        title: assetMarketInfoRecord.title,
        symbol: assetMarketInfoRecord.symbol,
        sentiment: assetMarketInfoRecord.sentiment,
        importance: assetMarketInfoRecord.importance,
        summary: assetMarketInfoRecord.summary,
        keyTopics: assetMarketInfoRecord.keyTopics,
        marketImpact: assetMarketInfoRecord.marketImpact,
        keyDataPoints: assetMarketInfoRecord.keyDataPoints,
        sourceUrl: assetMarketInfoRecord.sourceUrl,
        sourceName: assetMarketInfoRecord.sourceName,
        createdAt: new Date(assetMarketInfoRecord.createdAt),
        updatedAt: new Date(assetMarketInfoRecord.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      // 获取最新的 assetMarketInfo 记录
      const assetMarketInfoRecords = await db
        .select()
        .from(assetMarketInfo)
        .orderBy(desc(assetMarketInfo.createdAt))
        .limit(limit);

      logger.info(
        '[AssetMarketInfoService] 成功获取资产市场信息列表，数量: %d',
        assetMarketInfoRecords.length,
      );
      
      // 获取所有关联关系
      const infoIds = assetMarketInfoRecords.map(r => r.id);
      let relations: { assetMarketInfoId: number; assetMetaId: number }[] = [];
      if (infoIds.length > 0) {
        relations = await db
          .select()
          .from(assetMarketInfoToAssetMeta)
          .where(inArray(assetMarketInfoToAssetMeta.assetMarketInfoId, infoIds));
      }

      // 获取所有关联的 assetMeta 详细信息
      let assetMetasDetails: { id: number; symbol: string; chineseName: string | null }[] = [];
      const assetMetaIds = relations.map(r => r.assetMetaId);
      if (assetMetaIds.length > 0) {
        const assetMetas = await db
          .select({
            id: assetMeta.id,
            symbol: assetMeta.symbol,
            chineseName: assetMeta.chineseName,
          })
          .from(assetMeta)
          .where(inArray(assetMeta.id, assetMetaIds));
        
        assetMetasDetails = assetMetas;
      }

      // 为每条记录处理关联的 assetMeta IDs 和详细信息
      const results: AssetMarketInfoType[] = [];
      for (const record of assetMarketInfoRecords) {
        // 获取当前记录的关联assetMeta IDs
        let assetMetaIds = relations
          .filter(r => r.assetMarketInfoId === record.id)
          .map(r => r.assetMetaId);
        
        // 获取当前记录的关联assetMeta详细信息
        const assetMetas = assetMetasDetails.filter(meta => assetMetaIds.includes(meta.id));
        
        // 向后兼容：如果在关联表中找不到关联记录，则尝试通过symbol查找
        if (assetMetaIds.length === 0 && record.symbol) {
          try {
            // 尝试通过symbol查找对应的assetMeta
            const symbolBasedMetas = await db.query.assetMeta.findMany({
              where: eq(assetMeta.symbol, record.symbol),
              columns: {
                id: true,
                symbol: true,
                chineseName: true,
              }
            });
            
            assetMetaIds = symbolBasedMetas.map(meta => meta.id);
            assetMetas.push(...symbolBasedMetas.map(meta => ({
              id: meta.id,
              symbol: meta.symbol,
              chineseName: meta.chineseName,
            })));
          } catch (symbolLookupError) {
            logger.warn(
              '[AssetMarketInfoService] 通过symbol查找assetMeta失败: %s',
              symbolLookupError instanceof Error ? symbolLookupError.message : String(symbolLookupError),
            );
          }
        }

        results.push({
          id: record.id,
          assetMetaIds: assetMetaIds,
          assetMetas: assetMetas,
          title: record.title,
          symbol: record.symbol,
          sentiment: record.sentiment,
          importance: record.importance,
          summary: record.summary,
          keyTopics: record.keyTopics,
          marketImpact: record.marketImpact,
          keyDataPoints: record.keyDataPoints,
          sourceUrl: record.sourceUrl,
          sourceName: record.sourceName,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        });
      }

      return results;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取最新的资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取最新的资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      // 获取时间范围内的 assetMarketInfo 记录
      const assetMarketInfoRecords = await db
        .select()
        .from(assetMarketInfo)
        .where(
          and(
            gte(assetMarketInfo.createdAt, startDate),
            lte(assetMarketInfo.createdAt, endDate)
          )
        )
        .orderBy(desc(assetMarketInfo.createdAt))
        .limit(limit);

      logger.info(
        '[AssetMarketInfoService] 成功获取时间范围内的资产市场信息，数量: %d',
        assetMarketInfoRecords.length,
      );

      // 获取所有关联关系
      const infoIds = assetMarketInfoRecords.map(r => r.id);
      let relations: { assetMarketInfoId: number; assetMetaId: number }[] = [];
      if (infoIds.length > 0) {
        relations = await db
          .select()
          .from(assetMarketInfoToAssetMeta)
          .where(inArray(assetMarketInfoToAssetMeta.assetMarketInfoId, infoIds));
      }

      // 获取所有关联的 assetMeta 详细信息
      let assetMetasDetails: { id: number; symbol: string; chineseName: string | null }[] = [];
      const assetMetaIds = relations.map(r => r.assetMetaId);
      if (assetMetaIds.length > 0) {
        const assetMetas = await db
          .select({
            id: assetMeta.id,
            symbol: assetMeta.symbol,
            chineseName: assetMeta.chineseName,
          })
          .from(assetMeta)
          .where(inArray(assetMeta.id, assetMetaIds));
        
        assetMetasDetails = assetMetas;
      }

      // 为每条记录处理关联的 assetMeta IDs 和详细信息
      const results: AssetMarketInfoType[] = [];
      for (const record of assetMarketInfoRecords) {
        // 获取当前记录的关联assetMeta IDs
        let assetMetaIds = relations
          .filter(r => r.assetMarketInfoId === record.id)
          .map(r => r.assetMetaId);
        
        // 获取当前记录的关联assetMeta详细信息
        const assetMetas = assetMetasDetails.filter(meta => assetMetaIds.includes(meta.id));
        
        // 向后兼容：如果在关联表中找不到关联记录，则尝试通过symbol查找
        if (assetMetaIds.length === 0 && record.symbol) {
          try {
            // 尝试通过symbol查找对应的assetMeta
            const symbolBasedMetas = await db.query.assetMeta.findMany({
              where: eq(assetMeta.symbol, record.symbol),
              columns: {
                id: true,
                symbol: true,
                chineseName: true,
              }
            });
            
            assetMetaIds = symbolBasedMetas.map(meta => meta.id);
            assetMetas.push(...symbolBasedMetas.map(meta => ({
              id: meta.id,
              symbol: meta.symbol,
              chineseName: meta.chineseName,
            })));
          } catch (symbolLookupError) {
            logger.warn(
              '[AssetMarketInfoService] 通过symbol查找assetMeta失败: %s',
              symbolLookupError instanceof Error ? symbolLookupError.message : String(symbolLookupError),
            );
          }
        }

        results.push({
          id: record.id,
          assetMetaIds: assetMetaIds,
          assetMetas: assetMetas,
          title: record.title,
          symbol: record.symbol,
          sentiment: record.sentiment,
          importance: record.importance,
          summary: record.summary,
          keyTopics: record.keyTopics,
          marketImpact: record.marketImpact,
          keyDataPoints: record.keyDataPoints,
          sourceUrl: record.sourceUrl,
          sourceName: record.sourceName,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        });
      }

      return results;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取时间范围内的资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取时间范围内的资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 根据 ID 获取 assetMarketInfo 记录
   * @param id assetMarketInfo ID
   * @returns assetMarketInfo 记录
   */
  async getAssetMarketInfoById(id: number): Promise<AssetMarketInfoType | null> {
    try {
      logger.info('[AssetMarketInfoService] 开始获取资产市场信息: %d', id);

      const assetMarketInfoRecord = await db.query.assetMarketInfo.findFirst({
        where: eq(assetMarketInfo.id, id),
      });

      if (!assetMarketInfoRecord) {
        return null;
      }
      
      const relatedMetas = await db
        .select({ assetMetaId: assetMarketInfoToAssetMeta.assetMetaId })
        .from(assetMarketInfoToAssetMeta)
        .where(eq(assetMarketInfoToAssetMeta.assetMarketInfoId, assetMarketInfoRecord.id));

      // 获取关联的 assetMeta 详细信息
      const relatedAssetMetaIds = relatedMetas.map(r => r.assetMetaId);
      let assetMetasDetails: AssetMetaDetails[] = [];
      if (relatedAssetMetaIds.length > 0) {
        const relatedAssetMetas = await db
          .select({
            id: assetMeta.id,
            symbol: assetMeta.symbol,
            chineseName: assetMeta.chineseName,
          })
          .from(assetMeta)
          .where(inArray(assetMeta.id, relatedAssetMetaIds));
        
        assetMetasDetails = relatedAssetMetas;
      }

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息: %d', assetMarketInfoRecord.id);

      return {
        id: assetMarketInfoRecord.id,
        assetMetaIds: relatedAssetMetaIds,
        assetMetas: assetMetasDetails,
        title: assetMarketInfoRecord.title,
        symbol: assetMarketInfoRecord.symbol,
        sentiment: assetMarketInfoRecord.sentiment,
        importance: assetMarketInfoRecord.importance,
        summary: assetMarketInfoRecord.summary,
        keyTopics: assetMarketInfoRecord.keyTopics,
        marketImpact: assetMarketInfoRecord.marketImpact,
        keyDataPoints: assetMarketInfoRecord.keyDataPoints,
        sourceUrl: assetMarketInfoRecord.sourceUrl,
        sourceName: assetMarketInfoRecord.sourceName,
        createdAt: new Date(assetMarketInfoRecord.createdAt),
        updatedAt: new Date(assetMarketInfoRecord.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      const assetMarketInfoRecords = await db
        .select({
            info: assetMarketInfo
        })
        .from(assetMarketInfo)
        .innerJoin(assetMarketInfoToAssetMeta, eq(assetMarketInfo.id, assetMarketInfoToAssetMeta.assetMarketInfoId))
        .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId))
        .orderBy(desc(assetMarketInfo.createdAt))
        .limit(limit)
        .offset(offset);

      logger.info(
        '[AssetMarketInfoService] 成功获取资产市场信息列表，数量: %d',
        assetMarketInfoRecords.length,
      );
      
      const infoIds = assetMarketInfoRecords.map(r => r.info.id);
      let relations: { assetMarketInfoId: number; assetMetaId: number }[] = [];
      if (infoIds.length > 0) {
          relations = await db
            .select()
            .from(assetMarketInfoToAssetMeta)
            .where(inArray(assetMarketInfoToAssetMeta.assetMarketInfoId, infoIds));
      }

      // 获取所有关联的 assetMeta 详细信息
      let assetMetasDetails: { id: number; symbol: string; chineseName: string | null }[] = [];
      const assetMetaIds = relations.map(r => r.assetMetaId);
      if (assetMetaIds.length > 0) {
        const assetMetas = await db
          .select({
            id: assetMeta.id,
            symbol: assetMeta.symbol,
            chineseName: assetMeta.chineseName,
          })
          .from(assetMeta)
          .where(inArray(assetMeta.id, assetMetaIds));
        
        assetMetasDetails = assetMetas;
      }

      return assetMarketInfoRecords.map(({ info: record }) => {
        // 获取当前记录的关联assetMeta IDs
        const assetMetaIds = relations
          .filter(r => r.assetMarketInfoId === record.id)
          .map(r => r.assetMetaId);
        
        // 获取当前记录的关联assetMeta详细信息
        const assetMetas = assetMetasDetails.filter(meta => assetMetaIds.includes(meta.id));
        
        return {
          id: record.id,
          assetMetaIds: assetMetaIds,
          assetMetas: assetMetas,
          title: record.title,
          symbol: record.symbol,
          sentiment: record.sentiment,
          importance: record.importance,
          summary: record.summary,
          keyTopics: record.keyTopics,
          marketImpact: record.marketImpact,
          keyDataPoints: record.keyDataPoints,
          sourceUrl: record.sourceUrl,
          sourceName: record.sourceName,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        };
      });
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息列表失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取资产市场信息列表失败: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(assetMarketInfo)
        .innerJoin(assetMarketInfoToAssetMeta, eq(assetMarketInfo.id, assetMarketInfoToAssetMeta.assetMarketInfoId))
        .where(eq(assetMarketInfoToAssetMeta.assetMetaId, assetMetaId));

      logger.info('[AssetMarketInfoService] 成功获取资产市场信息总数: %d', result[0].count);

      return result[0].count;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 获取资产市场信息总数失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `获取资产市场信息总数失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 根据 ID 删除 assetMarketInfo 记录
   * @param id assetMarketInfo ID
   * @returns 删除是否成功
   */
  async deleteAssetMarketInfoById(id: number): Promise<boolean> {
    try {
      logger.info('[AssetMarketInfoService] 开始删除资产市场信息: %d', id);

      const result = await db.delete(assetMarketInfo).where(eq(assetMarketInfo.id, id));

      logger.info('[AssetMarketInfoService] 成功删除资产市场信息: %d', id);

      return result.changes > 0;
    } catch (error) {
      logger.error(
        '[AssetMarketInfoService] 删除资产市场信息失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `删除资产市场信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

const assetMarketInfoService = new AssetMarketInfoService();

export default assetMarketInfoService;
