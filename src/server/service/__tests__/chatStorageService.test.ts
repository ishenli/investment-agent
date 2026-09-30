import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@server/repository/chat', () => ({
  sessionRepository: { findByUserId: vi.fn(), findBySlug: vi.fn(), create: vi.fn() },
  sessionGroupRepository: {},
  topicRepository: {},
  messageRepository: {},
  threadRepository: {},
  fileRepository: {},
  pluginRepository: {},
}));

vi.mock('@server/repository/agentRepository', () => ({
  agentRepository: { findBuiltinAgents: vi.fn(), findBySlug: vi.fn() },
}));

vi.mock('@/app/const/session', () => ({ INBOX_SESSION_ID: 'inbox' }));

import { sessionRepository } from '@server/repository/chat';
import { agentRepository } from '@server/repository/agentRepository';
import { ChatStorageService } from '../chatStorageService';

const service = new ChatStorageService();

const insightAgent = {
  slug: 'ai_insight',
  name: '每日洞察',
  systemRole: '你是投资组合洞察 Agent',
  description: '定时洞察任务专属 Agent',
  logo: 'https://example.com/logo.png',
  isBuiltin: true,
};

beforeEach(() => {
  // resetAllMocks：清空调用记录与实现，避免跨测试的状态泄漏
  vi.resetAllMocks();
  vi.mocked(agentRepository.findBuiltinAgents).mockResolvedValue([insightAgent] as never);
  vi.mocked(agentRepository.findBySlug).mockResolvedValue(insightAgent as never);
  vi.mocked(sessionRepository.create).mockResolvedValue('new-session-id');
});

describe('chatStorageService.getOrCreateBuiltinAgentSession（内置 Agent 常驻会话）', () => {
  it('已存在时直接返回常驻会话，不重复创建', async () => {
    const existing = { id: 'sess-1', slug: 'agent-ai_insight-u7' };
    vi.mocked(sessionRepository.findBySlug).mockResolvedValue(existing as never);

    const result = await service.getOrCreateBuiltinAgentSession(7, 'ai_insight');

    expect(result).toBe(existing);
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it('不存在时按 Agent 信息创建常驻会话（绑定 agentId/systemRole/meta）', async () => {
    vi.mocked(sessionRepository.findBySlug)
      .mockResolvedValueOnce(undefined as never)
      .mockResolvedValueOnce({ id: 'sess-created', slug: 'agent-ai_insight-u7' } as never);

    const result = await service.getOrCreateBuiltinAgentSession(7, 'ai_insight');

    expect(sessionRepository.create).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sessionRepository.create).mock.calls[0][0]).toMatchObject({
      userId: 7,
      slug: 'agent-ai_insight-u7',
      type: 'agent',
      agentId: 'ai_insight',
      config: { systemRole: '你是投资组合洞察 Agent' },
      meta: { title: '每日洞察' },
    });
    expect(result).toMatchObject({ id: 'sess-created' });
  });

  it('Agent 不存在时抛出错误', async () => {
    vi.mocked(sessionRepository.findBySlug).mockResolvedValue(undefined as never);
    vi.mocked(agentRepository.findBySlug).mockResolvedValue(null as never);

    await expect(service.getOrCreateBuiltinAgentSession(7, 'ai_insight')).rejects.toThrow(
      'not found',
    );
  });
});

describe('chatStorageService.getSessions（内置 Agent 常驻入口）', () => {
  it('缺失的内置 Agent 会话被补建，并返回刷新后的列表', async () => {
    const created = { id: 'sess-created', slug: 'agent-ai_insight-u7' };
    const refreshed = [created];
    vi.mocked(sessionRepository.findByUserId)
      .mockResolvedValueOnce([] as never) // 初次查询
      .mockResolvedValueOnce(refreshed as never); // 创建后刷新
    vi.mocked(sessionRepository.findBySlug)
      .mockResolvedValueOnce(undefined as never) // 首查不存在
      .mockResolvedValue(created as never); // 创建后回读

    const result = await service.getSessions(7);

    expect(sessionRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toBe(refreshed);
  });

  it('全部常驻会话已存在时直接返回原列表，不做二次查询', async () => {
    const existing = [{ id: 'sess-created', slug: 'agent-ai_insight-u7' }];
    vi.mocked(sessionRepository.findByUserId).mockResolvedValue(existing as never);
    vi.mocked(sessionRepository.findBySlug).mockResolvedValue(existing as never);

    const result = await service.getSessions(7);

    expect(sessionRepository.create).not.toHaveBeenCalled();
    expect(sessionRepository.findByUserId).toHaveBeenCalledTimes(1);
    expect(result).toBe(existing);
  });

  it('查询内置 Agent 异常时降级返回原列表', async () => {
    const existing = [{ id: 'sess-1', slug: 'agent-ai_insight-u7' }];
    vi.mocked(sessionRepository.findByUserId).mockResolvedValue(existing as never);
    vi.mocked(agentRepository.findBuiltinAgents).mockRejectedValue(new Error('db error'));

    const result = await service.getSessions(7);

    expect(result).toBe(existing);
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });
});
