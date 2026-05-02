/**
 * Weixin Channel — long-poll driven adapter for WeChat personal accounts
 *
 * Architecture:
 * - `connect()` starts a background long-poll loop (getupdates)
 * - Inbound messages are dispatched to the registered handler
 * - `sendMessage()` sends text replies via iLink sendmessage API
 * - Context tokens are tracked per-peer for session continuity
 *
 * Design notes (mirroring Python gateway/platforms/weixin.py):
 * - Long-poll getupdates drives inbound delivery
 * - Every outbound reply echoes the latest context_token for the peer
 * - Message deduplication via a TTL-based seen-ID set
 */

import crypto from 'node:crypto';
import type { Channel, ChannelEventResult, ChannelMessage, ChannelResponse } from '../types';
import type { WeixinChannelConfig, ILinkInboundMessage } from './types';
import { WeixinClient, LONG_POLL_TIMEOUT_MS, SESSION_EXPIRED_ERRCODE } from './weixin-client';
import { toChannelMessage } from './message-adapter';

// Lightweight logger shim — uses the app logger when available, falls back to console
const log = {
  info: (...args: unknown[]) => console.info('[WeixinChannel]', ...args),
  warn: (...args: unknown[]) => console.warn('[WeixinChannel]', ...args),
  error: (...args: unknown[]) => console.error('[WeixinChannel]', ...args),
  debug: (...args: unknown[]) => console.debug('[WeixinChannel]', ...args),
};

// Safely coerce any value to a trimmed string (mirrors Python's str(x or "").strip())
function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export type WeixinMessageHandler = (message: ChannelMessage) => Promise<void>;

const MAX_CONSECUTIVE_FAILURES = 3;
const RETRY_DELAY_MS = 2_000;
const BACKOFF_DELAY_MS = 30_000;
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEND_CHUNK_RETRIES = 2;

/**
 * Simple TTL-based deduplication set for message IDs
 */
class MessageDeduplicator {
  private seen = new Map<string, number>();
  private ttlMs: number;

  constructor(ttlMs = DEDUP_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  isDuplicate(id: string): boolean {
    this.evict();
    if (this.seen.has(id)) return true;
    this.seen.set(id, Date.now());
    return false;
  }

  private evict() {
    const now = Date.now();
    for (const [id, ts] of this.seen) {
      if (now - ts > this.ttlMs) this.seen.delete(id);
    }
  }
}

/**
 * Weixin Channel — implements Channel for webhook-less long-poll mode.
 *
 * Unlike webhook-based channels, this channel must be explicitly started
 * via `connect()` to begin receiving messages.
 *
 * Note: `processEvent()` is not used in long-poll mode; use `connect()` instead.
 */
export class WeixinChannel implements Channel {
  readonly platform = 'weixin' as const;

  private config: WeixinChannelConfig;
  private client: WeixinClient;
  private handler: WeixinMessageHandler | null = null;

  // Long-poll state
  private running = false;
  private pollTask: Promise<void> | null = null;
  private stopSignal: (() => void) | null = null;

  // Context token store: peer userId → context_token
  private contextTokens = new Map<string, string>();

  // Sync buffer (persisted across reconnects via caller if needed)
  private syncBuf = '';

  // Message deduplication
  private dedup = new MessageDeduplicator();

  // Send chunk delay
  private sendChunkDelayMs: number;

  constructor(config: WeixinChannelConfig) {
    this.config = config;
    this.client = new WeixinClient(config);
    this.sendChunkDelayMs = (config.sendChunkDelaySeconds ?? 0.35) * 1000;
  }

  /**
   * Register a handler for inbound messages.
   * Must be called before `connect()`.
   */
  onMessage(handler: WeixinMessageHandler): void {
    this.handler = handler;
  }

  /**
   * Start the long-poll loop and begin receiving messages.
   */
  connect(initialSyncBuf = ''): void {
    if (this.running) {
      log.warn('connect() called while already running, ignoring');
      return;
    }
    this.syncBuf = initialSyncBuf;
    this.running = true;
    log.info(`Starting long-poll loop (accountId=${this.config.accountId})`);

    let resolveStop: () => void;
    const stopPromise = new Promise<void>((resolve) => {
      resolveStop = resolve;
    });
    this.stopSignal = () => resolveStop();

    this.pollTask = this.pollLoop(stopPromise);
  }

  /**
   * Stop the long-poll loop gracefully.
   * Returns the final syncBuf for persistence if desired.
   */
  async disconnect(): Promise<string> {
    log.info('Disconnecting long-poll loop...');
    this.running = false;
    this.stopSignal?.();
    await this.pollTask;
    this.pollTask = null;
    log.info('Long-poll loop stopped');
    return this.syncBuf;
  }

  // ============== Channel interface ==============

  /**
   * processEvent is not used in long-poll mode.
   * This channel receives messages via the background poll loop.
   * Calling this method always returns `ignored`.
   */
  async processEvent(_event: unknown, _headers: Record<string, string>): Promise<ChannelEventResult> {
    return { type: 'ignored' };
  }

  /**
   * Send a text reply to the given channelId.
   * channelId format: "weixin:{userId or roomId}"
   */
  async sendMessage(channelId: string, response: ChannelResponse): Promise<void> {
    const peerId = channelId.replace(/^weixin:/, '');
    const contextToken = this.contextTokens.get(peerId) ?? null;
    const chunks = splitText(response.content, 4000);

    for (let i = 0; i < chunks.length; i++) {
      await this.sendChunkWithRetry(peerId, chunks[i], contextToken);
      if (i < chunks.length - 1 && this.sendChunkDelayMs > 0) {
        await sleep(this.sendChunkDelayMs);
      }
    }
  }

  // ============== Internal poll loop ==============

  private async pollLoop(stopPromise: Promise<void>): Promise<void> {
    let consecutiveFailures = 0;
    let timeoutMs = LONG_POLL_TIMEOUT_MS;

    while (this.running) {
      try {
        const resp = await Promise.race([
          this.client.getUpdates(this.syncBuf, timeoutMs),
          stopPromise.then(() => null),
        ]);

        if (!this.running || resp === null) break;

        // Adapt server-suggested timeout
        if (typeof resp.longpolling_timeout_ms === 'number' && resp.longpolling_timeout_ms > 0) {
          timeoutMs = resp.longpolling_timeout_ms;
        }

        const ret = resp.ret ?? 0;
        const errcode = resp.errcode ?? 0;

        if (ret !== 0 || errcode !== 0) {
          if (ret === SESSION_EXPIRED_ERRCODE || errcode === SESSION_EXPIRED_ERRCODE) {
            log.warn('Session expired (ret/errcode); pausing 10 minutes before retrying');
            await sleep(10 * 60 * 1000);
            consecutiveFailures = 0;
            continue;
          }
          consecutiveFailures++;
          log.warn(
            `getUpdates failed ret=${ret} errcode=${errcode} errmsg=${resp.errmsg ?? ''} (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`,
          );
          await sleep(consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? BACKOFF_DELAY_MS : RETRY_DELAY_MS);
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) consecutiveFailures = 0;
          continue;
        }

        consecutiveFailures = 0;
        const newBuf = resp.get_updates_buf ?? '';
        if (newBuf) this.syncBuf = newBuf;

        const msgs = resp.msgs ?? [];
        if (msgs.length > 0) {
          log.info(`getUpdates: received ${msgs.length} message(s)`);
        }
        for (const msg of msgs) {
          this.processMessageSafe(msg);
        }
      } catch (err) {
        consecutiveFailures++;
        log.error(
          `Poll error (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`,
          err instanceof Error ? err.message : String(err),
        );
        await sleep(consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? BACKOFF_DELAY_MS : RETRY_DELAY_MS);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) consecutiveFailures = 0;
      }
    }
    log.info('Poll loop exited cleanly');
  }

  private processMessageSafe(raw: ILinkInboundMessage): void {
    // Fire-and-forget with error boundary
    this.processMessage(raw).catch((err) => {
      log.error('Unhandled inbound message error:', err instanceof Error ? err.message : String(err));
    });
  }

  private async processMessage(raw: ILinkInboundMessage): Promise<void> {
    const senderId = toStr(raw.from_user_id);
    if (!senderId || senderId === this.config.accountId) return;

    const messageId = toStr(raw.message_id);
    if (messageId && this.dedup.isDuplicate(messageId)) {
      log.debug(`Skipping duplicate message_id=${messageId} from sender=${senderId}`);
      return;
    }

    // Access control
    if (!this.isDmAllowed(senderId)) {
      log.warn(`Message from sender=${senderId} rejected by DM policy`);
      return;
    }

    // Track context token for this peer
    const contextToken = toStr(raw.context_token);
    if (contextToken) {
      this.contextTokens.set(senderId, contextToken);
    }

    const channelMessage = toChannelMessage(raw, this.config.accountId);
    if (!channelMessage) {
      log.warn(`toChannelMessage returned null for message_id=${messageId}, skipping`);
      return;
    }

    log.info(
      `Inbound message — from=${senderId} msgType=${raw.msg_type ?? 'unknown'} msgId=${messageId} channelId=${channelMessage.channelId}`,
    );

    if (this.handler) {
      await this.handler(channelMessage);
    } else {
      log.warn('No message handler registered, message dropped');
    }
  }

  private isDmAllowed(senderId: string): boolean {
    const policy = this.config.dmPolicy ?? 'open';
    if (policy === 'disabled') return false;
    if (policy === 'allowlist') {
      return (this.config.allowFrom ?? []).includes(senderId);
    }
    return true;
  }

  // ============== Send helpers ==============

  private async sendChunkWithRetry(
    peerId: string,
    text: string,
    contextToken: string | null,
  ): Promise<void> {
    let currentToken = contextToken;
    let retriedWithoutToken = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= SEND_CHUNK_RETRIES; attempt++) {
      try {
        const clientId = `weixin-${crypto.randomUUID().replace(/-/g, '')}`;
        const resp = await this.client.sendTextMessage(peerId, text, currentToken, clientId);

        const ret = resp.ret ?? 0;
        const errcode = resp.errcode ?? 0;

        if (ret !== 0 || errcode !== 0) {
          const isExpired =
            ret === SESSION_EXPIRED_ERRCODE || errcode === SESSION_EXPIRED_ERRCODE;

          if (isExpired && !retriedWithoutToken && currentToken) {
            retriedWithoutToken = true;
            currentToken = null;
            this.contextTokens.delete(peerId);
            log.warn(`Session token expired for peer=${peerId}; retrying without context_token`);
            continue;
          }
          const msg = resp.errmsg ?? resp.msg ?? 'unknown error';
          throw new Error(`iLink sendmessage error: ret=${ret} errcode=${errcode} errmsg=${msg}`);
        }
        log.debug(`Message chunk sent to peer=${peerId} (attempt ${attempt + 1})`);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt >= SEND_CHUNK_RETRIES) break;
        await sleep(1000 * (attempt + 1));
      }
    }
    if (lastError) throw lastError;
  }

  // ============== Accessors ==============

  getClient(): WeixinClient {
    return this.client;
  }

  /** Current sync buffer — persist this across restarts to avoid replaying old messages */
  getSyncBuf(): string {
    return this.syncBuf;
  }
}

// ============== Utilities ==============

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Split text into chunks of at most maxLength characters.
 * Prefers splitting at newlines when possible.
 */
function splitText(text: string, maxLength: number): string[] {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split at a newline boundary
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt <= 0) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}
