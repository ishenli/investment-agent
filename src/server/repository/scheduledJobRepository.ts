/**
 * ScheduledJob Repository
 *
 * 数据访问层：负责 scheduled_jobs 表的数据库操作
 * 支持软删除
 */
import { db } from '@server/lib/db';
import { scheduledJobs } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { BaseIntRepository } from './base';

export type ScheduledJobEntity = typeof scheduledJobs.$inferSelect;
export type CreateScheduledJobData = Omit<ScheduledJobEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateScheduledJobData = Partial<
  Omit<ScheduledJobEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'>
>;

export class ScheduledJobRepository extends BaseIntRepository<ScheduledJobEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(scheduledJobs);
  }

  // ============== Query Operations ==============

  async findByIdAndUserId(jobId: number, userId: number): Promise<ScheduledJobEntity | null> {
    return this.findOne(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId))!);
  }

  async findByUserId(userId: number): Promise<ScheduledJobEntity[]> {
    return this.findMany(eq(scheduledJobs.userId, userId), {
      orderBy: [desc(scheduledJobs.createdAt)],
    });
  }

  async findEnabledByUserId(userId: number): Promise<ScheduledJobEntity[]> {
    return this.findMany(
      and(eq(scheduledJobs.userId, userId), eq(scheduledJobs.isEnabled, true))!,
      { orderBy: [desc(scheduledJobs.createdAt)] },
    );
  }

  async findAllEnabled(): Promise<ScheduledJobEntity[]> {
    return this.findMany(eq(scheduledJobs.isEnabled, true));
  }

  // ============== Update Operations ==============

  async updateByIdAndUserId(
    jobId: number,
    userId: number,
    data: UpdateScheduledJobData,
  ): Promise<ScheduledJobEntity | null> {
    await db
      .update(scheduledJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId)));

    return this.findByIdAndUserId(jobId, userId);
  }

  async updateLastRunAt(jobId: number): Promise<void> {
    await db
      .update(scheduledJobs)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(scheduledJobs.id, jobId));
  }

  // ============== Delete Operations ==============

  async deleteByIdAndUserId(jobId: number, userId: number): Promise<boolean> {
    try {
      await db
        .update(scheduledJobs)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId)));
      return true;
    } catch {
      return false;
    }
  }
}

export const scheduledJobRepository = new ScheduledJobRepository();
