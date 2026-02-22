/**
 * 定时任务类型
 */
export type ScheduledTaskType = 'daily_snapshot' | 'price_sync';

/**
 * 任务执行状态
 */
export type TaskExecutionStatus = 'success' | 'failed' | 'partial';

/**
 * 任务执行元数据
 */
export interface TaskExecutionMetadata {
  /** 处理的总数量 */
  totalProcessed?: number;
  /** 成功数量 */
  successCount?: number;
  /** 失败数量 */
  failedCount?: number;
  /** 失败的项目列表 */
  failedItems?: Array<{
    symbol?: string;
    accountId?: number;
    error: string;
  }>;
  /** 执行耗时（毫秒） */
  durationMs?: number;

  note?: string;
}

/**
 * 任务执行日志记录
 */
export interface ScheduledTaskLog {
  id: number;
  taskType: ScheduledTaskType;
  executionDate: Date;
  status: TaskExecutionStatus;
  metadata: TaskExecutionMetadata | null;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * 创建任务执行日志的参数
 */
export interface CreateTaskLogParams {
  taskType: ScheduledTaskType;
  executionDate: Date;
  status: TaskExecutionStatus;
  metadata?: TaskExecutionMetadata;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * 任务检查结果
 */
export interface TaskCheckResult {
  taskType: ScheduledTaskType;
  executed: boolean;
  lastExecutionDate?: Date;
  lastStatus?: TaskExecutionStatus;
}

/**
 * 执行任务的参数
 */
export interface RunTasksParams {
  /** 是否强制执行（忽略已执行检查） */
  force?: boolean;
  /** 补执行天数上限 */
  backfillDays?: number;
}

/**
 * 执行任务的结果
 */
export interface RunTasksResult {
  /** 快照任务结果 */
  snapshot?: {
    executed: boolean;
    status: TaskExecutionStatus;
    accountsProcessed: number;
    errors: string[];
  };
  /** 价格同步任务结果 */
  priceSync?: {
    executed: boolean;
    status: TaskExecutionStatus;
    symbolsProcessed: number;
    errors: string[];
  };
  /** 补执行的任务数量 */
  backfillCount?: number;
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 是否启用补执行 */
  enableBackfill: boolean;
  /** 补执行天数上限 */
  backfillDays: number;
  /** 后台检查间隔（毫秒） */
  checkIntervalMs: number;
}

/**
 * 默认调度器配置
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enableBackfill: true,
  backfillDays: 7,
  checkIntervalMs: 60 * 60 * 1000, // 1 小时
};