/**
 * ScheduledJob Business Logic
 *
 * 纯业务函数，无框架耦合。供 Agent 工具调用。
 */
import scheduledJobService from '@server/service/scheduledJobService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import type { JobType } from '@/types/scheduledJob';

export async function createScheduledJobBiz(
  name: string,
  cronExpression: string,
  jobType: JobType,
  options?: {
    accountId?: number;
    config?: Record<string, unknown>;
    timeoutMs?: number;
  },
): Promise<string> {
  const userIdStr = await authService.getCurrentUserId();
  if (!userIdStr) {
    throw new Error('用户未登录，无法创建定时任务');
  }
  const userId = parseInt(userIdStr);

  logger.info(`[business/scheduledJob] createScheduledJobBiz: ${name}`);
  try {
    const job = await scheduledJobService.createJob(userId, {
      name,
      cronExpression,
      jobType,
      accountId: options?.accountId,
      config: options?.config,
      timeoutMs: options?.timeoutMs,
    });

    const nextRunStr = job.nextRunAt
      ? job.nextRunAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '未知';

    return `定时任务创建成功！\nID: ${job.id}\n名称: ${job.name}\n类型: ${job.jobType}\nCron: ${job.cronExpression}\n下次执行: ${nextRunStr}`;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'INVALID_CRON_EXPRESSION') {
      throw new Error(`Cron 表达式无效: "${cronExpression}"，请使用标准 cron 格式（如 "0 9 * * 1"）`);
    }
    throw new Error(`定时任务创建失败: ${msg}`);
  }
}

export async function listScheduledJobsBiz(): Promise<string> {
  const userIdStr = await authService.getCurrentUserId();
  if (!userIdStr) {
    throw new Error('用户未登录，无法获取定时任务列表');
  }
  const userId = parseInt(userIdStr);

  logger.info(`[business/scheduledJob] listScheduledJobsBiz: userId=${userId}`);
  try {
    const { items } = await scheduledJobService.listJobs(userId);

    if (items.length === 0) {
      return '您目前没有设置任何定时任务。';
    }

    const lines = items.map((job) => {
      const status = job.isEnabled ? '启用' : '禁用';
      const nextRun = job.nextRunAt
        ? job.nextRunAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '无';
      return `[${job.id}] [${status}] ${job.name} (${job.jobType}) — cron: ${job.cronExpression} — 下次: ${nextRun}`;
    });

    return `您目前设置了 ${items.length} 个定时任务:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`定时任务列表获取失败: ${(e as Error).message}`);
  }
}

export async function updateScheduledJobBiz(
  jobId: number,
  options?: {
    name?: string;
    cronExpression?: string;
    jobType?: JobType;
    isEnabled?: boolean;
    accountId?: number | null;
    config?: Record<string, unknown> | null;
  },
): Promise<string> {
  const userIdStr = await authService.getCurrentUserId();
  if (!userIdStr) {
    throw new Error('用户未登录，无法更新定时任务');
  }
  const userId = parseInt(userIdStr);

  logger.info(`[business/scheduledJob] updateScheduledJobBiz: jobId=${jobId}`);
  try {
    const job = await scheduledJobService.updateJob(jobId, userId, {
      name: options?.name,
      cronExpression: options?.cronExpression,
      jobType: options?.jobType,
      isEnabled: options?.isEnabled,
      accountId: options?.accountId,
      config: options?.config,
    });

    if (!job) {
      return `未找到 ID 为 ${jobId} 的定时任务，或无权修改。`;
    }

    return `定时任务更新成功！\nID: ${job.id}\n名称: ${job.name}\n状态: ${job.isEnabled ? '启用' : '禁用'}\nCron: ${job.cronExpression}`;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'INVALID_CRON_EXPRESSION') {
      throw new Error(`Cron 表达式无效: "${options?.cronExpression}"，请使用标准 cron 格式`);
    }
    throw new Error(`定时任务更新失败: ${msg}`);
  }
}

export async function deleteScheduledJobBiz(jobId: number): Promise<string> {
  const userIdStr = await authService.getCurrentUserId();
  if (!userIdStr) {
    throw new Error('用户未登录，无法删除定时任务');
  }
  const userId = parseInt(userIdStr);

  logger.info(`[business/scheduledJob] deleteScheduledJobBiz: jobId=${jobId}`);
  try {
    const result = await scheduledJobService.deleteJob(jobId, userId);
    if (!result) {
      return `未找到 ID 为 ${jobId} 的定时任务，或无权删除。`;
    }
    return `定时任务 ${jobId} 已删除。`;
  } catch (e) {
    throw new Error(`定时任务删除失败: ${(e as Error).message}`);
  }
}
