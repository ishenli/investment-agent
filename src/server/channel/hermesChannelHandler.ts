/**
 * Hermes Agent handler for messaging channels.
 *
 * Uses the unified HermesEngine via `runEngine` so that model resolution,
 * tool registration (builtin + business + skills), memory lifecycle, and
 * error handling are consistent with HTTP SSE route.
 *
 * Differences from the HTTP route:
 *   - No SSE stream (we only need the final result).
 *   - platform is supplied by the channel task (plain-text output).
 *   - Uses NoOpEventSink to discard all streaming events.
 */

import crypto from 'node:crypto';
import { runEngine } from '@server/core/engine';
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from '@server/core/agents/hermes';
import logger from '@server/base/logger';
import type { ChannelMessage, Platform } from '@investment-agent/agent-channel';
import type { ChannelAgentHandler, ChannelMessageContext } from './types';

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROVIDER = 'ant';
const DEFAULT_MODEL = 'DeepSeek-V4-Flash-0731';

// Max wall-clock time for a single agent run. The channel layer cannot surface
// any reply until handle() resolves, so an unbounded model/provider call
// (misconfigured model, hung stream) would otherwise leave the user with no
// response at all. Generous enough for maxIterations=10 tool loops.
const AGENT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// ── Handler implementation ────────────────────────────────────────────────────

export class HermesChannelHandler implements ChannelAgentHandler {
  constructor(private readonly platform: Platform) {}

  async handle(message: ChannelMessage, ctx: ChannelMessageContext): Promise<string> {
    const abortController = new AbortController();
    const messageId = `${this.platform.slice(0, 2)}_${crypto.randomUUID()}`;
    const logTag = `HermesChannelHandler:${this.platform}`;

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
      `[${logTag}] model=${DEFAULT_PROVIDER}/${DEFAULT_MODEL}` +
        ` historyTurns=${ctx.history.length}`,
    );

    let engineAbortTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      // runEngine now accepts optional eventSink - if not provided, uses NoOpEventSink
      const enginePromise = runEngine(
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
            platform: this.platform,
            name: `${this.platform}-agent`,
          },
        },
        // No eventSink - engine will use NoOpEventSink internally
      );

      // Guard the whole engine run with an idle timeout: handle() must always
      // settle so the channel can reply. Abort the signal AND reject the race so
      // the timeout wins even if a provider client ignores the abort signal.
      const timeoutPromise = new Promise<never>((_, reject) => {
        engineAbortTimer = setTimeout(() => {
          abortController.abort(new Error('Agent run timed out'));
          reject(new Error('Agent run timed out'));
        }, AGENT_IDLE_TIMEOUT_MS);
        engineAbortTimer.unref?.();
      });

      const result = await Promise.race([enginePromise, timeoutPromise]);

      if (!result.completed && result.error) {
        logger.warn(`[${logTag}] Agent did not complete: ${result.error}`);
      }

      logger.info(
        `[${logTag}] completed=${result.completed} apiCalls=${result.apiCalls ?? 0}` +
          ` reply="${(result.content ?? '').slice(0, 60).replace(/\n/g, ' ')}${(result.content ?? '').length > 60 ? '…' : ''}"`,
      );

      return result.content || result.error || '（Agent 未能生成回复）';
    } catch (error) {
      const timedOut = abortController.signal.aborted;
      const reason = timedOut
        ? 'Agent run timed out'
        : error instanceof Error
          ? error.message
          : String(error);
      logger.error(`[${logTag}] ${timedOut ? 'Timed out' : 'Error'}: ${reason}`);
      return timedOut ? '处理超时，请稍后重试。' : '抱歉，处理消息时发生错误，请稍后重试。';
    } finally {
      if (engineAbortTimer) clearTimeout(engineAbortTimer);
    }
  }
}
