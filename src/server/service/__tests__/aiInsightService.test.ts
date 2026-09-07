import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const findByUserId = vi.fn();
const deleteByUserIdAndSource = vi.fn();
vi.mock('@server/repository/aiInsightRepository', () => ({
  aiInsightRepository: {
    findByUserId: (...a: unknown[]) => findByUserId(...a),
    deleteByUserIdAndSource: (...a: unknown[]) => deleteByUserIdAndSource(...a),
  },
}));

const findSessions = vi.fn();
vi.mock('@server/repository/chat', () => ({
  sessionRepository: {
    findScheduledInsightSessionsByUserId: (...a: unknown[]) => findSessions(...a),
  },
  messageRepository: {
    findAssistantMessagesBySessionIds: vi.fn(),
  },
}));

import { sessionRepository, messageRepository } from '@server/repository/chat';
import AiInsightService from '../aiInsightService';

const service = AiInsightService;

// ============== Fixtures ==============

const legacyScheduled = {
  id: 11,
  userId: 7,
  accountId: 1,
  jobId: 42,
  title: '旧洞察：半导体仓位偏高',
  description: '旧结构化描述',
  type: 'risk' as const,
  confidence: 80,
  metadata: null,
  source: 'scheduled' as const,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const legacyManual = {
  ...legacyScheduled,
  id: 12,
  title: '手动洞察',
  source: 'manual' as const,
  createdAt: new Date('2026-09-01T01:00:00Z'),
};

const sessionRecord = {
  id: 'sess-abc',
  userId: 7,
  slug: 'scheduled-insight-42-1756800000000',
  type: 'agent' as const,
  groupId: null,
  pinned: false,
  config: { model: 'default', params: {}, provider: 'openai', systemRole: '' },
  meta: { title: '每日洞察 · 2026-09-02' },
  agentId: null,
  createdAt: new Date('2026-09-02T00:00:00Z'),
  updatedAt: new Date('2026-09-02T00:00:00Z'),
};

const assistantMessage = {
  id: 'msg-1',
  sessionId: 'sess-abc',
  topicId: null,
  parentId: null,
  role: 'assistant' as const,
  content: '今日组合整体风险可控，建议关注半导体仓位。',
  createdAt: new Date('2026-09-02T00:00:05Z'),
  updatedAt: new Date('2026-09-02T00:00:05Z'),
};

// ============== Tests ==============

describe('AiInsightService.getInsightHistory（新旧聚合）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByUserId.mockReset();
    findSessions.mockReset();
    vi.mocked(messageRepository.findAssistantMessagesBySessionIds).mockReset();
  });

  it('聚合旧 ai_insights 与会话式新产出，按时间倒序返回', async () => {
    findByUserId.mockResolvedValue({ items: [legacyManual, legacyScheduled], totalCount: 2 });
    findSessions.mockResolvedValue([sessionRecord]);
    vi.mocked(messageRepository.findAssistantMessagesBySessionIds).mockResolvedValue([assistantMessage]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    // 三条记录合一：新会话产出 + 两条旧记录
    expect(result.totalCount).toBe(3);
    // 时间倒序：最新（2026-09-02 会话）在最前
    expect(result.items[0].source).toBe('agent');
    expect(result.items[0].sessionId).toBe('sess-abc');
    expect(result.items[0].jobId).toBe(42);
    expect(result.items[0].description).toBe(assistantMessage.content);
    // 旧记录保留且只读
    expect(result.items.some((i) => i.id === '11' && i.source === 'scheduled' && i.type === 'risk')).toBe(true);
    expect(result.items.some((i) => i.id === '12' && i.source === 'manual')).toBe(true);
  });

  it('source 过滤为 agent 时只返回会话式新记录', async () => {
    findByUserId.mockResolvedValue({ items: [legacyScheduled], totalCount: 1 });
    findSessions.mockResolvedValue([sessionRecord]);
    vi.mocked(messageRepository.findAssistantMessagesBySessionIds).mockResolvedValue([assistantMessage]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10, source: 'agent' });

    // 会话记录被加载，旧记录被过滤掉
    expect(findSessions).toHaveBeenCalledTimes(1);
    expect(findByUserId).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
    expect(result.items[0].source).toBe('agent');
  });

  it('source 过滤为 scheduled 时只返回旧记录', async () => {
    findByUserId.mockResolvedValue({ items: [legacyScheduled], totalCount: 1 });
    findSessions.mockResolvedValue([sessionRecord]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10, source: 'scheduled' });

    expect(findByUserId).toHaveBeenCalledWith(7, expect.objectContaining({ source: 'scheduled' }));
    expect(findSessions).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
    expect(result.items[0].source).toBe('scheduled');
  });

  it('type 过滤为 agent 时只返回会话式新记录', async () => {
    findSessions.mockResolvedValue([sessionRecord]);
    vi.mocked(messageRepository.findAssistantMessagesBySessionIds).mockResolvedValue([assistantMessage]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10, type: 'agent' });

    expect(findSessions).toHaveBeenCalledTimes(1);
    expect(findByUserId).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
    expect(result.items[0].type).toBe('agent');
  });

  it('分页正确切分聚合结果', async () => {
    findByUserId.mockResolvedValue({ items: [legacyScheduled], totalCount: 1 });
    findSessions.mockResolvedValue([
      { ...sessionRecord, id: 's1' },
      { ...sessionRecord, id: 's2' },
      { ...sessionRecord, id: 's3' },
    ]);
    vi.mocked(messageRepository.findAssistantMessagesBySessionIds).mockResolvedValue([
      { ...assistantMessage, sessionId: 's1' },
      { ...assistantMessage, sessionId: 's2' },
      { ...assistantMessage, sessionId: 's3' },
    ]);

    const result = await service.getInsightHistory(7, { page: 2, pageSize: 2 });

    // 4 条聚合（3 会话 + 1 旧记录），第 2 页只回 2 条
    expect(result.totalCount).toBe(4);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(2);
    expect(result.items.length).toBe(2);
  });

  it('会话查询异常时不影响旧记录返回（降级）', async () => {
    findByUserId.mockResolvedValue({ items: [legacyScheduled], totalCount: 1 });
    findSessions.mockRejectedValue(new Error('db error'));

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    expect(result.totalCount).toBe(1);
    expect(result.items[0].source).toBe('scheduled');
  });
});

describe('AiInsightService.cleanLegacyScheduledInsights（清理旧定时洞察）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteByUserIdAndSource.mockReset();
  });

  it('仅删除当前用户的 source=scheduled 记录并返回删除数量', async () => {
    deleteByUserIdAndSource.mockResolvedValue(37);

    const deleted = await service.cleanLegacyScheduledInsights(7);

    expect(deleteByUserIdAndSource).toHaveBeenCalledWith(7, 'scheduled');
    expect(deleted).toBe(37);
  });

  it('无残留时返回 0', async () => {
    deleteByUserIdAndSource.mockResolvedValue(0);

    const deleted = await service.cleanLegacyScheduledInsights(7);

    expect(deleted).toBe(0);
  });
});