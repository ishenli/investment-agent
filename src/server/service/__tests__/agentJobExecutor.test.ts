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
    getOrCreateBuiltinAgentSession: vi.fn(),
    createTopic: vi.fn(),
    createMessage: vi.fn(),
    deleteTopic: vi.fn(),
  },
}));

const deleteTopicsBeyond = vi.fn();
vi.mock('@server/repository/chat', () => ({
  topicRepository: {
    deleteBeyondBySessionId: (...a: unknown[]) => deleteTopicsBeyond(...a),
  },
}));

const findAgentBySlug = vi.fn();
vi.mock('@server/repository/agentRepository', () => ({
  agentRepository: {
    findBySlug: (...a: unknown[]) => findAgentBySlug(...a),
  },
}));

vi.mock('@server/service/notificationService', () => ({
  default: {
    createNotification: vi.fn(),
  },
}));

import { chatStorageService } from '@server/service/chatStorageService';
import notificationService from '@server/service/notificationService';
import { executeInsightAgentJob } from '../agentJobExecutor';

// ============== Helpers ==============

const STANDING_SESSION_ID = 'sess-standing';

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

beforeEach(() => {
  vi.resetAllMocks();
  engineRun.mockReset();
  engineRun.mockResolvedValue({ ...engineResult });
  findAgentBySlug.mockResolvedValue({
    slug: 'ai_insight',
    systemRole: '你是投资组合洞察 Agent，负责执行每日定时洞察任务。',
  });
  vi.mocked(chatStorageService.getOrCreateBuiltinAgentSession).mockResolvedValue({
    id: STANDING_SESSION_ID,
  } as never);
  vi.mocked(chatStorageService.createTopic).mockResolvedValue('topic-1');
  vi.mocked(chatStorageService.createMessage).mockResolvedValue('message-1');
  vi.mocked(chatStorageService.deleteTopic).mockResolvedValue(true);
  deleteTopicsBeyond.mockResolvedValue(0);
  vi.mocked(notificationService.createNotification).mockResolvedValue({} as never);
});

// ============== Tests ==============

describe('executeInsightAgentJob（洞察落 Agent 常驻会话的 topic）', () => {
  it('在常驻会话下新建 topic，指令与产出均落该 topic', async () => {
    const result = await executeInsightAgentJob(makeInsightJob());

    // 复用「每日洞察」Agent 的常驻会话
    expect(chatStorageService.getOrCreateBuiltinAgentSession).toHaveBeenCalledWith(
      7,
      'ai_insight',
    );

    // 本次执行新建 topic（标题 = 任务名 · 日期）
    expect(chatStorageService.createTopic).toHaveBeenCalledTimes(1);
    const topicArgs = vi.mocked(chatStorageService.createTopic).mock.calls[0][0];
    expect(topicArgs.sessionId).toBe(STANDING_SESSION_ID);
    expect(topicArgs.title).toContain('每日洞察');

    // 常驻会话内裁剪旧 topic，仅保留最近 30 个
    expect(deleteTopicsBeyond).toHaveBeenCalledWith(STANDING_SESSION_ID, 30);

    // 用户指令与助手产出均绑定该 topic
    expect(chatStorageService.createMessage).toHaveBeenCalledTimes(2);
    const [userMsg, assistantMsg] = vi.mocked(chatStorageService.createMessage).mock.calls;
    expect(userMsg[0]).toMatchObject({
      sessionId: STANDING_SESSION_ID,
      topicId: 'topic-1',
      role: 'user',
      content: '请分析今日持仓风险',
    });
    expect(assistantMsg[0]).toMatchObject({
      sessionId: STANDING_SESSION_ID,
      topicId: 'topic-1',
      role: 'assistant',
      content: engineResult.content,
    });

    // 引擎上下文:常驻会话 userId,使用专属 Agent systemRole 与账户上下文
    const engineCtx = engineRun.mock.calls[0][0];
    expect(engineCtx.sessionId).toBe(STANDING_SESSION_ID);
    expect(engineCtx.userId).toBe(7);
    expect(engineCtx.systemPrompt).toContain('投资组合洞察 Agent');
    expect(engineCtx.systemPrompt).toContain('账户 ID 为 1');

    // result 记录 sessionId/topicId/产出消息 id
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(STANDING_SESSION_ID);
    expect(result.topicId).toBe('topic-1');
    expect(result.insightMessageId).toBe('message-1');

    // 通知链接指向该 Agent 会话,数据携带 topicId
    const notifArgs = vi.mocked(notificationService.createNotification).mock.calls[0];
    expect(notifArgs[1].link).toContain('/chat?session=sess-standing');
    expect(notifArgs[1].data).toMatchObject({ sessionId: STANDING_SESSION_ID, topicId: 'topic-1' });
  });

  it('缺 instructions 时抛出错误，不取会话不建 topic 不执行引擎', async () => {
    const job = makeInsightJob({ config: { instructions: '   ' } });

    await expect(executeInsightAgentJob(job)).rejects.toThrow('缺少指令描述');

    expect(chatStorageService.getOrCreateBuiltinAgentSession).not.toHaveBeenCalled();
    expect(chatStorageService.createTopic).not.toHaveBeenCalled();
    expect(chatStorageService.createMessage).not.toHaveBeenCalled();
    expect(engineRun).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('常驻会话获取失败时抛出错误，不建 topic，不触发成功通知', async () => {
    vi.mocked(chatStorageService.getOrCreateBuiltinAgentSession).mockRejectedValue(
      new Error('agent not found'),
    );

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('agent not found');

    expect(chatStorageService.createTopic).not.toHaveBeenCalled();
    expect(engineRun).not.toHaveBeenCalled();
    expect(chatStorageService.deleteTopic).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('Agent 引擎执行未完成时抛出错误，并清理本次新建 topic 避免残留（常驻会话保留）', async () => {
    engineRun.mockResolvedValue({ content: '', completed: false, error: 'LLM timeout' });

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('LLM timeout');

    expect(chatStorageService.createMessage).toHaveBeenCalledTimes(1);
    expect(chatStorageService.deleteTopic).toHaveBeenCalledWith('topic-1');
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('助手消息写库失败时同样删除 topic 并抛错', async () => {
    vi.mocked(chatStorageService.createMessage)
      .mockResolvedValueOnce('msg-user')
      .mockRejectedValueOnce(new Error('insert failed'));

    const job = makeInsightJob();

    await expect(executeInsightAgentJob(job)).rejects.toThrow('insert failed');

    expect(chatStorageService.deleteTopic).toHaveBeenCalledWith('topic-1');
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('accountId 为空时执行不带账户上下文', async () => {
    const job = makeInsightJob({ accountId: null });

    const result = await executeInsightAgentJob(job);

    expect(result.success).toBe(true);
    const engineCtx = engineRun.mock.calls[0][0];
    expect(engineCtx.systemPrompt).not.toContain('账户 ID');
  });
});
