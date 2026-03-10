/**
 * Asset Position Repository
 *
 * 数据访问层：负责 asset_positions 表的数据库操作
 */
import { assetPositions } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Asset Position 实体类型
 */
export type AssetPositionEntity = typeof assetPositions.$inferSelect;

/**
 * Asset Position Repository
 * 管理账户持仓数据
 */
export class AssetPositionRepository extends BaseIntRepository<AssetPositionEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(assetPositions);
  }

  /**
   * 查询账户下所有持仓（排除已软删除）
   */
  async findByAccountId(accountId: number): Promise<AssetPositionEntity[]> {
    return this.findMany(eq(assetPositions.accountId, accountId));
  }

  /**
   * 查询账户下特定标的的持仓
   */
  async findByAccountIdAndSymbol(
    accountId: number,
    symbol: string,
  ): Promise<AssetPositionEntity | null> {
    return this.findOne(and(eq(assetPositions.accountId, accountId), eq(assetPositions.symbol, symbol))!);
  }
}

// 导出单例实例
export const assetPositionRepository = new AssetPositionRepository();
