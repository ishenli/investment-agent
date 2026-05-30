/**
 * Job Scheduler Service
 *
 * 可配置定时任务的 cron 调度器，运行在 Server 进程内。
 * 启动时加载所有 enabled 任务，使用 croner 注册定时触发，
 * 触发时直接调用 jobExecutorService 执行。
 */
import { Cron } from 'croner';
import logger from '@server/base/logger';
import { scheduledJobRepository } from '@server/repository/scheduledJobRepository';
import jobExecutorService from './jobExecutorService';

export class JobSchedulerService {
  private jobs: Map<number, Cron> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    logger.info('[JobScheduler] Initializing...');

    try {
      const jobs = await scheduledJobRepository.findAllEnabled();
      logger.info(`[JobScheduler] Found ${jobs.length} enabled job(s)`);

      for (const job of jobs) {
        this.registerJob(job.id, job.name, job.cronExpression);
      }

      this.initialized = true;
      logger.info('[JobScheduler] Initialization complete');
    } catch (error) {
      logger.error('[JobScheduler] Failed to initialize:', error);
    }
  }

  async reloadJob(jobId: number): Promise<void> {
    logger.info(`[JobScheduler] Reloading job ${jobId}...`);

    this.unregisterJob(jobId);

    try {
      const job = await scheduledJobRepository.findById(jobId);
      if (job && job.isEnabled) {
        this.registerJob(job.id, job.name, job.cronExpression);
        logger.info(`[JobScheduler] Job ${jobId} reloaded`);
      } else {
        logger.info(`[JobScheduler] Job ${jobId} is disabled or not found`);
      }
    } catch (error) {
      logger.error(`[JobScheduler] Failed to reload job ${jobId}:`, error);
    }
  }

  shutdown(): void {
    logger.info('[JobScheduler] Shutting down...');
    for (const [jobId, cron] of this.jobs) {
      cron.stop();
      logger.info(`[JobScheduler] Stopped job ${jobId}`);
    }
    this.jobs.clear();
    this.initialized = false;
  }

  private registerJob(jobId: number, name: string, cronExpression: string): void {
    if (this.jobs.has(jobId)) {
      this.unregisterJob(jobId);
    }

    try {
      const cron = new Cron(cronExpression, { name: `job-${jobId}` }, () => {
        this.onTrigger(jobId, name);
      });

      this.jobs.set(jobId, cron);

      const nextRun = cron.nextRun();
      logger.info(
        `[JobScheduler] Registered "${name}" (id=${jobId}, cron="${cronExpression}", next=${nextRun?.toISOString() ?? 'N/A'})`,
      );
    } catch (error) {
      logger.error(`[JobScheduler] Failed to register "${name}" (id=${jobId}):`, error);
    }
  }

  private unregisterJob(jobId: number): void {
    const existing = this.jobs.get(jobId);
    if (existing) {
      existing.stop();
      this.jobs.delete(jobId);
    }
  }

  private async onTrigger(jobId: number, name: string): Promise<void> {
    logger.info(`[JobScheduler] Triggering "${name}" (id=${jobId})`);

    try {
      const result = await jobExecutorService.executeJob(jobId);
      if (result.success) {
        logger.info(`[JobScheduler] "${name}" (id=${jobId}) completed successfully`);
      } else {
        logger.error(`[JobScheduler] "${name}" (id=${jobId}) failed: ${result.message}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[JobScheduler] "${name}" (id=${jobId}) error: ${msg}`);
    }
  }
}

const jobSchedulerService = new JobSchedulerService();
export default jobSchedulerService;
