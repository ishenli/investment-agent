import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChannelMessage } from '@investment-agent/agent-channel';
import type { ChannelMessageContext } from '../types';

vi.mock('@server/core/engine', () => ({
  runEngine: vi.fn(),
}));

vi.mock('@server/core/agents/hermes', () => ({
  INVESTMENT_ASSISTANT_SYSTEM_PROMPT: 'system prompt',
}));

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { runEngine } from '@server/core/engine';
import { HermesChannelHandler } from '../hermesChannelHandler';

function makeMessage(overrides: Partial<ChannelMessage> = {}): ChannelMessage {
  return {
    id: 'msg_1',
    channelId: 'feishu:oc_test',
    platform: 'feishu',
    userId: 'ou_user',
    content: '你好',
    timestamp: Date.now(),
    ...overrides,
  };
}

const ctx: ChannelMessageContext = { sessionId: 's1', userId: 1, history: [] };

describe('HermesChannelHandler', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('returns the engine content on success', async () => {
    vi.mocked(runEngine).mockResolvedValue({
      completed: true,
      content: '这是回复',
      apiCalls: 1,
    } as never);

    await expect(new HermesChannelHandler('feishu').handle(makeMessage(), ctx)).resolves.toBe(
      '这是回复',
    );
  });

  it('falls back to the engine error when content is empty', async () => {
    vi.mocked(runEngine).mockResolvedValue({
      completed: false,
      content: '',
      error: '模型未配置',
    } as never);

    await expect(new HermesChannelHandler('feishu').handle(makeMessage(), ctx)).resolves.toBe(
      '模型未配置',
    );
  });

  it('returns the generic fallback when the engine rejects', async () => {
    vi.mocked(runEngine).mockRejectedValue(new Error('provider down'));

    await expect(new HermesChannelHandler('feishu').handle(makeMessage(), ctx)).resolves.toBe(
      '抱歉，处理消息时发生错误，请稍后重试。',
    );
  });

  it('returns a timeout fallback when the engine never settles', async () => {
    vi.useFakeTimers();
    vi.mocked(runEngine).mockReturnValue(new Promise<never>(() => {}) as never);

    const handler = new HermesChannelHandler('feishu');
    const promise = handler.handle(makeMessage(), ctx);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);

    await expect(promise).resolves.toBe('处理超时，请稍后重试。');
  });
});
