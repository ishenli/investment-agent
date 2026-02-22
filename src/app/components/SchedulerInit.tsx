'use client';

import { useScheduler } from '@/app/hooks/useScheduler';

/**
 * 调度器初始化组件
 *
 * 在应用启动时自动检查并执行遗漏的定时任务
 * - 每日投资组合快照
 * - 价格历史同步
 */
export function SchedulerInit() {
  const { isExecuting, lastCheckResult, error } = useScheduler({
    runOnMount: true,
    enableBackgroundCheck: true,
    checkIntervalMs: 60 * 60 * 1000, // 1 小时
  });

  // 可选：显示任务执行状态（调试用）
  if (process.env.NODE_ENV === 'development' && lastCheckResult) {
    console.log('[SchedulerInit] Task check result:', lastCheckResult);
  }

  // 可选：显示错误信息
  if (error) {
    console.error('[SchedulerInit] Scheduler error:', error);
  }

  // 此组件不渲染任何 UI
  return null;
}