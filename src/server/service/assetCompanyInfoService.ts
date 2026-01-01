import { db } from '@server/lib/db';
import { assetCompanyInfo, assetMeta } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import logger from '@server/base/logger';

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

export class AssetCompanyInfoService {
  constructor() {
    // Database connection is initialized in db.ts
  }

  /**
   * Create a new assetCompanyInfo record
   * @param request Create request
   * @returns Created assetCompanyInfo record
   */
  async createAssetCompanyInfo(
    request: CreateAssetCompanyInfoRequest,
  ): Promise<AssetCompanyInfoType> {
    try {
      logger.info('[AssetCompanyInfoService] Starting to create asset company info');

      // Check if assetMeta exists
      const existingAssetMeta = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.id, request.assetMetaId),
      });

      if (!existingAssetMeta) {
        throw new Error(`AssetMeta with id ${request.assetMetaId} not found`);
      }

      // Create assetCompanyInfo record
      const [newAssetCompanyInfo] = await db
        .insert(assetCompanyInfo)
        .values({
          assetMetaId: request.assetMetaId,
          title: request.title,
          content: request.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(
        '[AssetCompanyInfoService] Successfully created asset company info: %d',
        newAssetCompanyInfo.id,
      );

      return {
        id: newAssetCompanyInfo.id,
        assetMetaId: newAssetCompanyInfo.assetMetaId,
        title: newAssetCompanyInfo.title,
        content: newAssetCompanyInfo.content,
        createdAt: new Date(newAssetCompanyInfo.createdAt),
        updatedAt: new Date(newAssetCompanyInfo.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to create asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to create asset company info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update an existing assetCompanyInfo record
   * @param request Update request
   * @returns Updated assetCompanyInfo record
   */
  async updateAssetCompanyInfo(
    request: UpdateAssetCompanyInfoRequest,
  ): Promise<AssetCompanyInfoType> {
    try {
      logger.info('[AssetCompanyInfoService] Starting to update asset company info: %d', request.id);

      const updateData: Partial<typeof assetCompanyInfo.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (request.title !== undefined) updateData.title = request.title;
      if (request.content !== undefined) updateData.content = request.content;

      const [updatedAssetCompanyInfo] = await db
        .update(assetCompanyInfo)
        .set(updateData)
        .where(eq(assetCompanyInfo.id, request.id))
        .returning();

      if (!updatedAssetCompanyInfo) {
        throw new Error(`AssetCompanyInfo with id ${request.id} not found`);
      }

      logger.info(
        '[AssetCompanyInfoService] Successfully updated asset company info: %d',
        updatedAssetCompanyInfo.id,
      );

      return {
        id: updatedAssetCompanyInfo.id,
        assetMetaId: updatedAssetCompanyInfo.assetMetaId,
        title: updatedAssetCompanyInfo.title,
        content: updatedAssetCompanyInfo.content,
        createdAt: new Date(updatedAssetCompanyInfo.createdAt),
        updatedAt: new Date(updatedAssetCompanyInfo.updatedAt),
      };
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to update asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to update asset company info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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
      logger.info(
        '[AssetCompanyInfoService] Starting to get asset company info list: %d, limit: %d, offset: %d',
        assetMetaId,
        limit,
        offset,
      );

      const assetCompanyInfoRecords = await db.query.assetCompanyInfo.findMany({
        where: eq(assetCompanyInfo.assetMetaId, assetMetaId),
        orderBy: [desc(assetCompanyInfo.createdAt)],
        limit: limit,
        offset: offset,
      });

      logger.info(
        '[AssetCompanyInfoService] Successfully got asset company info list, count: %d',
        assetCompanyInfoRecords.length,
      );

      return assetCompanyInfoRecords.map((record) => ({
        id: record.id,
        assetMetaId: record.assetMetaId,
        title: record.title,
        content: record.content,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      }));
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get asset company info list: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to get asset company info list: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete assetCompanyInfo record by ID
   * @param id assetCompanyInfo ID
   * @returns Whether deletion was successful
   */
  async deleteAssetCompanyInfoById(id: number): Promise<boolean> {
    try {
      logger.info('[AssetCompanyInfoService] Starting to delete asset company info: %d', id);

      const result = await db.delete(assetCompanyInfo).where(eq(assetCompanyInfo.id, id));

      logger.info('[AssetCompanyInfoService] Successfully deleted asset company info: %d', id);

      return result.changes > 0;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to delete asset company info: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to delete asset company info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getLatestAssetCompanyInfoBySymbol(symbol: string): Promise<AssetCompanyInfoType | null> {
    try {
      logger.info('[AssetCompanyInfoService] Starting to get latest asset company info by symbol: %s', symbol);

      // 获取 metaId
      const assetMetaId = await db.query.assetMeta.findFirst({
        where: eq(assetMeta.symbol, symbol),
      });
      if (!assetMetaId) {
        return null;
      }

      const assetCompanyInfoRecord = await db.query.assetCompanyInfo.findFirst({
        where: eq(assetCompanyInfo.assetMetaId, assetMetaId.id),
        orderBy: [desc(assetCompanyInfo.createdAt)],
      });

      logger.info('[AssetCompanyInfoService] Successfully got latest asset company info by symbol: %s', symbol);

      return assetCompanyInfoRecord
        ? {
            id: assetCompanyInfoRecord.id,
            assetMetaId: assetCompanyInfoRecord.assetMetaId,
            title: assetCompanyInfoRecord.title,
            content: assetCompanyInfoRecord.content,
            createdAt: new Date(assetCompanyInfoRecord.createdAt),
            updatedAt: new Date(assetCompanyInfoRecord.updatedAt),
          }
        : null;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get latest asset company info by symbol: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to get latest asset company info by symbol: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get count of assetCompanyInfo records by assetMetaId
   * @param assetMetaId assetMeta ID
   * @returns Count of assetCompanyInfo records
   */
  async getAssetCompanyInfoCountByAssetMetaId(assetMetaId: number): Promise<number> {
    try {
      logger.info('[AssetCompanyInfoService] Starting to get asset company info count: %d', assetMetaId);

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(assetCompanyInfo)
        .where(eq(assetCompanyInfo.assetMetaId, assetMetaId));

      logger.info('[AssetCompanyInfoService] Successfully got asset company info count: %d', result[0].count);

      return result[0].count;
    } catch (error) {
      logger.error(
        '[AssetCompanyInfoService] Failed to get asset company info count: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to get asset company info count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

const assetCompanyInfoService = new AssetCompanyInfoService();

export default assetCompanyInfoService;
