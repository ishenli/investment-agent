import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScheduledJobEntity } from '@server/repository/scheduledJobRepository';
import { nanoid } from 'nanoid';

// ============== Mocks ==============

vi.mock('@server/base/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@server/core/engine/eventSink', () => ({
  NoOpEventSink: class NoOpEventSink {
    sendStatus = vi.fn();
    sendTextDelta = vi.fn();
  },
}));

const engineRun = vi.fn();
vi.mock('@server/core/agents/hermes/engine', () => ({
  HermesEngine: class {
    run = (...args: unknown[]) => engineRun(...args);
  },
}));

vi.mock('@server/service/chatStorageService', () => ({
  chatStorageService: {
    createSession: vi.fn(),
    createMessage: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

vi.mock('@server/repository/chat', () => ({
  sessionRepository: {
    deleteScheduledInsightSessionsBeyond: vi.fn(),
  },
  messageRepository: {},
}));

vi.mock('@server/service/notificationService', () => ({
  default: {
    createNotification: vi.fn(),
  },
}));

import { chatStorageService } from '@server/service/chatStorageService';
import { sessionRepository } from '@server/repository/chat';
import notificationService from '@server/service/notificationService';
import { executeInsightAgentJob } from '../agentJobExecutor';

// ============== Helpers ==============

function makeInsightJob(overrides: Partial<ScheduledJobEntity> = {}): ScheduledJobEntity {
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
    ...overrides,
  } as ScheduledJobEntity;
}

const engineResult = {
  content: '今日组合整体风险可控，建议关注半导体仓位。',
  completed: true,
  error: undefined,
  usage: { input: 100, output: 200, total: 300, costUsd: 0.01 },
};

// ============== Tests ==============

describe('executeInsightAgentJob（会话式洞察执行）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engineRun.mockReset();
    engineRun.mockResolvedValue({ ...engineResult });
    vi.mocked(chatStorageService.createSession).mockResolvedValue(`session-${nanoid()}`);
    vi.mocked(chatStorageService.createMessage).mockResolvedValue(`message-${nanoid()}`);
    vi.mocked(chatStorageService.deleteSession).mockResolvedValue(true);
    vi.mocked(sessionRepository.deleteScheduledInsightSessionsBeyond).mockResolvedValue(3);
    vi.mocked(notificationService.createNotification).mockResolvedValue({} as never);
  });

  it('读取 config.instructions 作为提示词，创建全新会话并落库产出消息', async () => {
    const job = makeInsightJob();

    const result = await executeInsightAgentJob(job);

    // 创建了唯一 slug 的会话
    expect(chatStorageService.createSession).toHaveBeenCalledTimes(1);
    const sessionArgs = vi.mocked(chatStorageService.createSession).mock.calls[0];
    expect(sessionArgs[0]).toBe(7);
    const sessionData = sessionArgs[1];
    expect(sessionData.type).toBe('agent');
    expect(sessionData.slug).toMatch(/^scheduled-insight-42-[^\s]+$/);
    expect(sessionData.meta.title).toContain('每日洞察');

    // 创建后裁剪历史洞察会话，仅保留最近 30 条
    expect(sessionRepository.deleteScheduledInsightSessionsBeyond).toHaveBeenCalledWith(7, 30);

    // 用户指令与助手产出分别落为同会话两条消息
    expect(chatStorageService.createMessage).toHaveBeenCalledTimes(2);
    const [userMsg, assistantMsg] = vi.mocked(chatStorageService.createMessage).mock.calls;
    expect(userMsg[0].role).toBe('user');
    expect(userMsg[0].content).toBe('请分析今日持仓风险');
    expect(assistantMsg[0].role).toBe('assistant');
    expect(assistantMsg[0].content).toBe(engineResult.content);

    // 引擎执行上下文携带任务 userId 与新建会话 id，不依赖前端 session
    const returnedSessionId = await vi.mocked(chatStorageService.createSession).mock.results[0].value;
    const engineCtx = engineRun.mock.calls[0][0];
    expect(engineCtx.userId).toBe(7);
    expect(engineCtx.messages[0].content).toBe('请分析今日持仓风险');
    expect(engineCtx.sessionId).toBe(returnedSessionId);

    // result 记录 sessionId 与产出消息 id
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(returnedSessionId);
    expect(result.insightMessageId).toBeDefined();

    // 通知链接指向该次会话
    const notifArgs = vi.mocked(notificationService.createNotification).mock.calls[0];
    expect(notifArgs[1].link).toContain('/chat?session=');
    expect(notifArgs[1].data).toMatchObject({ sessionId: result.sessionId });
  });

  it('缺 instructions 时抛出错误，且不创建会话不执行引擎', async () => {
    const job = makeInsightJob({ config: { instructions: '   ' } });

    await expect(executeInsightAgentJob(job)).rejects.toThrow('缺少指令描述');

    expect(chatStorageService.createSession).not.toHaveBeenCalled();
    expect(chatStorageService.createMessage).not.toHaveBeenCalled();
    expect(engineRun).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('会话创建失败时抛出错误，不继续执行引擎，不触发成功通知', async () => {
    vi.mocked(chatStorageService.createSession).mockRejectedValue(new Error('slug conflict'));

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('slug conflict');

    expect(chatStorageService.createMessage).not.toHaveBeenCalled();
    expect(chatStorageService.deleteSession).not.toHaveBeenCalled();
    expect(engineRun).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('Agent 引擎执行未完成时抛出错误，并清理本次新建会话避免残留', async () => {
    engineRun.mockResolvedValue({ content: '', completed: false, error: 'LLM timeout' });

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('LLM timeout');

    // 用户消息已写入，但引擎失败后删除该会话（级联删除其中的消息），不触发成功通知
    expect(chatStorageService.createMessage).toHaveBeenCalledTimes(1);
    expect(chatStorageService.deleteSession).toHaveBeenCalledTimes(1);
    expect(chatStorageService.deleteSession).toHaveBeenCalledWith(expect.stringContaining('session-'));
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('助手消息写库失败时同样删除会话并抛错，不留空会话', async () => {
    const sessionId = 'sess-write-fail';
    vi.mocked(chatStorageService.createSession).mockResolvedValue(sessionId);
    vi.mocked(chatStorageService.createMessage)
      .mockResolvedValueOnce('msg-user')
      .mockRejectedValueOnce(new Error('insert failed'));

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('insert failed');

    expect(chatStorageService.deleteSession).toHaveBeenCalledWith(sessionId);
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('accountId 为空时仍可执行（不带账户上下文）', async () => {
    const job = makeInsightJob({ accountId: null });

    const result = await executeInsightAgentJob(job);

    expect(result.success).toBe(true);
    expect(chatStorageService.createSession).toHaveBeenCalledTimes(1);
    const engineCtx = engineRun.mock.calls[0][0];
    expect(engineCtx.systemPrompt).not.toContain('账户 ID');
  });
});