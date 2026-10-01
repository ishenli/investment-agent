import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { findAgentSessions } = vi.hoisted(() => ({ findAgentSessions: vi.fn() }));
vi.mock('@server/repository/chat', () => ({
  sessionRepository: {
    findByUserIdAndAgentId: findAgentSessions,
  },
  topicRepository: {
    findBySessionId: vi.fn(),
  },
  messageRepository: {
    findAssistantMessagesByTopicIds: vi.fn(),
  },
}));

import { sessionRepository, topicRepository, messageRepository } from '@server/repository/chat';
import AiInsightService from '../aiInsightService';

const service = AiInsightService;

// ============== Fixtures ==============

const agentSession = {
  id: 'sess-standing',
  userId: 7,
  slug: 'agent-ai_insight-u7',
  type: 'agent' as const,
  agentId: 'ai_insight',
  groupId: null,
  pinned: false,
  config: {},
  meta: { title: '每日洞察' },
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-08T00:00:00Z'),
};

const topicNewer = {
  id: 't2',
  sessionId: 'sess-standing',
  title: '每日洞察 · 2026-09-08',
  favorite: false,
  createdAt: new Date('2026-09-08T08:00:00Z'),
  updatedAt: new Date('2026-09-08T08:00:00Z'),
};

const topicOlder = {
  id: 't1',
  sessionId: 'sess-standing',
  title: '每日洞察 · 2026-09-07',
  favorite: false,
  createdAt: new Date('2026-09-07T08:00:00Z'),
  updatedAt: new Date('2026-09-07T08:00:00Z'),
};

const messageFor = (topicId: string, content: string) => ({
  id: `msg-${topicId}`,
  sessionId: 'sess-standing',
  topicId,
  role: 'assistant' as const,
  content,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AiInsightService.getInsightHistory（按 topic 聚合洞察历史）', () => {
  it('聚合常驻会话下的洞察 topic，产出取每 topic 最后一条助手消息', async () => {
    findAgentSessions.mockResolvedValue([agentSession]);
    vi.mocked(topicRepository.findBySessionId).mockResolvedValue([topicOlder, topicNewer] as never);
    vi.mocked(messageRepository.findAssistantMessagesByTopicIds).mockResolvedValue([
      messageFor('t1', '昨天的洞察结论'),
      // 升序排列：t2 更早的助手消息在前，验证“取最后一条”
      {
        ...messageFor('t2', '今日开盘简报'),
        createdAt: new Date('2026-09-08T07:00:00Z'),
      },
      {
        ...messageFor('t2', '今日组合整体风险可控。'),
        createdAt: new Date('2026-09-08T08:05:00Z'),
      },
    ] as never);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    expect(sessionRepository.findByUserIdAndAgentId).toHaveBeenCalledWith(7, 'ai_insight');
    expect(result.totalCount).toBe(2);
    // 倒序:最新 topic 在前
    expect(result.items[0]).toMatchObject({
      id: 't2',
      sessionId: 'sess-standing',
      topicId: 't2',
      title: '每日洞察 · 2026-09-08',
      description: '今日组合整体风险可控。',
      source: 'agent',
      type: 'agent',
      confidence: null,
    });
    expect(result.items[1].title).toBe('每日洞察 · 2026-09-07');
  });

  it('无常驻会话时返回空列表且不查询 topic', async () => {
    findAgentSessions.mockResolvedValue([]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    expect(result).toEqual({ items: [], totalCount: 0, totalPages: 0, currentPage: 1 });
    expect(topicRepository.findBySessionId).not.toHaveBeenCalled();
  });

  it('分页正确切分 topic，且只查询当前页 topic 的消息', async () => {
    findAgentSessions.mockResolvedValue([agentSession]);
    const topics = Array.from({ length: 3 }, (_, i) => ({
      id: `t${i + 1}`,
      sessionId: 'sess-standing',
      title: `每日洞察 · 2026-09-0${i + 1}`,
      favorite: false,
      createdAt: new Date(`2026-09-0${i + 1}T08:00:00Z`),
      updatedAt: new Date(`2026-09-0${i + 1}T08:00:00Z`),
    }));
    vi.mocked(topicRepository.findBySessionId).mockResolvedValue(topics as never);
    vi.mocked(messageRepository.findAssistantMessagesByTopicIds).mockResolvedValue([]);

    const result = await service.getInsightHistory(7, { page: 2, pageSize: 2 });

    expect(result.totalCount).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(2);
    expect(result.items.map((i) => i.id)).toEqual(['t1']);
    expect(messageRepository.findAssistantMessagesByTopicIds).toHaveBeenCalledWith(['t1']);
  });

  it('topic 无助手消息时产出为空字符串', async () => {
    findAgentSessions.mockResolvedValue([agentSession]);
    vi.mocked(topicRepository.findBySessionId).mockResolvedValue([topicNewer] as never);
    vi.mocked(messageRepository.findAssistantMessagesByTopicIds).mockResolvedValue([]);

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    expect(result.items[0].description).toBe('');
  });

  it('查询异常时返回空结果（降级）', async () => {
    findAgentSessions.mockRejectedValue(new Error('db error'));

    const result = await service.getInsightHistory(7, { page: 1, pageSize: 10 });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
