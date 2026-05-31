/**
 * JobExecutor Service
 *
 * 通用任务执行器：根据 jobType 路由到对应业务服务，
 * 统一记录执行结果到 scheduledJobLogs。
 * 使用自实现并发队列限制同时执行的任务数。
 */
import logger from '@server/base/logger';
import {
  scheduledJobRepository,
  type ScheduledJobEntity,
} from '@server/repository/scheduledJobRepository';
import {
  scheduledJobLogRepository,
  type ScheduledJobLogEntity,
} from '@server/repository/scheduledJobLogRepository';
import type { JobExecutionResult, JobType } from '@/types/scheduledJob';
import { MAX_CONCURRENT_JOBS } from '@/types/scheduledJob';

// ============== Concurrency Queue ==============

class ConcurrencyQueue {
  private running = 0;
  private queue: Array<{ resolve: () => void }> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next.resolve();
    }
  }
}

// ============== Job Handlers ==============

async function executeInsightJob(
  job: ScheduledJobEntity,
): Promise<JobExecutionResult> {
  const { AIInsightsService } = await import('@server/service/aiInsightsService');
  const { PortfolioService } = await import('@server/service/portfolioService');
  const aiInsightService = (await import('@server/service/aiInsightService')).default;
  const notificationService = (await import('@server/service/notificationService')).default;

  const accountId = String(job.accountId!);
  const portfolio = await PortfolioService.calculatePortfolio(accountId);
  const positions = await PortfolioService.getPositions(accountId, portfolio.totalValue);

  const insights = await AIInsightsService.generateAIInsights(
    positions,
    portfolio,
  );

  const insightIds = await aiInsightService.createInsights(
    job.userId,
    job.accountId,
    job.id,
    insights,
    'scheduled',
  );

  await notificationService.createNotification(job.userId, {
    type: 'analysis_completed',
    title: `${job.name}已完成`,
    message: `共生成 ${insights.length} 条洞察`,
    link: '/insight',
    priority: 'medium',
    data: { jobId: job.id, insightCount: insights.length },
  });

  return {
    success: true,
    insightCount: insights.length,
    insightIds,
    message: `共生成 ${insights.length} 条洞察`,
  };
}

async function executeReportJob(
  job: ScheduledJobEntity,
  reportType: 'weekly' | 'monthly',
): Promise<JobExecutionResult> {
  const reportService = (await import('@server/service/reportService')).default;
  const notificationService = (await import('@server/service/notificationService')).default;

  const result = await reportService.generateReport({
    accountId: String(job.accountId),
    type: reportType,
    scheduledJobId: job.id,
  });

  const label = reportType === 'weekly' ? '周报' : '月报';

  await notificationService.createNotification(job.userId, {
    type: 'report_completed',
    title: `${job.name}已完成`,
    message: `${label}已开始生成`,
    link: `/report/${result.id}`,
    priority: 'medium',
    data: { jobId: job.id, reportId: result.id },
  });

  return {
    success: true,
    reportId: parseInt(result.id),
    reportStatus: 'pending',
    message: `${label}已开始生成`,
  };
}

// ============== Service Class ==============

export class JobExecutorService {
  private concurrencyQueue = new ConcurrencyQueue(MAX_CONCURRENT_JOBS);

  async executeJob(jobId: number): Promise<JobExecutionResult> {
    const job = await scheduledJobRepository.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const logEntity = await scheduledJobLogRepository.create({
      jobId: job.id,
      userId: job.userId,
      status: 'pending',
      startedAt: new Date(),
      completedAt: null,
      result: null,
      errorMessage: null,
      metadata: null,
    });

    await this.concurrencyQueue.acquire();
    const actualStartedAt = new Date();

    try {
      await scheduledJobLogRepository.updateStatus(logEntity.id, 'running');

      const timeoutMs = job.timeoutMs || 300000;
      const result = await this.executeWithTimeout(job, timeoutMs);

      await scheduledJobLogRepository.updateStatus(logEntity.id, 'success', {
        completedAt: new Date(),
        result: result as unknown as Record<string, unknown>,
      });

      await scheduledJobRepository.updateLastRunAt(job.id);

      logger.info(`[JobExecutor] Job ${job.id} "${job.name}" completed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await scheduledJobLogRepository.updateStatus(logEntity.id, 'failed', {
        completedAt: new Date(),
        errorMessage,
      });

      logger.error(`[JobExecutor] Job ${job.id} "${job.name}" failed: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      this.concurrencyQueue.release();
    }
  }

  async recordMissedExecution(jobId: number, missedAt: Date): Promise<void> {
    const job = await scheduledJobRepository.findById(jobId);
    if (!job) return;

    await scheduledJobLogRepository.create({
      jobId: job.id,
      userId: job.userId,
      status: 'missed',
      startedAt: missedAt,
      completedAt: missedAt,
      result: null,
      errorMessage: 'Missed during system sleep',
      metadata: null,
    });

    logger.info(`[JobExecutor] Recorded missed execution for job ${jobId} at ${missedAt.toISOString()}`);
  }

  private async executeWithTimeout(
    job: ScheduledJobEntity,
    timeoutMs: number,
  ): Promise<JobExecutionResult> {
    return new Promise<JobExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.routeJobExecution(job)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async routeJobExecution(job: ScheduledJobEntity): Promise<JobExecutionResult> {
    const jobType = job.jobType as JobType;

    switch (jobType) {
      case 'insight':
        return executeInsightJob(job);
      case 'report_weekly':
        return executeReportJob(job, 'weekly');
      case 'report_monthly':
        return executeReportJob(job, 'monthly');
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }
}

const jobExecutorService = new JobExecutorService();
export default jobExecutorService;
