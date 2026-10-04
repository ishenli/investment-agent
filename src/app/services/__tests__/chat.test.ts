import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/agentStreamClient', () => {
  const connectAgentStream = vi.fn(async ({ onEvent, onDone }: any) => {
    // 模拟服务端在流结尾前发出 related 事件并正常收尾
    onEvent({ type: 'related', items: ['追问1', '追问2'] });
    onDone();
  });
  return { connectAgentStream, __connectAgentStream: connectAgentStream };
});

import { chatService } from '../chat';

function makeControllers() {
  return {
    pushToQueue: vi.fn(),
    startAnimation: vi.fn(),
  };
}

describe('chatService.bailingLLMStream - related 在收尾不被清空', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('流中收到 related 后，onFinish 应透传该数组而非空数组', async () => {
    const onFinish = vi.fn();

    await chatService.bailingLLMStream({
      params: {
        sessionId: 'sess',
        agentId: '',
        model: 'gpt-4o',
        provider: 'openai',
        messages: [],
        stream: true,
        tools: [],
      },
      abortController: new AbortController(),
      onMessageHandle: vi.fn(),
      onFinish,
      textController: makeControllers(),
      thinkingController: makeControllers(),
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [, context] = onFinish.mock.calls[0];
    expect(context.related).toEqual(['追问1', '追问2']);
  });

  it('流中没有 related 时 onFinish 仍收到空数组，不报错', async () => {
    const connectAgentStream = await import('@/app/lib/agentStreamClient').then(
      (m) => m.__connectAgentStream,
    );
    connectAgentStream.mockImplementation(async ({ onDone }: any) => {
      onDone();
    });
    const onFinish = vi.fn();

    await chatService.bailingLLMStream({
      params: {
        sessionId: 'sess',
        agentId: '',
        model: 'gpt-4o',
        provider: 'openai',
        messages: [],
        stream: true,
        tools: [],
      },
      abortController: new AbortController(),
      onMessageHandle: vi.fn(),
      onFinish,
      textController: makeControllers(),
      thinkingController: makeControllers(),
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [, context] = onFinish.mock.calls[0];
    expect(context.related).toEqual([]);
  });
});