/**
 * Scheduled Job - Shared Types
 *
 * 可配置定时任务系统的共享类型定义，前后端通用。
 */

// ============== Enums / Unions ==============

export type JobType = 'insight' | 'report_weekly' | 'report_monthly';

export type JobLogStatus = 'pending' | 'running' | 'success' | 'failed' | 'missed';

// ============== Entity ==============

export interface ScheduledJob {
  id: number;
  userId: number;
  name: string;
  cronExpression: string;
  jobType: JobType;
  accountId: number | null;
  config: Record<string, unknown> | null;
  timeoutMs: number;
  isEnabled: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ScheduledJobWithNextRun extends ScheduledJob {
  nextRunAt: Date | null;
}

export interface ScheduledJobLog {
  id: number;
  jobId: number;
  userId: number;
  status: JobLogStatus;
  startedAt: Date;
  completedAt: Date | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============== Input Types ==============

export interface CreateScheduledJobInput {
  name: string;
  cronExpression: string;
  jobType: JobType;
  accountId?: number | null;
  config?: Record<string, unknown> | null;
  timeoutMs?: number;
  isEnabled?: boolean;
}

export interface UpdateScheduledJobInput {
  name?: string;
  cronExpression?: string;
  jobType?: JobType;
  accountId?: number | null;
  config?: Record<string, unknown> | null;
  timeoutMs?: number;
  isEnabled?: boolean;
}

// ============== Filter / Query Types ==============

export interface ScheduledJobFilters {
  isEnabled?: boolean;
  jobType?: JobType;
}

export interface ScheduledJobLogFilters {
  jobId?: number;
  status?: JobLogStatus | JobLogStatus[];
  startedAfter?: string;
  startedBefore?: string;
}

export interface ScheduledJobLogPagination {
  limit?: number;
  offset?: number;
}

export interface ScheduledJobListResponse {
  items: ScheduledJobWithNextRun[];
  total: number;
}

export interface ScheduledJobLogListResponse {
  items: ScheduledJobLog[];
  total: number;
}

// ============== Execution Types ==============

export interface JobExecutionResult {
  success: boolean;
  reportId?: number;
  reportStatus?: 'pending';
  insightCount?: number;
  message?: string;
}

// ============== Constants ==============

export const JOB_TYPES: JobType[] = ['insight', 'report_weekly', 'report_monthly'];

export const JOB_LOG_STATUSES: JobLogStatus[] = ['pending', 'running', 'success', 'failed', 'missed'];

export const DEFAULT_TIMEOUT_MS = 300000;

export const MAX_CONCURRENT_JOBS = 3;
