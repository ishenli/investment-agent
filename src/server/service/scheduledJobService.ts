/**
 * ScheduledJob Service
 *
 * 业务逻辑层：可配置定时任务的 CRUD、cron 校验、nextRunAt 计算
 */
import { Cron } from 'croner';
import logger from '@server/base/logger';
import {
  scheduledJobRepository,
  type ScheduledJobEntity,
} from '@server/repository/scheduledJobRepository';
import {
  scheduledJobLogRepository,
} from '@server/repository/scheduledJobLogRepository';
import jobSchedulerService from './jobSchedulerService';
import type {
  ScheduledJob,
  ScheduledJobWithNextRun,
  ScheduledJobLog,
  CreateScheduledJobInput,
  UpdateScheduledJobInput,
  ScheduledJobFilters,
  ScheduledJobLogFilters,
  ScheduledJobLogPagination,
  ScheduledJobListResponse,
  ScheduledJobLogListResponse,
  JobLogStatus,
} from '@/types/scheduledJob';

// ============== Entity → DTO Transform ==============

function toScheduledJob(entity: ScheduledJobEntity): ScheduledJob {
  return {
    id: entity.id,
    userId: entity.userId,
    name: entity.name,
    cronExpression: entity.cronExpression,
    jobType: entity.jobType as ScheduledJob['jobType'],
    accountId: entity.accountId,
    config: entity.config as Record<string, unknown> | null,
    timeoutMs: entity.timeoutMs,
    isEnabled: entity.isEnabled,
    lastRunAt: entity.lastRunAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt!,
    deletedAt: entity.deletedAt ?? null,
  };
}

function toScheduledJobWithNextRun(entity: ScheduledJobEntity): ScheduledJobWithNextRun {
  const job = toScheduledJob(entity);
  let nextRunAt: Date | null = null;
  if (job.isEnabled) {
    try {
      const cron = new Cron(job.cronExpression);
      nextRunAt = cron.nextRun() ?? null;
    } catch {
      // invalid cron — leave nextRunAt null
    }
  }
  return { ...job, nextRunAt };
}

function validateCronExpression(expression: string): boolean {
  try {
    new Cron(expression);
    return true;
  } catch {
    return false;
  }
}

// ============== Service Class ==============

export class ScheduledJobService {
  // ============== Create ==============

  async createJob(userId: number, input: CreateScheduledJobInput): Promise<ScheduledJobWithNextRun> {
    if (!validateCronExpression(input.cronExpression)) {
      throw new Error('INVALID_CRON_EXPRESSION');
    }

    const entity = await scheduledJobRepository.create({
      userId,
      name: input.name,
      cronExpression: input.cronExpression,
      jobType: input.jobType,
      accountId: input.accountId ?? null,
      config: input.config ?? null,
      timeoutMs: input.timeoutMs ?? 300000,
      isEnabled: input.isEnabled ?? true,
      lastRunAt: null,
      deletedAt: null,
    });

    logger.info(`[ScheduledJobService] Job created: id=${entity.id}, name="${entity.name}"`);
    jobSchedulerService.reloadJob(entity.id).catch((err) => {
      logger.error(`[ScheduledJobService] Failed to reload scheduler for job ${entity.id}:`, err);
    });
    return toScheduledJobWithNextRun(entity);
  }

  // ============== Read ==============

  async getJobById(jobId: number, userId: number): Promise<ScheduledJobWithNextRun | null> {
    const entity = await scheduledJobRepository.findByIdAndUserId(jobId, userId);
    return entity ? toScheduledJobWithNextRun(entity) : null;
  }

  async listJobs(
    userId: number,
    filters?: ScheduledJobFilters,
  ): Promise<ScheduledJobListResponse> {
    let entities: ScheduledJobEntity[];

    if (filters?.isEnabled !== undefined) {
      entities = filters.isEnabled
        ? await scheduledJobRepository.findEnabledByUserId(userId)
        : await scheduledJobRepository.findByUserId(userId);
    } else {
      entities = await scheduledJobRepository.findByUserId(userId);
    }

    if (filters?.jobType) {
      entities = entities.filter((e) => e.jobType === filters.jobType);
    }

    const items = entities.map(toScheduledJobWithNextRun);
    return { items, total: items.length };
  }

  async listAllEnabledJobs(): Promise<ScheduledJobWithNextRun[]> {
    const entities = await scheduledJobRepository.findAllEnabled();
    return entities.map(toScheduledJobWithNextRun);
  }

  // ============== Update ==============

  async updateJob(
    jobId: number,
    userId: number,
    input: UpdateScheduledJobInput,
  ): Promise<ScheduledJobWithNextRun | null> {
    if (input.cronExpression && !validateCronExpression(input.cronExpression)) {
      throw new Error('INVALID_CRON_EXPRESSION');
    }

    const entity = await scheduledJobRepository.updateByIdAndUserId(jobId, userId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.cronExpression !== undefined && { cronExpression: input.cronExpression }),
      ...(input.jobType !== undefined && { jobType: input.jobType }),
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.config !== undefined && { config: input.config }),
      ...(input.timeoutMs !== undefined && { timeoutMs: input.timeoutMs }),
      ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
    });

    if (!entity) return null;

    logger.info(`[ScheduledJobService] Job updated: id=${jobId}`);
    jobSchedulerService.reloadJob(jobId).catch((err) => {
      logger.error(`[ScheduledJobService] Failed to reload scheduler for job ${jobId}:`, err);
    });
    return toScheduledJobWithNextRun(entity);
  }

  // ============== Delete ==============

  async deleteJob(jobId: number, userId: number): Promise<boolean> {
    const result = await scheduledJobRepository.deleteByIdAndUserId(jobId, userId);
    if (result) {
      logger.info(`[ScheduledJobService] Job soft-deleted: id=${jobId}`);
      jobSchedulerService.reloadJob(jobId).catch((err) => {
        logger.error(`[ScheduledJobService] Failed to reload scheduler for job ${jobId}:`, err);
      });
    }
    return result;
  }

  // ============== Logs ==============

  async getJobLogs(
    userId: number,
    filters?: ScheduledJobLogFilters,
    pagination?: ScheduledJobLogPagination,
  ): Promise<ScheduledJobLogListResponse> {
    const { items: entities, totalCount } = await scheduledJobLogRepository.findByUserId(userId, {
      limit: pagination?.limit ?? 20,
      offset: pagination?.offset ?? 0,
      jobId: filters?.jobId,
      status: filters?.status,
      startedAfter: filters?.startedAfter ? new Date(filters.startedAfter) : undefined,
      startedBefore: filters?.startedBefore ? new Date(filters.startedBefore) : undefined,
    });

    const items: ScheduledJobLog[] = entities.map((e) => ({
      id: e.id,
      jobId: e.jobId,
      userId: e.userId,
      status: e.status as JobLogStatus,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      result: e.result as Record<string, unknown> | null,
      errorMessage: e.errorMessage,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt!,
    }));

    return { items, total: totalCount };
  }
}

const scheduledJobService = new ScheduledJobService();
export default scheduledJobService;
