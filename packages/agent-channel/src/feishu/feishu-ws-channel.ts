import * as Lark from '@larksuiteoapi/node-sdk';
import type { Channel, ChannelEventResult, ChannelMessage, ChannelResponse } from '../types';
import { toWSChannelMessage } from './message-adapter';
import { buildFeishuMessagePayload } from './feishu-markdown';
import type { FeishuChannelConfig } from './types';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface FeishuWSChannelConfig extends FeishuChannelConfig {
  allowedUserOpenIds: string[];
  allowedChatIds: string[];
  dedupeTtlMs?: number;
  logger?: (level: string, message: string, ...args: unknown[]) => void;
}

export type ConnectionStateHandler = (
  state: ConnectionState,
  previousState: ConnectionState,
  error?: Error,
) => void;

export type FeishuWSMessageHandler = (
  message: ChannelMessage,
) => void | ChannelResponse | Promise<void | ChannelResponse>;

interface BotInfoResponse {
  bot?: { open_id?: string };
  data?: { bot?: { open_id?: string } };
}

const silentSdkLogger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
};

/**
 * Thin Feishu WebSocket adapter. The official SDK owns ping and reconnect;
 * this class owns bounded parsing, policy, deduplication, and delivery only.
 */
export class FeishuWSChannel implements Channel {
  readonly platform = 'feishu' as const;

  private readonly config: FeishuWSChannelConfig;
  private readonly larkClient: Lark.Client;
  private readonly stateHandlers = new Set<ConnectionStateHandler>();
  private readonly processedMessages = new Map<string, number>();
  private readonly dedupeTtlMs: number;
  private wsClient: Lark.WSClient | null = null;
  private messageHandler: FeishuWSMessageHandler | null = null;
  private startPromise: Promise<void> | null = null;
  private botOpenId = '';
  private lastMessageTime = 0;
  private _connectionState = ConnectionState.DISCONNECTED;

  constructor(config: FeishuWSChannelConfig) {
    this.config = config;
    this.dedupeTtlMs = config.dedupeTtlMs ?? 10 * 60 * 1000;
    this.larkClient = new Lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      domain: config.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
      disableTokenCache: false,
      // @CfSecAICode 遵循消费金融安全编码 BE-SECRET-001 规范: 禁止 SDK 展开包含 App Secret 的请求配置。
      logger: silentSdkLogger,
      loggerLevel: Lark.LoggerLevel.fatal,
    });
  }

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  get lastMessageAt(): number {
    return this.lastMessageTime;
  }

  isActive(): boolean {
    return this._connectionState === ConnectionState.CONNECTED;
  }

  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  async start(onMessage: FeishuWSMessageHandler): Promise<void> {
    if (this.isActive()) return;
    if (this.startPromise) return this.startPromise;

    this.messageHandler = onMessage;
    this.setConnectionState(ConnectionState.CONNECTING);
    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  private async startInternal(): Promise<void> {
    try {
      this.botOpenId = await this.resolveBotOpenId();

      const dispatcher = new Lark.EventDispatcher({
        encryptKey: '',
        verificationToken: '',
      }).register<Record<string, (data: unknown) => void>>({
        'im.message.receive_v1': (data: unknown) => this.acceptEvent(data),
      });

      this.wsClient = new Lark.WSClient({
        appId: this.config.appId,
        appSecret: this.config.appSecret,
        domain: this.config.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
        logger: silentSdkLogger,
        loggerLevel: Lark.LoggerLevel.fatal,
        onReady: () => {
          this.setConnectionState(ConnectionState.CONNECTED);
          this.log('info', 'WebSocket connected');
        },
        onError: (error) => this.setConnectionState(ConnectionState.ERROR, error),
        onReconnecting: () => this.setConnectionState(ConnectionState.CONNECTING),
        onReconnected: () => this.setConnectionState(ConnectionState.CONNECTED),
      });
      await this.wsClient.start({ eventDispatcher: dispatcher });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.forceClose();
      this.setConnectionState(ConnectionState.ERROR, err);
      throw err;
    }
  }

  /** SDK callback: bounded synchronous work followed by a microtask handoff. */
  private acceptEvent(data: unknown): void {
    const message = toWSChannelMessage(data, {
      allowedUserOpenIds: this.config.allowedUserOpenIds,
      allowedChatIds: this.config.allowedChatIds,
      botOpenId: this.botOpenId,
    });
    if (!message || this.isDuplicate(message.id)) return;

    this.lastMessageTime = Date.now();
    const handler = this.messageHandler;
    if (!handler) return;

    queueMicrotask(() => {
      Promise.resolve(handler(message))
        .then((response) => {
          if (response?.content) {
            return this.replyMessage(message.id, response);
          }
        })
        .catch((error) => this.log('error', 'Message handler failed', this.errorSummary(error)));
    });
  }

  private isDuplicate(messageId: string): boolean {
    const now = Date.now();
    const seenAt = this.processedMessages.get(messageId);
    if (seenAt && now - seenAt <= this.dedupeTtlMs) return true;

    this.processedMessages.set(messageId, now);
    if (this.processedMessages.size > 1000) {
      for (const [id, timestamp] of this.processedMessages) {
        if (now - timestamp > this.dedupeTtlMs) this.processedMessages.delete(id);
      }
    }
    return false;
  }

  private async resolveBotOpenId(): Promise<string> {
    try {
      const response = await this.larkClient.request<BotInfoResponse>({
        method: 'GET',
        url: '/open-apis/bot/v3/info',
      });
      return response?.bot?.open_id ?? response?.data?.bot?.open_id ?? '';
    } catch (error) {
      this.log(
        'warn',
        'Bot identity unavailable; group messages will be ignored',
        this.errorSummary(error),
      );
      return '';
    }
  }

  async stop(): Promise<void> {
    this.forceClose();
    this.messageHandler = null;
    this.botOpenId = '';
    this.processedMessages.clear();
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  private forceClose(): void {
    if (!this.wsClient) return;
    try {
      (this.wsClient as unknown as { close: (options?: { force?: boolean }) => void }).close({
        force: true,
      });
    } catch (error) {
      this.log('warn', 'WebSocket close failed', this.errorSummary(error));
    }
    this.wsClient = null;
  }

  async processEvent(): Promise<ChannelEventResult> {
    return { type: 'ignored' };
  }

  async sendMessage(channelId: string, response: ChannelResponse): Promise<void> {
    const replyToMessageId = response.metadata?.replyToMessageId;
    if (typeof replyToMessageId === 'string' && replyToMessageId) {
      await this.replyMessage(replyToMessageId, response);
      return;
    }

    await this.larkClient.im.v1.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: channelId.replace(/^feishu:/, ''),
        ...buildFeishuMessagePayload(response.content),
      },
    });
  }

  async replyMessage(messageId: string, response: ChannelResponse): Promise<void> {
    await this.larkClient.im.v1.message.reply({
      path: { message_id: messageId },
      data: buildFeishuMessagePayload(response.content),
    });
  }

  getLarkClient(): Lark.Client {
    return this.larkClient;
  }

  getStats() {
    return {
      connectionState: this._connectionState,
      lastMessageAt: this.lastMessageTime,
      isActive: this.isActive(),
    };
  }

  private setConnectionState(state: ConnectionState, error?: Error): void {
    const previous = this._connectionState;
    if (previous === state) return;
    this._connectionState = state;
    for (const handler of this.stateHandlers) handler(state, previous, error);
  }

  private log(level: string, message: string, ...args: unknown[]): void {
    if (this.config.logger) {
      this.config.logger(level, message, ...args);
      return;
    }
    const method =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    method(`[FeishuWSChannel] ${message}`, ...args);
  }

  private errorSummary(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
  }
}
