/**
 * Portfolio Snapshot Repository
 *
 * 数据访问层：负责 portfolio_snapshots 表的数据库操作
 */
import { portfolioSnapshots } from '@/drizzle/schema';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@server/lib/db';
import { BaseIntRepository, type UpdateData } from './base';

/**
 * Portfolio Snapshot 实体类型
 */
export type PortfolioSnapshotEntity = typeof portfolioSnapshots.$inferSelect;

/**
 * 创建快照数据类型
 */
export type CreateSnapshotData = Omit<PortfolioSnapshotEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新快照数据类型
 */
export type UpdateSnapshotData = UpdateData<PortfolioSnapshotEntity>;

/**
 * Portfolio Snapshot Repository
 * 管理投资组合快照数据
 */
export class PortfolioSnapshotRepository extends BaseIntRepository<PortfolioSnapshotEntity> {
  constructor() {
    super(portfolioSnapshots);
  }

  /**
   * 根据账户 ID 和日期查找快照（精确匹配）
   */
  async findByAccountIdAndDate(
    accountId: number,
    date: Date,
  ): Promise<PortfolioSnapshotEntity | null> {
    return this.findOne(
      and(
        eq(portfolioSnapshots.accountId, accountId),
        eq(portfolioSnapshots.snapshotDate, date),
      )!,
    );
  }

  /**
   * 查询账户最新快照
   */
  async findLatestByAccountId(accountId: number): Promise<PortfolioSnapshotEntity | null> {
    const results = await (db as any)
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.accountId, accountId))
      .orderBy(desc(portfolioSnapshots.snapshotDate))
      .limit(1);

    return (results[0] as PortfolioSnapshotEntity) ?? null;
  }

  /**
   * 查询账户在指定日期之前最近的快照（含当日）
   */
  async findNearestOnOrBefore(
    accountId: number,
    date: Date,
  ): Promise<PortfolioSnapshotEntity | null> {
    const results = await (db as any)
      .select()
      .from(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.accountId, accountId),
          lte(portfolioSnapshots.snapshotDate, date),
        ),
      )
      .orderBy(desc(portfolioSnapshots.snapshotDate))
      .limit(1);

    return (results[0] as PortfolioSnapshotEntity) ?? null;
  }

  /**
   * 查询账户在日期范围内的所有快照（按日期升序）
   */
  async findByAccountIdAndDateRange(
    accountId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<PortfolioSnapshotEntity[]> {
    return this.findMany(
      and(
        eq(portfolioSnapshots.accountId, accountId),
        gte(portfolioSnapshots.snapshotDate, startDate),
        lte(portfolioSnapshots.snapshotDate, endDate),
      )!,
      { orderBy: [asc(portfolioSnapshots.snapshotDate)] },
    );
  }

  /**
   * 查询账户所有快照（按日期降序）
   */
  async findAllByAccountId(accountId: number): Promise<PortfolioSnapshotEntity[]> {
    return this.findMany(eq(portfolioSnapshots.accountId, accountId), {
      orderBy: [desc(portfolioSnapshots.snapshotDate)],
    });
  }

  /**
   * 创建快照
   */
  async createSnapshot(data: CreateSnapshotData): Promise<PortfolioSnapshotEntity> {
    const now = new Date();
    const [result] = await (db as any)
      .insert(portfolioSnapshots)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();

    return result as PortfolioSnapshotEntity;
  }

  /**
   * 更新快照
   */
  async updateSnapshot(
    id: number,
    data: UpdateSnapshotData,
  ): Promise<PortfolioSnapshotEntity | null> {
    return this.update(id, data);
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(id: number): Promise<boolean> {
    return this.delete(id);
  }
}

// 导出单例实例
export const portfolioSnapshotRepository = new PortfolioSnapshotRepository();
