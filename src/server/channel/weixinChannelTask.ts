/**
 * Weixin Channel Task — Service Layer
 *
 * Responsibilities:
 *   - Weixin credentials management (read from DB / env)
 *   - WeixinChannel lifecycle (start / stop / idempotent restart)
 *   - Session creation and history loading
 *   - Message persistence (user + assistant turns)
 *   - Dispatching inbound messages to a WeixinAgentHandler
 *   - Sending replies back through the channel
 *
 * Designed for Next.js instrumentation.ts:
 *   - Idempotent start (safe for multiple calls)
 *   - Concurrent call serialization
 *   - Graceful degradation on missing credentials
 *   - Background startup (non-blocking)
 */

import { WeixinChannel, type WeixinChannelConfig } from '@investment-agent/agent-channel';
import type { ChannelMessage } from '@investment-agent/agent-channel';
import settingService from '@server/service/settingService';
import { chatStorageService } from '@server/service/chatStorageService';
import authService from '@server/service/authService';
import { sessionRepository } from '@server/repository/chat/session';
import logger from '@server/base/logger';
import type { WeixinAgentHandler } from './types';
import { HermesWeixinHandler } from './hermesWeixinHandler';

// ── Types ───────────────────────────────────────────────────────────────────

interface WeixinConfig {
  token: string;
  accountId: string;
  baseUrl: string;
  allowedUsers?: string[];
}

interface CachedContext {
  userId: number;
  sessionIdCache: Map<string, string>;
}

// ── Module State ─────────────────────────────────────────────────────────────

let activeChannel: WeixinChannel | null = null;
let activeConfigHash = '';
let startingPromise: Promise<void> | null = null;
let cachedContext: CachedContext | null = null;

// ── Credentials ──────────────────────────────────────────────────────────────

async function getWeixinConfig(): Promise<WeixinConfig> {
  const [token, accountId, baseUrl, allowedUsersRaw] = await Promise.all([
    settingService.getConfigValueByKey('WEIXIN_TOKEN'),
    settingService.getConfigValueByKey('WEIXIN_ACCOUNT_ID'),
    settingService.getConfigValueByKey('WEIXIN_BASE_URL'),
    settingService.getConfigValueByKey('WEIXIN_ALLOWED_USERS'),
  ]);

  const resolvedToken = token ?? process.env.WEIXIN_TOKEN ?? '';
  const resolvedAccountId = accountId ?? process.env.WEIXIN_ACCOUNT_ID ?? '';
  const resolvedBaseUrl = baseUrl ?? process.env.WEIXIN_BASE_URL ?? '';
  const resolvedAllowedUsersRaw = allowedUsersRaw ?? process.env.WEIXIN_ALLOWED_USERS ?? '';

  const parsedUsers = resolvedAllowedUsersRaw
    ? resolvedAllowedUsersRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    token: resolvedToken,
    accountId: resolvedAccountId,
    baseUrl: resolvedBaseUrl,
    allowedUsers: parsedUsers.length > 0 ? parsedUsers : undefined,
  };
}

// ── Context Caching ──────────────────────────────────────────────────────────

/**
 * Initialize cached context (call once at startup)
 */
async function initializeContext(): Promise<CachedContext> {
  if (cachedContext) return cachedContext;

  const userIdStr = await authService.getDefaultUserId();
  const userId = Number.isNaN(Number(userIdStr)) ? 1 : Number(userIdStr);

  cachedContext = {
    userId,
    sessionIdCache: new Map(),
  };

  logger.info(`[WeixinSvc] Context initialized  userId=${userId}`);
  return cachedContext;
}

/**
 * Get or create session with caching
 */
async function getOrCreateSession(
  channelId: string,
  userId: number,
  cache: Map<string, string>,
): Promise<string> {
  // Check cache first
  const cached = cache.get(channelId);
  if (cached) return cached;

  // Check database
  const slug = channelId.replace(':', '-');
  const existing = await sessionRepository.findBySlug(slug);
  if (existing) {
    cache.set(channelId, existing.id);
    return existing.id;
  }

  // Create new session
  const sessionId = await chatStorageService.createSession(userId, {
    slug,
    type: 'agent',
    config: {
      model: 'default',
      provider: 'default',
      systemRole: 'You are a helpful assistant responding via WeChat.',
      params: {},
    },
    meta: {
      title: `WeChat Session ${channelId.split(':')[1]?.slice(0, 8) ?? ''}`,
      description: 'Auto-created from Weixin channel',
    },
  });

  cache.set(channelId, sessionId);
  logger.info(`[WeixinSvc] Session created  sessionId=${sessionId.slice(0, 8)}... channelId=${channelId}`);

  return sessionId;
}

// ── History Loading ──────────────────────────────────────────────────────────

/**
 * Load recent conversation history for context
 * Returns messages in chronological order (oldest first)
 */
async function loadHistoryMessages(
  sessionId: string,
  limit = 20,
): Promise<Array<{ role: string; content: string }>> {
  const messages = await chatStorageService.getMessages({ sessionId, pageSize: limit });

  // Filter and map in one pass
  const result: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'user' || m.role === 'assistant') {
      result.push({ role: m.role, content: m.content ?? '' });
    }
  }

  return result;
}

// ── Message Dispatcher ───────────────────────────────────────────────────────

function createMessageDispatcher(channel: WeixinChannel, handler: WeixinAgentHandler) {
  return async (message: ChannelMessage): Promise<void> => {
    const shortContent = message.content.slice(0, 60).replace(/\n/g, ' ');
    logger.info(
      `[WeixinSvc] ↓ Received  channelId=${message.channelId} | "${shortContent}${message.content.length > 60 ? '...' : ''}"`,
    );
    const t0 = Date.now();

    try {
      if (!cachedContext) {
        throw new Error('Context not initialized - call startWeixinChannel first');
      }

      const { userId, sessionIdCache } = cachedContext;

      // 1. Get or create session (with caching)
      const sessionId = await getOrCreateSession(message.channelId, userId, sessionIdCache);

      // 2. Load history BEFORE saving current message
      const history = await loadHistoryMessages(sessionId);
      logger.info(`[WeixinSvc] 📜 History loaded  turns=${history.length}`);

      // 3. Persist user message
      await chatStorageService.createMessage({
        sessionId,
        role: 'user',
        content: message.content,
      });

      // 4. Delegate to agent handler
      const ctx = { sessionId, userId, history };
      const reply = await handler.handle(message, ctx, channel);

      // 5. Persist assistant reply
      await chatStorageService.createMessage({
        sessionId,
        role: 'assistant',
        content: reply,
      });

      // 6. Send reply through the channel
      logger.info(`[WeixinSvc] ↑ Sending reply  channelId=${message.channelId} length=${reply.length}`);
      await channel.sendMessage(message.channelId, { content: reply });
      logger.info(`[WeixinSvc] ✓ Reply sent  channelId=${message.channelId} total=${Date.now() - t0}ms`);
    } catch (error) {
      logger.error(`[WeixinSvc] ✗ Failed to process message channelId=${message.channelId}:`, error);

      // Try to send error reply to user
      try {
        await channel.sendMessage(message.channelId, {
          content: 'Sorry, an error occurred while processing your message. Please try again.',
        });
      } catch (sendError) {
        logger.error('[WeixinSvc] Failed to send error reply:', sendError);
      }
    }
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start or restart the Weixin long-poll channel.
 *
 * Features:
 *   - Idempotent: safe to call multiple times
 *   - Concurrent-safe: serializes parallel calls
 *   - Auto-restart: restarts when credentials change
 *   - Non-blocking: returns immediately if already starting
 *
 * @param handler Optional custom agent handler (defaults to HermesWeixinHandler)
 */
export async function startWeixinChannel(handler?: WeixinAgentHandler): Promise<void> {
  // Serialize concurrent calls
  if (startingPromise) {
    logger.info('[WeixinSvc] Channel start already in progress, awaiting...');
    return startingPromise;
  }

  startingPromise = doStart(handler).finally(() => {
    startingPromise = null;
  });

  return startingPromise;
}

async function doStart(handler?: WeixinAgentHandler): Promise<void> {
  const resolvedHandler = handler ?? new HermesWeixinHandler();

  // Initialize context (cache user ID)
  await initializeContext();

  // Load config
  const config = await getWeixinConfig();

  // Graceful degradation: skip if no credentials
  if (!config.token || !config.accountId) {
    logger.info(
      '[WeixinSvc] No credentials configured (WEIXIN_TOKEN / WEIXIN_ACCOUNT_ID), skipping channel startup',
    );
    return;
  }

  const configHash = `${config.accountId}:${config.token}:${config.baseUrl}`;

  // Idempotent: skip if same config
  if (activeChannel && configHash === activeConfigHash) {
    logger.info(
      `[WeixinSvc] Channel already running with same config (accountId=${config.accountId}), skipping restart`,
    );
    return;
  }

  // Restart on config change
  if (activeChannel) {
    logger.info('[WeixinSvc] Credentials changed, stopping previous channel instance...');
    await activeChannel.disconnect();
    activeChannel = null;
  }

  const channelConfig: WeixinChannelConfig = {
    token: config.token,
    accountId: config.accountId,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    ...(config.allowedUsers ? { allowedUsers: config.allowedUsers } : {}),
  };

  logger.info(
    `[WeixinSvc] 🚀 Starting Weixin channel` +
    ` accountId=${config.accountId}` +
    ` baseUrl=${config.baseUrl || '(default)'}` +
    ` allowedUsers=${config.allowedUsers ? config.allowedUsers.join(',') : '(open)'}` +
    ` handler=${resolvedHandler.constructor.name}`,
  );

  const channel = new WeixinChannel(channelConfig);
  channel.onMessage(createMessageDispatcher(channel, resolvedHandler));
  channel.connect();

  activeChannel = channel;
  activeConfigHash = configHash;

  logger.info(`[WeixinSvc] ✅ Weixin channel active  accountId=${config.accountId}`);
}

/**
 * Stop the active Weixin channel (e.g., on graceful shutdown)
 */
export async function stopWeixinChannel(): Promise<void> {
  if (!activeChannel) {
    logger.info('[WeixinSvc] stopWeixinChannel called but channel is not running');
    return;
  }

  logger.info('[WeixinSvc] 🛑 Stopping Weixin channel...');
  await activeChannel.disconnect();
  activeChannel = null;
  activeConfigHash = '';
  cachedContext = null;
  logger.info('[WeixinSvc] ✅ Weixin channel stopped');
}

/**
 * Check if the channel is currently connected
 */
export function isWeixinChannelRunning(): boolean {
  return activeChannel !== null;
}

/**
 * Clear session cache (useful for testing or manual cleanup)
 */
export function clearSessionCache(): void {
  if (cachedContext) {
    cachedContext.sessionIdCache.clear();
    logger.info('[WeixinSvc] Session cache cleared');
  }
}

const weixinChannelTask = {
  startWeixinChannel,
  stopWeixinChannel,
  isWeixinChannelRunning,
  clearSessionCache,
};

export default weixinChannelTask;
