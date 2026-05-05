/**
 * Hermes Agent handler for the Weixin Channel.
 *
 * Uses the unified HermesEngine via `runEngine` so that model resolution,
 * tool registration (builtin + business + skills), memory lifecycle, and
 * streaming callbacks are identical to the HTTP SSE route
 * (`src/app/api/chat/hermes/route.ts`).
 *
 * Differences from the HTTP route:
 *   - No SSE stream is consumed (we only need the final result).
 *   - platform is forced to 'weixin' (plain-text output, no markdown).
 */

import { runEngine } from '@server/core/engine';
import { SSEEmitter } from '@server/base/sseEmitter';
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from '@server/core/agents/hermes';
import logger from '@server/base/logger';
import type { ChannelMessage } from '@investment-agent/agent-channel';
import type { WeixinAgentHandler, WeixinMessageContext, WeixinReplySender } from './types';

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROVIDER = 'ant';
const DEFAULT_MODEL = 'Kimi-K2.6';

// ── Handler implementation ────────────────────────────────────────────────────

export class HermesWeixinHandler implements WeixinAgentHandler {
  async handle(
    message: ChannelMessage,
    ctx: WeixinMessageContext,
    _sender: WeixinReplySender,
  ): Promise<string> {
    const abortController = new AbortController();
    const messageId = `wx_${crypto.randomUUID()}`;

    // Build messages array: history turns + current user message.
    // HermesEngine extracts the last user message as the current input
    // and feeds the rest as conversation history.
    const messages = [
      ...ctx.history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: message.content },
    ];

    logger.info(
      `[HermesWeixinHandler] model=${DEFAULT_PROVIDER}/${DEFAULT_MODEL}` +
        ` historyTurns=${ctx.history.length}`,
    );

    // Build portfolio context on the first turn (no prior history)

    // The SSEEmitter is required by the engine contract, but for the Weixin
    // channel we only consume the final result. No one reads the stream.
    const emitter = new SSEEmitter();

    const result = await runEngine(
      'hermes',
      {
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        messageId,
        model: DEFAULT_MODEL,
        provider: DEFAULT_PROVIDER,
        messages,
        systemPrompt: INVESTMENT_ASSISTANT_SYSTEM_PROMPT,
        signal: abortController.signal,
        extra: {
          enableTools: true,
          maxIterations: 10,
          platform: 'weixin',
          name: 'weixin-agent',
        },
      },
      emitter,
    );

    if (!result.completed && result.error) {
      logger.warn(
        `[HermesWeixinHandler] Agent did not complete: ${result.error}`,
      );
    }

    logger.info(
      `[HermesWeixinHandler] completed=${result.completed} apiCalls=${result.apiCalls ?? 0}` +
        ` reply="${(result.content ?? '').slice(0, 60).replace(/\n/g, ' ')}${(result.content ?? '').length > 60 ? '…' : ''}"`,
    );

    return result.content || result.error || '（Agent 未能生成回复）';
  }
}
