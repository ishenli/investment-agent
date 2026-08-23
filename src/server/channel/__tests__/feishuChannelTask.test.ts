import type { ChannelMessage } from '@investment-agent/agent-channel';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onMessage: null as ((message: ChannelMessage) => void) | null,
  channelStop: vi.fn(),
  sendMessage: vi.fn(),
  getDefaultUserId: vi.fn(() => Promise.resolve('1')),
  findSession: vi.fn(() => Promise.resolve(null)),
  createSession: vi.fn((_userId: number, input: { slug: string }) =>
    Promise.resolve(`session:${input.slug}`),
  ),
  getMessages: vi.fn(() => Promise.resolve([])),
  createMessage: vi.fn(() => Promise.resolve()),
  deleteMessages: vi.fn(() => Promise.resolve()),
  getConfig: vi.fn(() =>
    Promise.resolve({
      enabled: true,
      appId: 'cli_test',
      appSecret: 'secret',
      domain: 'feishu',
      allowedUserOpenIds: ['ou_allowed'],
      allowedChatIds: [],
    }),
  ),
}));

vi.mock('@investment-agent/agent-channel', () => ({
  FeishuWSChannel: class {
    connectionState = 'connected';
    lastMessageAt = 0;

    async start(handler: (message: ChannelMessage) => void) {
      mocks.onMessage = handler;
    }

    stop = mocks.channelStop;
    sendMessage = mocks.sendMessage;

    isActive() {
      return true;
    }
  },
}));

vi.mock('@server/service/authService', () => ({
  default: { getDefaultUserId: mocks.getDefaultUserId },
}));

vi.mock('@server/repository/chat/session', () => ({
  sessionRepository: { findBySlug: mocks.findSession },
}));

vi.mock('@server/service/chatStorageService', () => ({
  chatStorageService: {
    createSession: mocks.createSession,
    getMessages: mocks.getMessages,
    createMessage: mocks.createMessage,
    deleteMessagesBySessionAndTopic: mocks.deleteMessages,
  },
}));

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../feishuConfig', () => ({
  getFeishuRuntimeConfig: mocks.getConfig,
}));

vi.mock('../hermesChannelHandler', () => ({
  HermesChannelHandler: class {},
}));

import { startFeishuChannel, stopFeishuChannel } from '../feishuChannelTask';

function message(id: string, chatId: string): ChannelMessage {
  return {
    id,
    channelId: `feishu:${chatId}`,
    platform: 'feishu',
    userId: 'ou_allowed',
    content: id,
    timestamp: Date.now(),
  };
}

describe('Feishu channel task ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onMessage = null;
    mocks.getDefaultUserId.mockResolvedValue('1');
  });

  afterEach(async () => {
    await stopFeishuChannel();
  });

  it('serializes one chat while allowing another chat to run', async () => {
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const started: string[] = [];
    const handler = {
      handle: vi.fn(async (incoming: ChannelMessage) => {
        started.push(incoming.id);
        if (incoming.id === 'a1') await firstGate;
        return `reply:${incoming.id}`;
      }),
    };

    await startFeishuChannel(handler);
    expect(mocks.onMessage).not.toBeNull();
    mocks.onMessage!(message('a1', 'chat_a'));
    mocks.onMessage!(message('a2', 'chat_a'));
    mocks.onMessage!(message('b1', 'chat_b'));

    await vi.waitFor(() => expect(started).toEqual(expect.arrayContaining(['a1', 'b1'])));
    expect(started).not.toContain('a2');

    releaseFirst();
    await vi.waitFor(() => expect(started).toContain('a2'));
  });

  it('does not connect without a default application user', async () => {
    mocks.getDefaultUserId.mockResolvedValue('');

    await expect(startFeishuChannel()).rejects.toThrow(
      'Feishu channel requires a default application user',
    );
    expect(mocks.onMessage).toBeNull();
  });
});
