import type {
  Channel,
  MessageRouterConfig,
  AgentHandler,
  SessionStore,
} from './types';

export interface MessageRouterOptions {
  /** TTL for event deduplication cache in ms (default: 5 minutes) */
  eventTtlMs?: number;
  /** If true, handler runs in background and route() returns immediately for messages */
  asyncProcessing?: boolean;
}

/**
 * MessageRouter - Routes incoming platform events to the appropriate channel adapter,
 * manages sessions, deduplicates events, and invokes the agent handler.
 */
export class MessageRouter {
  private channelMap: Map<string, Channel>;
  private handler: AgentHandler;
  private sessionStore: SessionStore;
  private processedEvents = new Map<string, number>();
  private channelLocks = new Map<string, Promise<void>>();
  private asyncProcessing: boolean;

  /** TTL for processed event IDs (default: 5 minutes) */
  private eventTtlMs: number;

  constructor(config: MessageRouterConfig, options?: MessageRouterOptions) {
    this.channelMap = new Map(config.channels.map((ch) => [ch.platform, ch]));
    this.handler = config.handler;
    this.sessionStore = config.sessionStore;
    this.eventTtlMs = options?.eventTtlMs ?? 5 * 60 * 1000;
    this.asyncProcessing = options?.asyncProcessing ?? false;
  }

  /**
   * Route an incoming event from a specific platform.
   */
  async route(
    platform: string,
    event: unknown,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; body: unknown }> {
    const channel = this.channelMap.get(platform);
    if (!channel) {
      return { status: 400, body: { error: `Unknown platform: ${platform}` } };
    }

    // Process event (verify + parse in one pass)
    const result = await channel.processEvent(event, headers);

    if (result.type === 'challenge') {
      return { status: 200, body: result.response };
    }

    if (result.type === 'ignored') {
      return { status: 200, body: { ok: true } };
    }

    const { message } = result;

    // Deduplicate by eventId
    if (message.eventId && this.isProcessed(message.eventId)) {
      return { status: 200, body: { ok: true, deduplicated: true } };
    }

    if (message.eventId) {
      this.markProcessed(message.eventId);
    }

    // Process message (sync or async based on config)
    const processMessage = () =>
      this.withChannelLock(message.channelId, async () => {
        let session = await this.sessionStore.get(message.channelId);
        if (!session) {
          session = {
            channelId: message.channelId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }

        const response = await this.handler(message, session);

        session.updatedAt = Date.now();
        await this.sessionStore.set(message.channelId, session);

        try {
          await channel.sendMessage(message.channelId, response);
        } catch (error) {
          console.error(`[MessageRouter] Failed to send response to ${message.channelId}:`, error);
        }
      });

    if (this.asyncProcessing) {
      // Fire-and-forget: return 200 immediately, process in background
      processMessage().catch((error) => {
        console.error(`[MessageRouter] Async processing failed for ${message.channelId}:`, error);
      });
    } else {
      await processMessage();
    }

    return { status: 200, body: { ok: true } };
  }

  // ============== Event Deduplication ==============

  private isProcessed(eventId: string): boolean {
    const ts = this.processedEvents.get(eventId);
    if (!ts) return false;
    if (Date.now() - ts > this.eventTtlMs) {
      this.processedEvents.delete(eventId);
      return false;
    }
    return true;
  }

  private markProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now());
    // Periodic cleanup: remove expired entries when map grows
    if (this.processedEvents.size > 1000) {
      const now = Date.now();
      for (const [id, ts] of this.processedEvents) {
        if (now - ts > this.eventTtlMs) this.processedEvents.delete(id);
      }
    }
  }

  // ============== Per-Channel Lock ==============

  private async withChannelLock(channelId: string, fn: () => Promise<void>): Promise<void> {
    const pending = this.channelLocks.get(channelId);
    if (pending) {
      await pending;
      return this.withChannelLock(channelId, fn);
    }

    let release!: () => void;
    const lock = new Promise<void>((resolve) => { release = resolve; });
    this.channelLocks.set(channelId, lock);

    try {
      await fn();
    } finally {
      this.channelLocks.delete(channelId);
      release();
    }
  }
}
