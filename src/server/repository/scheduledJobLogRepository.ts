/**
 * ScheduledJobLog Repository
 *
 * 数据访问层：负责 scheduled_job_logs 表的数据库操作
 */
import { db } from '@server/lib/db';
import { scheduledJobLogs } from '@/drizzle/schema';
import { eq, and, desc, lte, gte, inArray, SQL, sql } from 'drizzle-orm';
import { BaseIntRepository } from './base';
import type { JobLogStatus } from '@/types/scheduledJob';

export type ScheduledJobLogEntity = typeof scheduledJobLogs.$inferSelect;
export type CreateScheduledJobLogData = Omit<ScheduledJobLogEntity, 'id' | 'createdAt' | 'updatedAt'>;

export class ScheduledJobLogRepository extends BaseIntRepository<ScheduledJobLogEntity> {
  constructor() {
    super(scheduledJobLogs);
  }

  // ============== Query Operations ==============

  async findByJobId(
    jobId: number,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: ScheduledJobLogEntity[]; totalCount: number }> {
    const where = eq(scheduledJobLogs.jobId, jobId);
    const totalCount = await this.count(where);
    const items = await this.findMany(where, {
      orderBy: [desc(scheduledJobLogs.startedAt)],
      limit: options?.limit,
      offset: options?.offset,
    });
    return { items, totalCount };
  }

  async findByUserId(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      jobId?: number;
      status?: JobLogStatus | JobLogStatus[];
      startedAfter?: Date;
      startedBefore?: Date;
    },
  ): Promise<{ items: ScheduledJobLogEntity[]; totalCount: number }> {
    const conditions: SQL[] = [eq(scheduledJobLogs.userId, userId)];

    if (options?.jobId) {
      conditions.push(eq(scheduledJobLogs.jobId, options.jobId));
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        if (options.status.length > 0) {
          conditions.push(inArray(scheduledJobLogs.status, options.status));
        }
      } else {
        conditions.push(eq(scheduledJobLogs.status, options.status));
      }
    }

    if (options?.startedAfter) {
      conditions.push(gte(scheduledJobLogs.startedAt, options.startedAfter));
    }
    if (options?.startedBefore) {
      conditions.push(lte(scheduledJobLogs.startedAt, options.startedBefore));
    }

    const whereClause = and(...conditions)!;
    const totalCount = await this.count(whereClause);
    const items = await this.findMany(whereClause, {
      orderBy: [desc(scheduledJobLogs.startedAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    return { items, totalCount };
  }

  // ============== Update Operations ==============

  async updateStatus(
    logId: number,
    status: JobLogStatus,
    extra?: { completedAt?: Date; result?: Record<string, unknown>; errorMessage?: string },
  ): Promise<ScheduledJobLogEntity | null> {
    return this.update(logId, { status, ...extra });
  }

  // ============== Cleanup Operations ==============

  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await db
      .delete(scheduledJobLogs)
      .where(lte(scheduledJobLogs.createdAt, cutoff));

    return (result as any).changes ?? 0;
  }
}

export const scheduledJobLogRepository = new ScheduledJobLogRepository();
