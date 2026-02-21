import { db } from '@server/lib/db';
import { scheduledTaskLogs } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import logger from '@server/base/logger';
import accountService from './accountService';
import portfolioSnapshotService from './portfolioSnapshotService';
import { HistoryService } from './historyService/HistoryService';
import positionService from './positionService';
import type {
  ScheduledTaskType,
  TaskExecutionStatus,
  ScheduledTaskLog,
  CreateTaskLogParams,
  TaskCheckResult,
  RunTasksParams,
  RunTasksResult,
  SchedulerConfig,
} from '@/types/scheduler';

/**
 * 定时任务调度服务
 *
 * 适用于 Electron 客户端应用的前端触发式定时调度
 * - 应用启动时检查并执行遗漏的任务
 * - 幂等性设计：同一天多次执行不会产生重复数据
 */
export class SchedulerService {
  private historyService: HistoryService;
  private config: SchedulerConfig;

  constructor(config?: Partial<SchedulerConfig>) {
    this.historyService = new HistoryService();
    this.config = {
      enableBackfill: true,
      backfillDays: 7,
      checkIntervalMs: 60 * 60 * 1000, // 1 小时
      ...config,
    };
  }

  /**
   * 将日期规范化为 UTC 零点时间戳
   * 用于幂等性检查，确保同一天的任务只执行一次
   */
  normalizeDate(date: Date = new Date()): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * 检查指定任务类型在指定日期是否已执行
   */
  async hasTaskExecuted(taskType: ScheduledTaskType, date: Date): Promise<boolean> {
    const normalizedDate = this.normalizeDate(date);
    const log = await db.query.scheduledTaskLogs.findFirst({
      where: and(
        eq(scheduledTaskLogs.taskType, taskType),
        eq(scheduledTaskLogs.executionDate, normalizedDate),
      ),
    });
    return !!log;
  }

  /**
   * 获取任务的最后执行记录
   */
  async getLastExecution(taskType: ScheduledTaskType): Promise<ScheduledTaskLog | null> {
    const log = await db.query.scheduledTaskLogs.findFirst({
      where: eq(scheduledTaskLogs.taskType, taskType),
      orderBy: [desc(scheduledTaskLogs.executionDate)],
    });
    return log ? log as ScheduledTaskLog : null;
  }

  /**
   * 检查任务是否需要执行
   * 返回任务检查结果
   */
  async shouldRunTask(taskType: ScheduledTaskType): Promise<TaskCheckResult> {
    const today = this.normalizeDate();
    const executed = await this.hasTaskExecuted(taskType, today);
    const lastExecution = await this.getLastExecution(taskType);

    return {
      taskType,
      executed,
      lastExecutionDate: lastExecution?.executionDate,
      lastStatus: lastExecution?.status,
    };
  }

  /**
   * 记录任务执行状态
   */
  async recordTaskExecution(params: CreateTaskLogParams): Promise<ScheduledTaskLog> {
    const normalizedDate = this.normalizeDate(params.executionDate);

    // 检查是否已存在记录（幂等性）
    const existing = await db.query.scheduledTaskLogs.findFirst({
      where: and(
        eq(scheduledTaskLogs.taskType, params.taskType),
        eq(scheduledTaskLogs.executionDate, normalizedDate),
      ),
    });

    if (existing) {
      // 更新现有记录
      const [updated] = await db
        .update(scheduledTaskLogs)
        .set({
          status: params.status,
          metadata: params.metadata || null,
          completedAt: params.completedAt || new Date(),
          errorMessage: params.errorMessage || null,
        })
        .where(eq(scheduledTaskLogs.id, existing.id))
        .returning();

      logger.info(
        `[SchedulerService] Updated task log: ${params.taskType} for ${normalizedDate.toISOString().split('T')[0]}`,
      );

      return updated as ScheduledTaskLog;
    }

    // 创建新记录
    const [inserted] = await db
      .insert(scheduledTaskLogs)
      .values({
        taskType: params.taskType,
        executionDate: normalizedDate,
        status: params.status,
        metadata: params.metadata || null,
        startedAt: params.startedAt,
        completedAt: params.completedAt || null,
        errorMessage: params.errorMessage || null,
        createdAt: new Date(),
      })
      .returning();

    logger.info(
      `[SchedulerService] Created task log: ${params.taskType} for ${normalizedDate.toISOString().split('T')[0]}`,
    );

    return inserted as ScheduledTaskLog;
  }

  /**
   * 主入口：检查并执行遗漏的任务
   */
  async checkAndRunTasks(params: RunTasksParams = {}): Promise<RunTasksResult> {
    const result: RunTasksResult = {};
    const { force = false, backfillDays = this.config.backfillDays } = params;

    logger.info('[SchedulerService] Starting task check...');

    // 1. 检查并执行今日快照任务
    const snapshotCheck = await this.shouldRunTask('daily_snapshot');
    if (!snapshotCheck.executed || force) {
      result.snapshot = await this.executeDailySnapshots();
    } else {
      logger.info('[SchedulerService] Daily snapshot already executed today');
      result.snapshot = {
        executed: false,
        status: 'success',
        accountsProcessed: 0,
        errors: [],
      };
    }

    // 2. 检查并执行今日价格同步任务
    const priceSyncCheck = await this.shouldRunTask('price_sync');
    if (!priceSyncCheck.executed || force) {
      result.priceSync = await this.executePriceSync();
    } else {
      logger.info('[SchedulerService] Price sync already executed today');
      result.priceSync = {
        executed: false,
        status: 'success',
        symbolsProcessed: 0,
        errors: [],
      };
    }

    // 3. 补执行遗漏的任务
    if (this.config.enableBackfill && !force) {
      const backfillResult = await this.backfillMissedTasks(backfillDays);
      result.backfillCount = backfillResult;
    }

    logger.info('[SchedulerService] Task check completed');
    return result;
  }

  /**
   * 执行每日快照任务
   */
  async executeDailySnapshots(): Promise<{
    executed: boolean;
    status: TaskExecutionStatus;
    accountsProcessed: number;
    errors: string[];
  }> {
    const startedAt = new Date();
    const today = this.normalizeDate();
    const errors: string[] = [];
    let accountsProcessed = 0;

    try {
      logger.info('[SchedulerService] Executing daily snapshots...');

      // 获取所有账户
      const accounts = await accountService.getAllAccounts();

      for (const account of accounts) {
        try {
          await portfolioSnapshotService.createSnapshot(parseInt(account.id), today, 'scheduled');
          accountsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to create snapshot for account ${account.id}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(`[SchedulerService] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      const status: TaskExecutionStatus = errors.length === 0 ? 'success' : accountsProcessed > 0 ? 'partial' : 'failed';

      await this.recordTaskExecution({
        taskType: 'daily_snapshot',
        executionDate: today,
        status,
        metadata: {
          totalProcessed: accounts.length,
          successCount: accountsProcessed,
          failedCount: errors.length,
          failedItems: errors.map((e, i) => ({ accountId: i, error: e })),
          durationMs: Date.now() - startedAt.getTime(),
        },
        startedAt,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      });

      return { executed: true, status, accountsProcessed, errors };
    } catch (error) {
      const errorMsg = `Daily snapshot task failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[SchedulerService] ${errorMsg}`);

      await this.recordTaskExecution({
        taskType: 'daily_snapshot',
        executionDate: today,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        errorMessage: errorMsg,
      });

      return { executed: true, status: 'failed', accountsProcessed: 0, errors: [errorMsg] };
    }
  }

  /**
   * 执行价格同步任务
   */
  async executePriceSync(): Promise<{
    executed: boolean;
    status: TaskExecutionStatus;
    symbolsProcessed: number;
    errors: string[];
  }> {
    const startedAt = new Date();
    const today = this.normalizeDate();
    const errors: string[] = [];
    let symbolsProcessed = 0;
    const skippedSymbols: string[] = [];

    try {
      logger.info('[SchedulerService] Executing price sync...');

      // 获取所有账户的持仓股票（包含市场信息，去重）
      const accounts = await accountService.getAllAccounts();
      const symbolMarketMap = new Map<string, string>(); // symbol -> market

      for (const account of accounts) {
        try {
          const positions = await positionService.getCurrentPositions(String(account.id));
          positions.forEach((p) => {
            // 记录股票及其市场信息
            if (!symbolMarketMap.has(p.symbol)) {
              symbolMarketMap.set(p.symbol, p.market || 'US');
            }
          });
        } catch (error) {
          const errorMsg = `Failed to get positions for account ${account.id}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(`[SchedulerService] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      logger.info(`[SchedulerService] Found ${symbolMarketMap.size} unique symbols to sync`);

      // 同步每个股票的历史价格（最近 7 天）
      // 注意：HistoryService 目前只支持美股（使用 Finnhub API）
      const syncStartDate = new Date(today);
      syncStartDate.setDate(syncStartDate.getDate() - 7);

      for (const [symbol, market] of symbolMarketMap) {
        try {
          // 目前 HistoryService 只支持美股
          if (market === 'US') {
            await this.historyService.syncHistoricalData(symbol, syncStartDate, today, 'US');
            symbolsProcessed++;
            logger.info(`[SchedulerService] Synced price for ${symbol} (market: ${market})`);
          } else {
            // 非美股暂时跳过，等待后续支持
            skippedSymbols.push(`${symbol}(${market})`);
            logger.warn(`[SchedulerService] Skipped ${symbol}: market ${market} not supported by HistoryService`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync price for ${symbol} (market: ${market}): ${error instanceof Error ? error.message : String(error)}`;
          logger.error(`[SchedulerService] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      const status: TaskExecutionStatus =
        errors.length === 0 ? 'success' : symbolsProcessed > 0 ? 'partial' : 'failed';

      await this.recordTaskExecution({
        taskType: 'price_sync',
        executionDate: today,
        status,
        metadata: {
          totalProcessed: symbolMarketMap.size,
          successCount: symbolsProcessed,
          failedCount: errors.length,
          failedItems: errors.map((e, i) => {
            const symbols = Array.from(symbolMarketMap.keys());
            return { symbol: symbols[i], error: e };
          }),
          durationMs: Date.now() - startedAt.getTime(),
          note: skippedSymbols.length > 0 ? `Skipped non-US stocks: ${skippedSymbols.join(', ')}` : undefined,
        },
        startedAt,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      });

      return { executed: true, status, symbolsProcessed, errors };
    } catch (error) {
      const errorMsg = `Price sync task failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[SchedulerService] ${errorMsg}`);

      await this.recordTaskExecution({
        taskType: 'price_sync',
        executionDate: today,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        errorMessage: errorMsg,
      });

      return { executed: true, status: 'failed', symbolsProcessed: 0, errors: [errorMsg] };
    }
  }

  /**
   * 获取遗漏的任务日期列表
   */
  async getMissedTaskDates(taskType: ScheduledTaskType, maxDays: number): Promise<Date[]> {
    const missedDates: Date[] = [];
    const today = this.normalizeDate();

    for (let i = 1; i <= maxDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const executed = await this.hasTaskExecuted(taskType, date);
      if (!executed) {
        missedDates.push(date);
      }
    }

    return missedDates;
  }

  /**
   * 补执行遗漏的任务
   */
  async backfillMissedTasks(maxDays: number): Promise<number> {
    let backfillCount = 0;

    // 补执行快照
    const missedSnapshotDates = await this.getMissedTaskDates('daily_snapshot', maxDays);
    if (missedSnapshotDates.length > 0) {
      logger.info(
        `[SchedulerService] Backfilling ${missedSnapshotDates.length} missed snapshot dates`,
      );

      const accounts = await accountService.getAllAccounts();

      for (const date of missedSnapshotDates) {
        for (const account of accounts) {
          try {
            await portfolioSnapshotService.createSnapshot(parseInt(account.id), date, 'backfill');
            backfillCount++;
          } catch (error) {
            logger.error(
              `[SchedulerService] Failed to backfill snapshot for account ${account.id} on ${date.toISOString().split('T')[0]}: ${error}`,
            );
          }
        }

        // 记录补执行日志
        await this.recordTaskExecution({
          taskType: 'daily_snapshot',
          executionDate: date,
          status: 'success',
          metadata: { totalProcessed: accounts.length },
          startedAt: date,
          completedAt: new Date(),
        });
      }
    }

    // 补执行价格同步（标记为已执行即可，实际数据会在下次同步时补齐）
    const missedPriceSyncDates = await this.getMissedTaskDates('price_sync', maxDays);
    for (const date of missedPriceSyncDates) {
      await this.recordTaskExecution({
        taskType: 'price_sync',
        executionDate: date,
        status: 'success',
        metadata: { totalProcessed: 0 },
        startedAt: date,
        completedAt: new Date(),
      });
      backfillCount++;
    }

    return backfillCount;
  }

  /**
   * 获取任务执行状态摘要
   */
  async getTaskStatusSummary(): Promise<{
    dailySnapshot: TaskCheckResult;
    priceSync: TaskCheckResult;
  }> {
    const [dailySnapshot, priceSync] = await Promise.all([
      this.shouldRunTask('daily_snapshot'),
      this.shouldRunTask('price_sync'),
    ]);

    return { dailySnapshot, priceSync };
  }
}

// 导出单例实例
const schedulerService = new SchedulerService();
export default schedulerService;