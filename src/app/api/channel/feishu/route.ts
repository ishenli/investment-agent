/**
 * Feishu Channel Webhook Route
 *
 * - Returns 200 immediately to satisfy Feishu's 3s timeout
 * - Processes agent response asynchronously, replies via Feishu API
 * - Messages persisted to chat_messages table
 * - Each feishu chat auto-creates a chat_session for history
 * - Event deduplication and per-channel locking handled by MessageRouter
 * - Config priority: DB settings > environment variables
 */
import { MessageRouter, InMemorySessionStore } from '@investment-agent/agent-channel';
import type { ChannelMessage, ChannelSession } from '@investment-agent/agent-channel';
import { FeishuChannel } from '@investment-agent/agent-channel/feishu';
import { HermesAgent, getModel } from '@investment-agent/hermes-agent';
import settingService from '@server/service/settingService';
import { chatStorageService } from '@server/service/chatStorageService';
import authService from '@server/service/authService';
import { sessionRepository } from '@server/repository/chat/session';
import logger from '@server/base/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============== Module-level Singleton (preserves token cache) ==============

let cachedRouter: MessageRouter | null = null;
let cachedConfigHash = '';

async function getChannelConfig() {
  const appId =
    (await settingService.getConfigValueByKey('FEISHU_APP_ID')) ??
    process.env.FEISHU_APP_ID ??
    '';
  const appSecret =
    (await settingService.getConfigValueByKey('FEISHU_APP_SECRET')) ??
    process.env.FEISHU_APP_SECRET ??
    '';
  const verificationToken =
    (await settingService.getConfigValueByKey('FEISHU_VERIFICATION_TOKEN')) ??
    process.env.FEISHU_VERIFICATION_TOKEN;
  const encryptKey =
    (await settingService.getConfigValueByKey('FEISHU_ENCRYPT_KEY')) ??
    process.env.FEISHU_ENCRYPT_KEY;
  const aiProvider =
    (await settingService.getConfigValueByKey('FEISHU_AI_PROVIDER')) ??
    process.env.FEISHU_AI_PROVIDER ??
    'openai';
  const aiModel =
    (await settingService.getConfigValueByKey('FEISHU_AI_MODEL')) ??
    process.env.FEISHU_AI_MODEL ??
    'gpt-4o-mini';

  return { appId, appSecret, verificationToken, encryptKey, aiProvider, aiModel };
}

/**
 * Get or rebuild the router singleton.
 * Rebuilds only when config changes (e.g., user updates settings).
 */
async function getRouter() {
  const config = await getChannelConfig();
  const configHash = `${config.appId}:${config.appSecret}:${config.verificationToken}:${config.encryptKey}`;

  if (cachedRouter && configHash === cachedConfigHash) {
    return { router: cachedRouter, config };
  }

  const feishuChannel = new FeishuChannel({
    appId: config.appId,
    appSecret: config.appSecret,
    verificationToken: config.verificationToken,
    encryptKey: config.encryptKey,
  });

  cachedRouter = new MessageRouter(
    {
      channels: [feishuChannel],
      handler: createAgentHandler(config),
      sessionStore: new InMemorySessionStore(),
    },
    { asyncProcessing: true },
  );
  cachedConfigHash = configHash;

  return { router: cachedRouter, config };
}

// ============== Session Management ==============

/**
 * Get or create a chat_session for a feishu channel.
 * Called inside per-channel lock, so no race condition.
 */
async function getOrCreateSession(channelId: string, userId: number): Promise<string> {
  const slug = channelId.replace(':', '-');

  const existing = await sessionRepository.findBySlug(slug);
  if (existing) return existing.id;

  return chatStorageService.createSession(userId, {
    slug,
    type: 'agent',
    config: {
      model: 'gpt-4o-mini',
      provider: 'openai',
      systemRole: 'You are a helpful assistant responding via Feishu.',
      params: {},
    },
    meta: {
      title: `飞书会话 ${channelId.split(':')[1]?.slice(0, 8) ?? ''}`,
      description: 'Auto-created from Feishu channel',
    },
  });
}

/**
 * Load recent message history from DB.
 */
async function loadHistoryMessages(
  sessionId: string,
  limit: number = 20,
): Promise<Array<{ role: string; content: string }>> {
  const messages = await chatStorageService.getMessages({
    sessionId,
    pageSize: limit,
  });

  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content ?? '' }));
}

// ============== Agent Handler ==============

function createAgentHandler(config: { aiProvider: string; aiModel: string }) {
  return async (message: ChannelMessage, _session: ChannelSession) => {
    // 1. Resolve user
    const userIdStr = await authService.getDefaultUserId();
    const userId = parseInt(userIdStr) || 1;

    // 2. Get or create persistent chat session (safe: inside per-channel lock)
    const sessionId = await getOrCreateSession(message.channelId, userId);

    // 3. Load history BEFORE saving current message (avoids ordering assumption)
    const history = await loadHistoryMessages(sessionId);

    // 4. Save user message to DB
    await chatStorageService.createMessage({
      sessionId,
      role: 'user',
      content: message.content,
    });

    // 5. Build agent with history context
    const model = getModel(
      config.aiProvider as 'openai',
      config.aiModel as 'gpt-4o-mini',
    );

    const agent = new HermesAgent({
      model,
      name: 'feishu-agent',
      systemPrompt:
        'You are a helpful assistant responding via Feishu. Be concise and helpful.',
      maxIterations: 10,
    });

    const historyPrompt = history
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullMessage = historyPrompt
      ? `Previous conversation:\n${historyPrompt}\n\nUser: ${message.content}`
      : message.content;

    const result = await agent.run({ message: fullMessage });

    // 6. Save assistant response to DB
    await chatStorageService.createMessage({
      sessionId,
      role: 'assistant',
      content: result.finalResponse,
      fromModel: config.aiModel,
      fromProvider: config.aiProvider,
    });

    logger.info(
      `[FeishuChannel] Processed message in session ${sessionId}, apiCalls: ${result.apiCalls}`,
    );

    return {
      content: result.finalResponse,
      metadata: { replyToMessageId: message.id },
    };
  };
}

// ============== Route Handler ==============

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers);

    const { router } = await getRouter();
    const result = await router.route('feishu', body, headers);

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    logger.error('[FeishuChannel] Error handling webhook:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
