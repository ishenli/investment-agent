'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 任务状态
 */
interface TaskStatus {
  taskType: string;
  executed: boolean;
  lastExecutionDate?: string;
  lastStatus?: string;
}

/**
 * 任务检查结果
 */
interface TaskCheckResult {
  snapshot?: {
    executed: boolean;
    status: string;
    accountsProcessed: number;
    errors: string[];
  };
  priceSync?: {
    executed: boolean;
    status: string;
    symbolsProcessed: number;
    errors: string[];
  };
  backfillCount?: number;
}

/**
 * Hook 返回值
 */
interface UseSchedulerReturn {
  /** 任务状态 */
  status: {
    dailySnapshot: TaskStatus | null;
    priceSync: TaskStatus | null;
  } | null;
  /** 是否正在检查 */
  isChecking: boolean;
  /** 是否正在执行 */
  isExecuting: boolean;
  /** 最后一次检查结果 */
  lastCheckResult: TaskCheckResult | null;
  /** 错误信息 */
  error: string | null;
  /** 手动触发任务检查 */
  checkAndRun: (options?: { force?: boolean }) => Promise<void>;
  /** 刷新状态 */
  refreshStatus: () => Promise<void>;
}

/**
 * 调度器 Hook
 *
 * 提供定时任务的检查和执行功能
 * - 应用启动时自动检查并执行遗漏的任务
 * - 可选：应用运行期间定期检查（通过 setInterval）
 */
export function useScheduler(options?: {
  /** 是否在挂载时自动执行检查 */
  runOnMount?: boolean;
  /** 是否启用后台定时检查 */
  enableBackgroundCheck?: boolean;
  /** 后台检查间隔（毫秒），默认 1 小时 */
  checkIntervalMs?: number;
}): UseSchedulerReturn {
  const {
    runOnMount = true,
    enableBackgroundCheck = false,
    checkIntervalMs = 60 * 60 * 1000, // 1 小时
  } = options || {};

  const [status, setStatus] = useState<{
    dailySnapshot: TaskStatus | null;
    priceSync: TaskStatus | null;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<TaskCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRunOnMount = useRef(false);

  /**
   * 刷新任务状态
   */
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduled', { method: 'GET' });
      if (!response.ok) {
        throw new Error('Failed to fetch task status');
      }
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('[useScheduler] Failed to refresh status:', err);
    }
  }, []);

  /**
   * 检查并执行任务
   */
  const checkAndRun = useCallback(
    async (checkOptions?: { force?: boolean }) => {
      setIsExecuting(true);
      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch('/api/scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            force: checkOptions?.force ?? false,
            backfillDays: 7,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check and run tasks');
        }

        const data = await response.json();
        if (data.success) {
          setLastCheckResult(data.data.result);
          // 刷新状态
          await refreshStatus();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        console.error('[useScheduler] Check and run failed:', err);
      } finally {
        setIsExecuting(false);
        setIsChecking(false);
      }
    },
    [refreshStatus],
  );

  // 挂载时自动执行检查
  useEffect(() => {
    if (runOnMount && !hasRunOnMount.current) {
      hasRunOnMount.current = true;
      checkAndRun();
    }
  }, [runOnMount, checkAndRun]);

  // 启动后台定时检查
  useEffect(() => {
    if (enableBackgroundCheck && checkIntervalMs > 0) {
      intervalRef.current = setInterval(() => {
        checkAndRun();
      }, checkIntervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enableBackgroundCheck, checkIntervalMs, checkAndRun]);

  return {
    status,
    isChecking,
    isExecuting,
    lastCheckResult,
    error,
    checkAndRun,
    refreshStatus,
  };
}

export default useScheduler;