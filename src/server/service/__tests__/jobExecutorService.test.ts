import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScheduledJobEntity } from '@server/repository/scheduledJobRepository';
import type { ScheduledJobLogEntity } from '@server/repository/scheduledJobLogRepository';

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const findById = vi.fn();
const updateLastRunAt = vi.fn();
vi.mock('@server/repository/scheduledJobRepository', () => ({
  scheduledJobRepository: {
    findById: (...a: unknown[]) => findById(...a),
    updateLastRunAt: (...a: unknown[]) => updateLastRunAt(...a),
  },
}));

const logCreate = vi.fn();
const logUpdateStatus = vi.fn();
vi.mock('@server/repository/scheduledJobLogRepository', () => ({
  scheduledJobLogRepository: {
    create: (...a: unknown[]) => logCreate(...a),
    updateStatus: (...a: unknown[]) => logUpdateStatus(...a),
  },
}));

const insightExecute = vi.fn();
vi.mock('@server/service/agentJobExecutor', () => ({
  executeInsightAgentJob: (...a: unknown[]) => insightExecute(...a),
  executeAgentJob: vi.fn(),
}));

import jobExecutorService from '../jobExecutorService';

// ============== Helpers ==============

function makeInsightJob(): ScheduledJobEntity {
  return {
    id: 42,
    userId: 7,
    name: '每日洞察',
    cronExpression: '0 8 * * *',
    jobType: 'insight',
    accountId: 1,
    config: { instructions: '请分析今日持仓风险' },
    timeoutMs: 300000,
    isEnabled: true,
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as ScheduledJobEntity;
}

function makeLog(): ScheduledJobLogEntity {
  return {
    id: 1,
    jobId: 42,
    userId: 7,
    status: 'pending',
    startedAt: new Date(),
    completedAt: null,
    result: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ScheduledJobLogEntity;
}

// ============== Tests ==============

describe('JobExecutorService.executeJob（洞察类型会话式执行）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockReset();
    insightExecute.mockReset();
    logCreate.mockReset();
    logUpdateStatus.mockReset();
    findById.mockResolvedValue(makeInsightJob());
    logCreate.mockResolvedValue(makeLog());
    logUpdateStatus.mockResolvedValue(true);
    updateLastRunAt.mockResolvedValue(undefined);
  });

  it('洞察任务路由到会话式执行，并在执行日志 result 中记录 sessionId', async () => {
    const firstSessionId = 'scheduled-insight-session-A';
    insightExecute.mockResolvedValue({ success: true, sessionId: firstSessionId });

    const result = await jobExecutorService.executeJob(42);

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(firstSessionId);
    // 状态流转 pending → running → success
    expect(logUpdateStatus).toHaveBeenCalledWith(1, 'running');
    const successCall = logUpdateStatus.mock.calls.find((c) => c[1] === 'success');
    expect(successCall).toBeDefined();
    expect(successCall![2]).toMatchObject({
      result: { success: true, sessionId: firstSessionId },
    });
    expect(updateLastRunAt).toHaveBeenCalledWith(42);
  });

  it('同一任务连续两次执行产生不同的 sessionId 并分别记录', async () => {
    insightExecute
      .mockResolvedValueOnce({ success: true, sessionId: 'session-day-1' })
      .mockResolvedValueOnce({ success: true, sessionId: 'session-day-2' });

    const first = await jobExecutorService.executeJob(42);
    const second = await jobExecutorService.executeJob(42);

    expect(first.sessionId).toBe('session-day-1');
    expect(second.sessionId).toBe('session-day-2');
    expect(first.sessionId).not.toBe(second.sessionId);
    // 每次执行都写了独立日志
    expect(logCreate).toHaveBeenCalledTimes(2);
  });

  it('缺失 instructions 时执行失败，日志状态标记 failed 并记录错误信息', async () => {
    insightExecute.mockRejectedValue(new Error('洞察任务缺少指令描述（config.instructions）'));

    const result = await jobExecutorService.executeJob(42);

    expect(result.success).toBe(false);
    const failedCall = logUpdateStatus.mock.calls.find((c) => c[1] === 'failed');
    expect(failedCall).toBeDefined();
    expect(failedCall![2]).toMatchObject({
      errorMessage: '洞察任务缺少指令描述（config.instructions）',
    });
  });

  it('会话创建失败时执行失败，日志状态标记 failed 并记录错误堆栈信息', async () => {
    insightExecute.mockRejectedValue(new Error('slug conflict'));

    const result = await jobExecutorService.executeJob(42);

    expect(result.success).toBe(false);
    const failedCall = logUpdateStatus.mock.calls.find((c) => c[1] === 'failed');
    expect(failedCall).toBeDefined();
    expect(failedCall![2]?.errorMessage).toBe('slug conflict');
  });

  it('执行中的异常不影响其他任务的后续调度（队列正常释放）', async () => {
    insightExecute
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ success: true, sessionId: 'ok-session' });

    await jobExecutorService.executeJob(42);
    const second = await jobExecutorService.executeJob(42);

    expect(second.success).toBe(true);
    expect(second.sessionId).toBe('ok-session');
  });
});