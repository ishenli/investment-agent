/**
 * Agent Channel - Generic channel abstractions for multi-platform agent messaging
 */

// ============== Core Types ==============

/** Supported platform identifiers */
export type Platform = 'feishu' | 'weixin';

/** Extensible platform type for consumer code that may add custom platforms */
export type PlatformLike = Platform | string;

/** Incoming message from any channel */
export interface ChannelMessage {
  id: string;
  eventId?: string;
  channelId: string;
  platform: Platform;
  userId: string;
  content: string;
  rawContent?: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** Response to send back to a channel */
export interface ChannelResponse {
  content: string;
  metadata?: Record<string, unknown>;
}

/** Per-channel conversation session */
export interface ChannelSession {
  channelId: string;
  context?: unknown;
  createdAt: number;
  updatedAt: number;
}

// ============== Channel Event Result ==============

/** Result of parsing a platform event */
export type ChannelEventResult =
  | { type: 'message'; message: ChannelMessage }
  | { type: 'challenge'; response: unknown }
  | { type: 'ignored' };

// ============== Channel Interface ==============

/** Channel adapter interface - implement per platform */
export interface Channel {
  platform: Platform;
  /** Parse and verify a platform-specific event in one pass */
  processEvent(event: unknown, headers: Record<string, string>): Promise<ChannelEventResult>;
  /** Send a response back to the channel */
  sendMessage(channelId: string, response: ChannelResponse): Promise<void>;
}

// ============== Session Store ==============

export interface SessionStore {
  get(channelId: string): Promise<ChannelSession | null>;
  set(channelId: string, session: ChannelSession): Promise<void>;
  delete(channelId: string): Promise<void>;
}

// ============== Agent Handler ==============

/** Function that processes a message and returns a response */
export type AgentHandler = (
  message: ChannelMessage,
  session: ChannelSession,
) => Promise<ChannelResponse>;

// ============== Router Config ==============

export interface MessageRouterConfig {
  channels: Channel[];
  handler: AgentHandler;
  sessionStore: SessionStore;
}
