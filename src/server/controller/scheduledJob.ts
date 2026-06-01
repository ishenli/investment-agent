import { z } from 'zod';
import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import scheduledJobService from '../service/scheduledJobService';
import jobExecutorService from '../service/jobExecutorService';
import { BaseBizController } from './base';
import type { JobType } from '@/types/scheduledJob';

const CreateJobSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(1),
  jobType: z.enum(['insight', 'report_weekly', 'report_monthly']),
  accountId: z.number().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  timeoutMs: z.number().min(1000).max(3600000).optional(),
});

const UpdateJobSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cronExpression: z.string().min(1).optional(),
  jobType: z.enum(['insight', 'report_weekly', 'report_monthly']).optional(),
  isEnabled: z.boolean().optional(),
  accountId: z.number().nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  timeoutMs: z.number().min(1000).max(3600000).optional(),
});

const ListJobsQuerySchema = z.object({
  jobType: z.enum(['insight', 'report_weekly', 'report_monthly']).optional(),
  isEnabled: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

const LogsQuerySchema = z.object({
  limit: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(0))
    .optional(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'missed']).optional(),
  startedAfter: z.string().optional(),
  startedBefore: z.string().optional(),
});

export class ScheduledJobController extends BaseBizController {
  // ============== List ==============

  @WithRequestContext()
  async listJobs(query: Record<string, string>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const filters = ListJobsQuerySchema.safeParse(query);
      if (!filters.success) {
        return this.error('参数格式无效', 'validation_error');
      }

      const result = await scheduledJobService.listJobs(parseInt(userId), {
        jobType: filters.data.jobType as JobType,
        isEnabled: filters.data.isEnabled,
      });

      return this.success(result);
    } catch (error) {
      return this.error('获取定时任务列表失败', 'list_jobs_error');
    }
  }

  // ============== Create ==============

  @WithRequestContext()
  async createJob(body: unknown) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const parsed = CreateJobSchema.safeParse(body);
      if (!parsed.success) {
        return await this.responseValidateError(parsed.error);
      }

      const job = await scheduledJobService.createJob(parseInt(userId), {
        name: parsed.data.name,
        cronExpression: parsed.data.cronExpression,
        jobType: parsed.data.jobType as JobType,
        accountId: parsed.data.accountId,
        config: parsed.data.config,
        timeoutMs: parsed.data.timeoutMs,
      });

      return this.success(job);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID_CRON_EXPRESSION') {
        return this.error('Cron 表达式无效', 'invalid_cron');
      }
      return this.error('创建定时任务失败', 'create_job_error');
    }
  }

  // ============== Get by ID ==============

  @WithRequestContext()
  async getJobById(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.id);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const job = await scheduledJobService.getJobById(jobId, parseInt(userId));
      if (!job) {
        return this.error('定时任务不存在', 'job_not_found');
      }

      return this.success(job);
    } catch (error) {
      return this.error('获取定时任务详情失败', 'get_job_error');
    }
  }

  // ============== Update ==============

  @WithRequestContext()
  async updateJob(param: { id: string } & Record<string, unknown>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.id);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const { id: _, ...body } = param;
      const parsed = UpdateJobSchema.safeParse(body);
      if (!parsed.success) {
        return await this.responseValidateError(parsed.error);
      }

      const job = await scheduledJobService.updateJob(jobId, parseInt(userId), parsed.data);
      if (!job) {
        return this.error('定时任务不存在或无权修改', 'job_not_found');
      }

      return this.success(job);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID_CRON_EXPRESSION') {
        return this.error('Cron 表达式无效', 'invalid_cron');
      }
      return this.error('更新定时任务失败', 'update_job_error');
    }
  }

  // ============== Delete ==============

  @WithRequestContext()
  async deleteJob(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.id);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const result = await scheduledJobService.deleteJob(jobId, parseInt(userId));
      if (!result) {
        return this.error('定时任务不存在或无权删除', 'job_not_found');
      }

      return this.success({ message: '删除成功' });
    } catch (error) {
      return this.error('删除定时任务失败', 'delete_job_error');
    }
  }

  // ============== Execute ==============

  @WithRequestContext()
  async executeJob(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.id);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const job = await scheduledJobService.getJobById(jobId, parseInt(userId));
      if (!job) {
        return this.error('定时任务不存在或无权执行', 'job_not_found');
      }

      const result = await jobExecutorService.executeJob(jobId);
      return this.success(result);
    } catch (error) {
      return this.error('执行定时任务失败', 'execute_job_error');
    }
  }

  // ============== Logs ==============

  @WithRequestContext()
  async getJobLogs(param: { id: string } & Record<string, string>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.id);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const { id: _, ...query } = param;
      const parsed = LogsQuerySchema.safeParse(query);
      if (!parsed.success) {
        return this.error('参数格式无效', 'validation_error');
      }

      const result = await scheduledJobService.getJobLogs(parseInt(userId), {
        jobId,
        status: parsed.data.status,
        startedAfter: parsed.data.startedAfter,
        startedBefore: parsed.data.startedBefore,
      }, {
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });

      return this.success(result);
    } catch (error) {
      return this.error('获取执行日志失败', 'get_logs_error');
    }
  }
}
