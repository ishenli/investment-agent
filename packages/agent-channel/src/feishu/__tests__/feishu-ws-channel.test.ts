import { describe, expect, it, vi } from 'vitest';
import { FeishuWSChannel, type FeishuWSMessageHandler } from '../feishu-ws-channel';

function event() {
  return {
    event_id: 'event_1',
    sender: {
      sender_id: { open_id: 'ou_allowed' },
      sender_type: 'user',
      tenant_key: 'tenant',
    },
    message: {
      message_id: 'message_1',
      create_time: '1700000000000',
      chat_id: 'p2p_chat',
      chat_type: 'p2p',
      message_type: 'text',
      content: JSON.stringify({ text: 'hello' }),
    },
  };
}

function channel() {
  return new FeishuWSChannel({
    appId: 'cli_test',
    appSecret: 'secret',
    allowedUserOpenIds: ['ou_allowed'],
    allowedChatIds: [],
  });
}

describe('FeishuWSChannel delivery', () => {
  it('hands work off asynchronously and deduplicates message_id', async () => {
    const instance = channel();
    const handler = vi.fn<FeishuWSMessageHandler>();
    const testable = instance as unknown as {
      acceptEvent(data: unknown): void;
      messageHandler: FeishuWSMessageHandler | null;
    };
    testable.messageHandler = handler;

    testable.acceptEvent(event());
    testable.acceptEvent(event());

    expect(handler).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('force-closes the SDK WebSocket on stop', async () => {
    const instance = channel();
    const close = vi.fn();
    (instance as unknown as { wsClient: { close: typeof close } | null }).wsClient = { close };

    await instance.stop();

    expect(close).toHaveBeenCalledWith({ force: true });
  });

  it('summarizes SDK errors without logging request credentials', () => {
    const instance = channel() as unknown as { errorSummary(error: unknown): string };
    const error = Object.assign(new Error('Request failed'), {
      config: { data: { app_secret: 'must-not-be-logged' } },
    });

    expect(instance.errorSummary(error)).toBe('Error: Request failed');
  });
});
