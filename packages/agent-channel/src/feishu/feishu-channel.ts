import type { Channel, ChannelResponse, ChannelEventResult } from '../types';
import type { FeishuChannelConfig, FeishuEventV2, FeishuMessageReceiveEvent } from './types';
import { FeishuClient } from './feishu-client';
import {
  isChallengeEvent,
  handleChallenge,
  isEventV2,
  verifyToken,
  parseEventBody,
} from './event-handler';
import { toChannelMessage } from './message-adapter';

/**
 * Feishu Channel implementation
 *
 * Handles Feishu bot event subscription (im.message.receive_v1)
 * and sends replies via Feishu Open API.
 */
export class FeishuChannel implements Channel {
  readonly platform = 'feishu' as const;
  private config: FeishuChannelConfig;
  private client: FeishuClient;

  constructor(config: FeishuChannelConfig) {
    this.config = config;
    this.client = new FeishuClient(config);
  }

  /**
   * Process a Feishu event: verify authenticity and parse in one pass.
   * No double-decryption — event body is parsed once.
   */
  async processEvent(event: unknown, _headers: Record<string, string>): Promise<ChannelEventResult> {
    const parsed = parseEventBody(event, this.config);

    // Handle URL verification challenge (no token check needed for challenge)
    if (isChallengeEvent(parsed)) {
      // Still verify token on challenge if configured
      if (this.config.verificationToken && parsed.token !== this.config.verificationToken) {
        return { type: 'ignored' };
      }
      return { type: 'challenge', response: handleChallenge(parsed) };
    }

    // Verify token for all other events
    if (!verifyToken(parsed, this.config)) {
      return { type: 'ignored' };
    }

    // Handle v2 message events
    if (isEventV2(parsed)) {
      if (parsed.header.event_type === 'im.message.receive_v1') {
        const message = toChannelMessage(parsed as FeishuEventV2<FeishuMessageReceiveEvent>);
        if (!message) return { type: 'ignored' };

        // Attach eventId for deduplication
        message.eventId = parsed.header.event_id;
        return { type: 'message', message };
      }
    }

    return { type: 'ignored' };
  }

  /**
   * Send a response message to the specified chat
   */
  async sendMessage(channelId: string, response: ChannelResponse): Promise<void> {
    // channelId format: "feishu:{chat_id}"
    const chatId = channelId.replace('feishu:', '');

    const replyToId = response.metadata?.replyToMessageId as string | undefined;
    if (replyToId) {
      await this.client.replyMessage(replyToId, response.content);
    } else {
      await this.client.sendMessage(chatId, response.content);
    }
  }

  /** Expose client for advanced usage */
  getClient(): FeishuClient {
    return this.client;
  }
}
