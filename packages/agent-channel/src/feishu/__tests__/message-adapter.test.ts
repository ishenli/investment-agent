import { describe, expect, it } from 'vitest';
import { toWSChannelMessage, type FeishuInboundPolicy } from '../message-adapter';

const policy: FeishuInboundPolicy = {
  allowedUserOpenIds: ['ou_allowed'],
  allowedChatIds: ['oc_allowed'],
  botOpenId: 'ou_bot',
};

function event(overrides?: {
  chatType?: 'p2p' | 'group';
  chatId?: string;
  userId?: string;
  messageType?: string;
  content?: string;
  mentions?: Array<{ key: string; id: { open_id?: string }; name: string }>;
}) {
  return {
    event_id: 'event_1',
    sender: {
      sender_id: { open_id: overrides?.userId ?? 'ou_allowed' },
      sender_type: 'user',
      tenant_key: 'tenant',
    },
    message: {
      message_id: 'message_1',
      create_time: '1700000000000',
      chat_id: overrides?.chatId ?? 'p2p_chat',
      chat_type: overrides?.chatType ?? 'p2p',
      message_type: overrides?.messageType ?? 'text',
      content: overrides?.content ?? JSON.stringify({ text: 'hello' }),
      mentions: overrides?.mentions,
    },
  };
}

describe('toWSChannelMessage', () => {
  it('accepts an allowlisted private user', () => {
    const message = toWSChannelMessage(event(), policy);

    expect(message).toMatchObject({
      id: 'message_1',
      eventId: 'event_1',
      channelId: 'feishu:p2p_chat',
      userId: 'ou_allowed',
      content: 'hello',
    });
  });

  it('rejects a private user not identified by allowlisted open_id', () => {
    expect(toWSChannelMessage(event({ userId: 'ou_denied' }), policy)).toBeNull();
  });

  it('accepts only allowlisted groups that mention the current bot', () => {
    const accepted = toWSChannelMessage(
      event({
        chatType: 'group',
        chatId: 'oc_allowed',
        content: JSON.stringify({ text: '@_user_1 check this' }),
        mentions: [{ key: '@_user_1', id: { open_id: 'ou_bot' }, name: 'Bot' }],
      }),
      policy,
    );

    expect(accepted?.content).toBe('check this');
    expect(
      toWSChannelMessage(event({ chatType: 'group', chatId: 'oc_denied' }), policy),
    ).toBeNull();
    expect(
      toWSChannelMessage(event({ chatType: 'group', chatId: 'oc_allowed' }), policy),
    ).toBeNull();
  });

  it('fails closed for groups when bot identity is unavailable', () => {
    expect(
      toWSChannelMessage(
        event({
          chatType: 'group',
          chatId: 'oc_allowed',
          mentions: [{ key: '@bot', id: { open_id: 'ou_bot' }, name: 'Bot' }],
        }),
        { ...policy, botOpenId: '' },
      ),
    ).toBeNull();
  });

  it('ignores unsupported and malformed content', () => {
    expect(toWSChannelMessage(event({ messageType: 'image' }), policy)).toBeNull();
    expect(toWSChannelMessage(event({ content: '{' }), policy)).toBeNull();
    expect(
      toWSChannelMessage(event({ content: JSON.stringify({ text: ' ' }) }), policy),
    ).toBeNull();
  });
});
