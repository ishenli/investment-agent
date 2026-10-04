import { describe, it, expect, vi, beforeEach } from 'vitest';

// 覆盖 setup 的 decorator mock：与生产一致，把 this 绑定到控制器类本身
vi.mock('@server/base/decorators', () => ({
  WithRequestContextStatic: () => (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      return originalMethod.apply(target, args);
    };
    return descriptor;
  },
}));

vi.mock('@server/service/authService', () => ({
  default: {
    getCurrentUserId: vi.fn(async () => '1'),
  },
}));

vi.mock('@server/repository/chat/session', () => ({
  sessionRepository: {
    findById: vi.fn(async () => ({ id: 's1' })),
  },
}));

vi.mock('@server/service/chatStorageService', () => ({
  default: {
    createMessage: vi.fn(async () => ({})),
  },
}));

vi.mock('@server/core/engine', () => ({
  runEngine: vi.fn(async () => ({ content: '苹果当前PE偏低，营收稳定。', completed: true })),
}));

vi.mock('@server/service/settingService', () => {
  const getConfigValueByKey = vi.fn(async () => undefined);
  return { default: { getConfigValueByKey }, __getConfigValueByKey: getConfigValueByKey };
});

vi.mock('@server/service/followUpService', () => {
  const generateFollowUpQuestions = vi.fn(async () => ['追问1', '追问2'] as string[]);
  return {
    default: { generateFollowUpQuestions },
    __generateFollowUpQuestions: generateFollowUpQuestions,
  };
});

vi.mock('@server/base/sseEmitter', () => {
  const events: string[] = [];
  const sendRelatedImpl = vi.fn(async (items: string[]) => {
    events.push(`related:${items.length}`);
    return true;
  });
  const SSEEmitter = class {
    readable = {} as ReadableStream;
    sendAgentError = vi.fn(async () => true);
    sendRelated = sendRelatedImpl;
    sendDone = vi.fn(async () => {
      events.push('done');
      return true;
    });
    close = vi.fn(async () => {
      events.push('close');
      return true;
    });
  };
  return { SSEEmitter, __events: events, __sendRelatedImpl: sendRelatedImpl };
});

import { default as settingServiceMock } from '@server/service/settingService';
import {
  __generateFollowUpQuestions,
  default as followUpServiceMock,
} from '@server/service/followUpService';
import { __events, __sendRelatedImpl } from '@server/base/sseEmitter';
import { POST } from '../route';

function makeRequest() {
  return new Request('http://localhost/api/chat/hermes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'default-session',
      messages: [{ role: 'user', content: '帮我分析一下苹果股票的基本面' }],
    }),
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('HermesAgentController POST - follow-up related emission', () => {
  beforeEach(() => {
    __events.length = 0;
    vi.clearAllMocks();
    getConfigValueByKeyMock().mockResolvedValue(undefined);
    generateFollowUpQuestionsMock().mockResolvedValue(['追问1', '追问2']);
  });

  function getConfigValueByKeyMock() {
    return vi.mocked(settingServiceMock.getConfigValueByKey);
  }

  function generateFollowUpQuestionsMock() {
    return vi.mocked(followUpServiceMock.generateFollowUpQuestions);
  }

  it('开关开启且生成出追问时，related 事件出现在 done 之前且 ≤3', async () => {
    const response = await POST(makeRequest());
    await flush();

    expect(response.status).toBe(200);
    expect(__events).toEqual(['related:2', 'done', 'close']);
    expect(__sendRelatedImpl).toHaveBeenCalledWith(['追问1', '追问2']);
  });

  it('开关关闭时不发 related，主回复不受影响', async () => {
    getConfigValueByKeyMock().mockResolvedValue('false');

    const response = await POST(makeRequest());
    await flush();

    expect(response.status).toBe(200);
    expect(__events).toEqual(['done', 'close']);
    expect(generateFollowUpQuestionsMock()).not.toHaveBeenCalled();
  });

  it('生成失败时发送空 related，流正常结束', async () => {
    generateFollowUpQuestionsMock().mockRejectedValue(new Error('timeout'));

    const response = await POST(makeRequest());
    await flush();

    expect(response.status).toBe(200);
    expect(__events).toEqual(['related:0', 'done', 'close']);
    expect(__sendRelatedImpl).toHaveBeenCalledWith([]);
  });

  it('域外对话发送空 related，流正常结束', async () => {
    generateFollowUpQuestionsMock().mockResolvedValue([]);

    const response = await POST(makeRequest());
    await flush();

    expect(response.status).toBe(200);
    expect(__events).toEqual(['related:0', 'done', 'close']);
  });
});
