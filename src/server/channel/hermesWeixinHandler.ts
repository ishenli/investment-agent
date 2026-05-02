/**
 * Hermes Agent handler for the Weixin Channel.
 *
 * Implements WeixinAgentHandler by delegating to HermesAgent.
 * Model resolution logic mirrors src/app/api/chat/hermes/route.ts exactly —
 * any change to resolveModel in that file should be reflected here.
 *
 * This class has no knowledge of channel lifecycle, session creation,
 * message persistence, or reply sending — those are the Channel layer's job.
 */

import {
  HermesAgent,
  ToolRegistry,
  registerBuiltinTools,
  type Message,
} from '@investment-agent/hermes-agent';
import type { ChannelMessage } from '@investment-agent/agent-channel';
import { registerBusinessTools, INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from '@server/core/agents/hermes';
import { resolveAgentModel } from '@server/service/agentModelResolver';
import { getProjectRoot } from '@server/base/env';
import logger from '@server/base/logger';
import path from 'path';
import type { WeixinAgentHandler, WeixinMessageContext, WeixinReplySender } from './types';

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROVIDER = 'ant';
const DEFAULT_MODEL = 'Kimi-K2.6';

// ── Handler implementation ────────────────────────────────────────────────────

/**
 * Processes an inbound WeChat message using HermesAgent.
 *
 * Follows the same agent.run() pattern as hermes/route.ts:
 *   - Structured pi-ai Message[] history (not a concatenated string)
 *   - Current message passed as input.message
 *   - History passed as context.messages (all prior turns)
 *   - streaming: true, but no onTextDelta → complete() path in loop.ts
 */
export class HermesWeixinHandler implements WeixinAgentHandler {
  async handle(
    message: ChannelMessage,
    ctx: WeixinMessageContext,
    _sender: WeixinReplySender, // reserved for future partial-reply streaming
  ): Promise<string> {
    // 1. Resolve model + apiKey from DB (same logic as hermes/route.ts)
    const { model: piModel, apiKey } = await resolveAgentModel(
      ctx.userId,
      DEFAULT_PROVIDER,
      DEFAULT_MODEL,
    );

    logger.info(
      `[HermesWeixinHandler] model=${piModel.provider ?? DEFAULT_PROVIDER}/${piModel.id}` +
      ` historyTurns=${ctx.history.length}`,
    );

    // 2. Build structured pi-ai message context (mirrors hermes/route.ts step 4)
    const piMessages: Message[] = ctx.history.map((m) => {
      if (m.role === 'user') {
        return { role: 'user' as const, content: m.content, timestamp: Date.now() };
      }
      return {
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: m.content }],
        timestamp: Date.now(),
      } as Message;
    });

    // 3. Register tools (mirrors hermes/route.ts step 2)
    //    Web-safe builtin tools + full business tools (stock, note, db, search)
    const registry = ToolRegistry.create();
    registerBuiltinTools(registry, {
      enable: ['read_file', 'search_files', 'list_directory', 'web_search', 'web_fetch', 'think'],
    });
    registerBusinessTools(registry);

    // 4. Create agent (mirrors hermes/route.ts step 6)
    //    streaming: true but no onTextDelta callback → loop.ts falls back to complete()
    //    toolEnforcement: tools are now registered, so enforcement is back on (default true)
    const agent = new HermesAgent({
      model: piModel,
      name: 'weixin-agent',
      systemPrompt: INVESTMENT_ASSISTANT_SYSTEM_PROMPT,
      memoryDir: path.join(getProjectRoot(), 'workspace', String(ctx.userId), '.hermes', 'memories'),
      memorySessionId: String(ctx.userId),
      maxIterations: 10,
      streaming: true,
      platform: 'weixin', // plain text, no markdown
      loadContextFiles: false,
      toolRegistry: registry,
      streamOptions: {
        ...(apiKey ? { apiKey } : {}),
      },
    });

    // 5. Run agent with structured context (mirrors hermes/route.ts step 8)
    //    current message as input.message; history as context.messages
    const result = await agent.run({
      message: message.content,
      context: {
        systemPrompt: agent.getSystemPrompt(),
        messages: piMessages, // all history turns (not including current)
      },
    });

    if (!result.completed) {
      logger.warn(
        `[HermesWeixinHandler] Agent did not complete: ${result.error ?? 'unknown error'}`,
      );
    }

    logger.info(
      `[HermesWeixinHandler] completed=${result.completed} apiCalls=${result.apiCalls}` +
      ` reply="${result.finalResponse.slice(0, 60).replace(/\n/g, ' ')}${result.finalResponse.length > 60 ? '…' : ''}"`,
    );

    return result.finalResponse || result.error || '（Agent 未能生成回复）';
  }
}
