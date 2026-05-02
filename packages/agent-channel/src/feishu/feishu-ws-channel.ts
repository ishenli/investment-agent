import * as Lark from '@larksuiteoapi/node-sdk';
import type { Channel, ChannelResponse, ChannelEventResult } from '../types';
import type { FeishuChannelConfig, FeishuMessageReceiveEvent } from './types';

/**
 * Connection state enum
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Feishu WebSocket Channel configuration
 */
export interface FeishuWSChannelConfig extends FeishuChannelConfig {
  /** Enable debug logging */
  loggerLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Custom log handler */
  logger?: (level: string, message: string, ...args: unknown[]) => void;
  /** Reconnect options */
  reconnect?: {
    /** Enable auto reconnect (default: true) */
    enabled?: boolean;
    /** Max reconnect attempts (default: 5, 0 = unlimited) */
    maxAttempts?: number;
    /** Reconnect delay in ms (default: 3000) */
    delayMs?: number;
  };
  /** Health check options */
  healthCheck?: {
    /** Enable health check (default: true) */
    enabled?: boolean;
    /** Health check interval in ms (default: 30000) */
    intervalMs?: number;
  };
}

/**
 * Connection state change callback
 */
export type ConnectionStateHandler = (
  state: ConnectionState,
  previousState: ConnectionState,
  error?: Error,
) => void;

/**
 * Message handler callback type
 */
export type FeishuWSMessageHandler = (message: {
  id: string;
  eventId: string;
  channelId: string;
  platform: 'feishu';
  userId: string;
  content: string;
  rawContent: FeishuMessageReceiveEvent;
  timestamp: number;
  metadata?: Record<string, unknown>;
}) => Promise<ChannelResponse>;

/**
 * Internal event data structure from Feishu SDK
 * The SDK passes a normalized event object
 */
interface FeishuSDKEventData {
  event_id?: string;
  token?: string;
  create_time?: string;
  event_type?: string;
  tenant_key?: string;
  ts?: string;
  sender?: {
    sender_id?: {
      union_id?: string;
      user_id?: string;
      open_id?: string;
    };
    sender_type?: string;
    tenant_key?: string;
  };
  message?: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    create_time: string;
    update_time?: string;
    chat_id: string;
    chat_type: 'p2p' | 'group';
    message_type: string;
    content: string;
    mentions?: Array<{
      key: string;
      id: { union_id?: string; user_id?: string; open_id?: string };
      name: string;
      tenant_key?: string;
    }>;
  };
}

/**
 * Feishu WebSocket Channel implementation
 *
 * Uses @larksuiteoapi/node-sdk WebSocket client for real-time message receiving.
 * This provides a persistent connection instead of HTTP webhook.
 */
export class FeishuWSChannel implements Channel {
  readonly platform = 'feishu' as const;
  private config: FeishuWSChannelConfig;
  private wsClient: Lark.WSClient | null = null;
  private larkClient: Lark.Client;
  private messageHandler: FeishuWSMessageHandler | null = null;

  // Connection state management
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionStateHandlers: Set<ConnectionStateHandler> = new Set();
  private reconnectAttempts = 0;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime = 0;
  private startPromise: Promise<void> | null = null;
  private startResolve: (() => void) | null = null;
  private startReject: ((error: Error) => void) | null = null;

  /**
   * Get properties from config with defaults
   */
  private get reconnectEnabled() {
    return this.config.reconnect?.enabled ?? true;
  }

  private get maxReconnectAttempts() {
    return this.config.reconnect?.maxAttempts ?? 5;
  }

  private get reconnectDelayMs() {
    return this.config.reconnect?.delayMs ?? 3000;
  }

  private get healthCheckEnabled() {
    return this.config.healthCheck?.enabled ?? true;
  }

  private get healthCheckIntervalMs() {
    return this.config.healthCheck?.intervalMs ?? 30000;
  }

  constructor(config: FeishuWSChannelConfig) {
    this.config = config;
    this.larkClient = new Lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
    });
  }

  /**
   * Get current connection state
   */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Check if WebSocket is connected and active
   */
  isActive(): boolean {
    return this._connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Get last message received timestamp
   */
  get lastMessageAt(): number {
    return this.lastMessageTime;
  }

  /**
   * Subscribe to connection state changes
   * @returns Unsubscribe function
   */
  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.connectionStateHandlers.add(handler);
    return () => this.connectionStateHandlers.delete(handler);
  }

  /**
   * Set connection state and notify handlers
   */
  private setConnectionState(state: ConnectionState, error?: Error): void {
    const previousState = this._connectionState;
    if (previousState === state) return;

    this._connectionState = state;
    this.log('info', `[FeishuWSChannel] Connection state: ${previousState} -> ${state}`);

    for (const handler of this.connectionStateHandlers) {
      try {
        handler(state, previousState, error);
      } catch (err) {
        this.log('error', '[FeishuWSChannel] State handler error:', err);
      }
    }
  }

  /**
   * Log message using custom logger or console
   */
  private log(level: string, message: string, ...args: unknown[]): void {
    if (this.config.logger) {
      this.config.logger(level, message, ...args);
    } else {
      const prefix = '[FeishuWSChannel]';
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'debug':
          if (this.config.loggerLevel === 'debug') {
            console.debug(prefix, message, ...args);
          }
          break;
        default:
          console.log(prefix, message, ...args);
      }
    }
  }

  /**
   * Start WebSocket connection and register event handlers
   * @param onMessage Callback function to handle incoming messages
   */
  async start(onMessage: FeishuWSMessageHandler): Promise<void> {
    if (this.isActive()) {
      this.log('warn', 'Already connected, skipping start()');
      return;
    }

    if (this._connectionState === ConnectionState.CONNECTING) {
      this.log('warn', 'Connection in progress, waiting...');
      return this.startPromise!;
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    this.messageHandler = onMessage;
    this.reconnectAttempts = 0;

    // Create a promise that resolves when connected
    this.startPromise = new Promise<void>((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;
    });

    await this.connect();

    return this.startPromise;
  }

  /**
   * Internal connect method
   */
  private async connect(): Promise<void> {
    try {
      this.wsClient = new Lark.WSClient({
        appId: this.config.appId,
        appSecret: this.config.appSecret,
        loggerLevel: this.config.loggerLevel === 'debug' ? Lark.LoggerLevel.debug : Lark.LoggerLevel.info,
      });

      await this.wsClient.start({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventDispatcher: new Lark.EventDispatcher({}).register({
          // Handle incoming message event
          'im.message.receive_v1': async (data: FeishuSDKEventData) => {
            await this.handleMessage(data);
          },
        } as any),
      });

      // Connection successful
      this.setConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;

      // Start health check
      if (this.healthCheckEnabled) {
        this.startHealthCheck();
      }

      // Resolve the start promise
      if (this.startResolve) {
        this.startResolve();
        this.startResolve = null;
        this.startReject = null;
      }

      this.log('info', 'WebSocket connected successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Failed to connect:', err.message);

      // Attempt reconnection if enabled
      if (this.reconnectEnabled && (this.maxReconnectAttempts === 0 || this.reconnectAttempts < this.maxReconnectAttempts)) {
        await this.handleReconnect();
      } else {
        this.setConnectionState(ConnectionState.ERROR, err);
        if (this.startReject) {
          this.startReject(err);
          this.startResolve = null;
          this.startReject = null;
        }
      }
    }
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    this.log(
      'warn',
      `Connection lost. Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts || '∞'})...`,
    );

    // Wait before reconnecting
    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelayMs));

    // Clean up existing client
    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch {
        // Ignore close errors
      }
      this.wsClient = null;
    }

    // Attempt to reconnect
    await this.connect();
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.stopHealthCheck();

    this.lastMessageTime = Date.now();
    this.healthCheckInterval = setInterval(() => {
      // If no message received for too long, consider connection stale
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      const staleThreshold = this.healthCheckIntervalMs * 3;

      if (timeSinceLastMessage > staleThreshold && this.isActive()) {
        this.log('warn', 'Connection appears stale, triggering reconnect');
        this.handleReconnect().catch((err) => {
          this.log('error', 'Reconnect failed:', err);
        });
      }
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop health check interval
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Stop WebSocket connection
   */
  async stop(): Promise<void> {
    this.stopHealthCheck();

    if (this.wsClient) {
      try {
        this.wsClient.close();
        this.log('info', 'WebSocket connection closed');
      } catch (error) {
        this.log('error', 'Error closing WebSocket:', error);
      }
      this.wsClient = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.messageHandler = null;
    this.startPromise = null;
    this.startResolve = null;
    this.startReject = null;
  }

  /**
   * Force reconnect (useful for manual recovery)
   */
  async reconnect(): Promise<void> {
    if (!this.messageHandler) {
      throw new Error('Cannot reconnect: no message handler registered. Call start() first.');
    }

    this.log('info', 'Manual reconnect initiated');
    await this.stop();
    this.reconnectAttempts = 0;
    await this.start(this.messageHandler);
  }

  /**
   * Handle incoming message from WebSocket
   */
  private async handleMessage(data: FeishuSDKEventData): Promise<void> {
    // Update last message time for health check
    this.lastMessageTime = Date.now();

    if (!this.messageHandler) {
      this.log('warn', 'No message handler registered');
      return;
    }

    if (!data.message || !data.sender) {
      this.log('warn', 'Invalid message format:', data);
      return;
    }

    try {
      const { sender, message } = data;

      // Parse message content
      let contentText = '';
      try {
        const parsedContent = JSON.parse(message.content);
        contentText = parsedContent.text || message.content;
      } catch {
        contentText = message.content;
      }

      // Build channel message
      const channelMessage = {
        id: message.message_id,
        eventId: data.event_id || message.message_id,
        channelId: `feishu:${message.chat_id}`,
        platform: 'feishu' as const,
        userId: sender.sender_id?.open_id || sender.sender_id?.user_id || '',
        content: contentText,
        rawContent: data as unknown as FeishuMessageReceiveEvent,
        timestamp: parseInt(message.create_time) || Date.now(),
        metadata: {
          chatType: message.chat_type,
          messageType: message.message_type,
          parentId: message.parent_id,
          rootId: message.root_id,
          mentions: message.mentions,
        },
      };

      this.log('debug', 'Received message:', channelMessage.id);

      // Call the message handler
      const response = await this.messageHandler(channelMessage);

      // Send response if content provided
      if (response.content) {
        await this.sendMessage(channelMessage.channelId, response);
      }
    } catch (error) {
      this.log('error', 'Error handling message:', error);
    }
  }

  /**
   * Process event - Not applicable for WebSocket mode
   * This method exists to satisfy the Channel interface but should not be used
   * when WebSocket is active.
   */
  async processEvent(_event: unknown, _headers: Record<string, string>): Promise<ChannelEventResult> {
    console.warn('[FeishuWSChannel] processEvent() is not applicable for WebSocket mode');
    return { type: 'ignored' };
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(channelId: string, response: ChannelResponse): Promise<void> {
    const chatId = channelId.replace('feishu:', '');

    try {
      await this.larkClient.im.v1.message.create({
        params: {
          receive_id_type: 'chat_id' as const,
        },
        data: {
          receive_id: chatId,
          msg_type: 'text' as const,
          content: JSON.stringify({ text: response.content }),
        },
      });
      this.log('debug', 'Message sent to:', chatId);
    } catch (error) {
      this.log('error', 'Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Reply to a specific message
   */
  async replyMessage(messageId: string, response: ChannelResponse): Promise<void> {
    try {
      await this.larkClient.im.v1.message.reply({
        path: {
          message_id: messageId,
        },
        data: {
          msg_type: 'text' as const,
          content: JSON.stringify({ text: response.content }),
        },
      });
      this.log('debug', 'Reply sent to message:', messageId);
    } catch (error) {
      this.log('error', 'Failed to reply message:', error);
      throw error;
    }
  }

  /**
   * Send an interactive card message
   */
  async sendCardMessage(
    channelId: string,
    title: string,
    content: string,
  ): Promise<void> {
    const chatId = channelId.replace('feishu:', '');

    try {
      await this.larkClient.im.v1.message.create({
        params: {
          receive_id_type: 'chat_id' as const,
        },
        data: {
          receive_id: chatId,
          msg_type: 'interactive' as const,
          content: JSON.stringify(Lark.messageCard.defaultCard({ title, content })),
        },
      });
      this.log('debug', 'Card message sent to:', chatId);
    } catch (error) {
      this.log('error', 'Failed to send card message:', error);
      throw error;
    }
  }

  /**
   * Get the underlying Lark client for advanced usage
   */
  getLarkClient(): Lark.Client {
    return this.larkClient;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectionState: ConnectionState;
    reconnectAttempts: number;
    lastMessageAt: number;
    isActive: boolean;
  } {
    return {
      connectionState: this._connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastMessageAt: this.lastMessageTime,
      isActive: this.isActive(),
    };
  }
}