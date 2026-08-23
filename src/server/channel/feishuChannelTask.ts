import { createHash } from 'node:crypto';
import { FeishuWSChannel, type ChannelMessage } from '@investment-agent/agent-channel';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import { sessionRepository } from '@server/repository/chat/session';
import { chatStorageService } from '@server/service/chatStorageService';
import type { ChannelAgentHandler } from './types';
import { getFeishuRuntimeConfig, type FeishuRuntimeConfig } from './feishuConfig';
import { HermesChannelHandler } from './hermesChannelHandler';

interface CachedContext {
  userId: number;
  sessionIds: Map<string, string>;
}

let activeChannel: FeishuWSChannel | null = null;
let activeConfigHash = '';
let startingPromise: Promise<void> | null = null;
let cachedContext: CachedContext | null = null;
const channelChains = new Map<string, Promise<void>>();

async function initializeContext(): Promise<CachedContext> {
  if (cachedContext) return cachedContext;
  const rawUserId = await authService.getDefaultUserId();
  const parsedUserId = Number.parseInt(rawUserId, 10);
  if (!Number.isSafeInteger(parsedUserId) || parsedUserId <= 0) {
    throw new Error('Feishu channel requires a default application user');
  }
  cachedContext = {
    userId: parsedUserId,
    sessionIds: new Map(),
  };
  return cachedContext;
}

async function getOrCreateSession(channelId: string, context: CachedContext): Promise<string> {
  const cached = context.sessionIds.get(channelId);
  if (cached) return cached;

  const slug = channelId.replace(':', '-');
  const existing = await sessionRepository.findBySlug(slug);
  if (existing) {
    context.sessionIds.set(channelId, existing.id);
    return existing.id;
  }

  const sessionId = await chatStorageService.createSession(context.userId, {
    slug,
    type: 'agent',
    config: {
      model: 'default',
      provider: 'default',
      systemRole: 'You are a helpful assistant responding via Feishu.',
      params: {},
    },
    meta: {
      title: `飞书会话 ${channelId.split(':')[1]?.slice(0, 8) ?? ''}`,
      description: 'Auto-created from Feishu channel',
    },
  });
  context.sessionIds.set(channelId, sessionId);
  return sessionId;
}

async function loadHistory(sessionId: string) {
  const messages = await chatStorageService.getMessages({
    sessionId,
    pageSize: 20,
  });
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: message.content ?? '',
    }));
}

async function processMessage(
  channel: FeishuWSChannel,
  handler: ChannelAgentHandler,
  message: ChannelMessage,
): Promise<void> {
  try {
    const context = await initializeContext();
    const sessionId = await getOrCreateSession(message.channelId, context);
    const command = message.content.trim().toLowerCase();
    if (command === '/clear' || command === 'clear') {
      await chatStorageService.deleteMessagesBySessionAndTopic(sessionId);
      await channel.sendMessage(message.channelId, {
        content: '上下文已清除，可以开始新的对话。',
        metadata: { replyToMessageId: message.id },
      });
      return;
    }

    const history = await loadHistory(sessionId);
    await chatStorageService.createMessage({
      sessionId,
      role: 'user',
      content: message.content,
    });

    const reply = await handler.handle(
      message,
      { sessionId, userId: context.userId, history },
      channel,
    );

    await chatStorageService.createMessage({
      sessionId,
      role: 'assistant',
      content: reply,
    });
    await channel.sendMessage(message.channelId, {
      content: reply,
      metadata: { replyToMessageId: message.id },
    });
  } catch (error) {
    logger.error(`[FeishuSvc] Failed to process channel ${message.channelId}`, error);
    try {
      await channel.sendMessage(message.channelId, {
        content: '抱歉，处理消息时发生错误，请稍后重试。',
        metadata: { replyToMessageId: message.id },
      });
    } catch (sendError) {
      logger.error('[FeishuSvc] Failed to send error reply', sendError);
    }
  }
}

function enqueueMessage(
  channel: FeishuWSChannel,
  handler: ChannelAgentHandler,
  message: ChannelMessage,
): void {
  const previous = channelChains.get(message.channelId) ?? Promise.resolve();
  const current = previous.then(
    () => processMessage(channel, handler, message),
    () => processMessage(channel, handler, message),
  );
  channelChains.set(message.channelId, current);
  void current.finally(() => {
    if (channelChains.get(message.channelId) === current) {
      channelChains.delete(message.channelId);
    }
  });
}

function hashConfig(config: FeishuRuntimeConfig): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        enabled: config.enabled,
        appId: config.appId,
        appSecretHash: createHash('sha256').update(config.appSecret).digest('hex'),
        domain: config.domain,
        allowedUserOpenIds: [...config.allowedUserOpenIds].sort(),
        allowedChatIds: [...config.allowedChatIds].sort(),
      }),
    )
    .digest('hex');
}

async function stopActiveChannel(): Promise<void> {
  if (!activeChannel) return;
  await activeChannel.stop();
  activeChannel = null;
  activeConfigHash = '';
  channelChains.clear();
}

async function doStart(handler?: ChannelAgentHandler): Promise<void> {
  const config = await getFeishuRuntimeConfig();
  if (
    !config.enabled ||
    !config.appId ||
    !config.appSecret ||
    (config.allowedUserOpenIds.length === 0 && config.allowedChatIds.length === 0)
  ) {
    await stopActiveChannel();
    logger.info(
      '[FeishuSvc] Channel inactive: enablement, credentials, or allowlists are incomplete',
    );
    return;
  }

  const nextHash = hashConfig(config);
  if (activeChannel && activeConfigHash === nextHash) return;
  await stopActiveChannel();
  await initializeContext();

  const channel = new FeishuWSChannel({
    appId: config.appId,
    appSecret: config.appSecret,
    domain: config.domain,
    allowedUserOpenIds: config.allowedUserOpenIds,
    allowedChatIds: config.allowedChatIds,
    logger: (level, message, ...args) => {
      const text = `[FeishuSvc] ${message}`;
      if (level === 'error') logger.error(text, ...args);
      else if (level === 'warn') logger.warn(text, ...args);
      else logger.info(text, ...args);
    },
  });
  const resolvedHandler = handler ?? new HermesChannelHandler('feishu');
  await channel.start((message) => {
    enqueueMessage(channel, resolvedHandler, message);
  });

  activeChannel = channel;
  activeConfigHash = nextHash;
  logger.info(
    `[FeishuSvc] Channel active; privateUsers=${config.allowedUserOpenIds.length}, groups=${config.allowedChatIds.length}`,
  );
}

export async function startFeishuChannel(handler?: ChannelAgentHandler): Promise<void> {
  if (startingPromise) return startingPromise;
  startingPromise = doStart(handler).finally(() => {
    startingPromise = null;
  });
  return startingPromise;
}

export async function restartFeishuChannel(handler?: ChannelAgentHandler): Promise<void> {
  if (startingPromise) await startingPromise;
  await stopActiveChannel();
  return startFeishuChannel(handler);
}

export async function stopFeishuChannel(): Promise<void> {
  if (startingPromise) await startingPromise;
  await stopActiveChannel();
  cachedContext = null;
}

export function getFeishuChannelStatus() {
  return {
    running: activeChannel?.isActive() ?? false,
    connectionState: activeChannel?.connectionState ?? 'disconnected',
    lastMessageAt: activeChannel?.lastMessageAt ?? 0,
  };
}
