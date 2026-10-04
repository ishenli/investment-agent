import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerate, mockIsDomainRelevant, mockResolveAgentModel } = vi.hoisted(() => ({
  mockGenerate: vi.fn(async () => [] as string[]),
  mockIsDomainRelevant: vi.fn(async () => true),
  mockResolveAgentModel: vi.fn(async () => ({ model: { id: 'mock' }, apiKey: 'k' })),
}));

vi.mock('@investment-agent/hermes-agent', () => {
  class MockReflectionAuditor {
    constructor(_frameworksPath?: string) {}
    isDomainRelevant(..._args: unknown[]) {
      return mockIsDomainRelevant(..._args);
    }
    generateFollowUpQuestions(..._args: unknown[]) {
      return mockGenerate(..._args);
    }
  }
  return { ReflectionAuditor: MockReflectionAuditor };
});

vi.mock('../agentModelResolver', () => ({
  resolveAgentModel: mockResolveAgentModel,
}));

import { FOLLOW_UP_MAX_ITEMS, FollowUpService } from '../followUpService';

describe('FollowUpService', () => {
  let service: FollowUpService;
  const base = {
    userId: 1,
    provider: 'openai',
    model: 'gpt-4o',
  };

  beforeEach(() => {
    service = new FollowUpService();
    vi.clearAllMocks();
    mockIsDomainRelevant.mockReset().mockResolvedValue(true);
    mockGenerate.mockReset().mockResolvedValue([] as string[]);
  });

  it('投资域对话生成 ≤3 条追问', async () => {
    mockGenerate.mockResolvedValue(['能再对比一下宁德时代吗', '明年营收预期如何']);

    const items = await service.generateFollowUpQuestions({
      ...base,
      messages: ['帮我分析一下苹果股票的基本面'],
      finalReply: '苹果估值合理，营收稳定。',
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(FOLLOW_UP_MAX_ITEMS);
  });

  it('auditor 判定域外时返回空数组', async () => {
    mockIsDomainRelevant.mockResolvedValue(false);

    await expect(
      service.generateFollowUpQuestions({
        ...base,
        messages: ['今天天气怎么样'],
        finalReply: '明天晴转多云。',
      }),
    ).resolves.toEqual([]);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResolveAgentModel).not.toHaveBeenCalled();
  });

  it('模型输出超过 3 条时截断为 3', async () => {
    mockGenerate.mockResolvedValue(['a', 'b', 'c', 'd', 'e']);

    const items = await service.generateFollowUpQuestions({
      ...base,
      messages: ['怎么看新能源板块'],
      finalReply: '长期逻辑成立。',
    });

    expect(items).toHaveLength(FOLLOW_UP_MAX_ITEMS);
  });

  it('LLM 调用失败时返回空数组且不抛出', async () => {
    mockGenerate.mockRejectedValue(new Error('timeout'));

    await expect(
      service.generateFollowUpQuestions({
        ...base,
        messages: ['这只基金怎么样'],
        finalReply: '规模适中。',
      }),
    ).resolves.toEqual([]);
  });
});
