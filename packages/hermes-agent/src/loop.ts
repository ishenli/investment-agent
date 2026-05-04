/**
 * Agent loop for Hermes Agent.
 *
 * A raw while loop implementing the core tool-calling pattern,
 * directly ported from Python hermes-agent's run_conversation().
 *
 * Loop:
 *   1. Call LLM with messages + tools
 *   2. If response has tool_calls → execute tools → add results → goto 1
 *   3. If no tool_calls → return final response
 *   4. If budget exhausted → return with error
 */

import {
  complete,
  stream,
  type Context,
  type AssistantMessage,
  type ToolResultMessage,
  type ToolCall,
} from '@mariozechner/pi-ai';
import { IterationBudget } from './budget';
import { HermesAgentError } from './error';
import { withRetry } from './retry';
import { ContextCompressor } from './context';
import { buildMemoryContextBlock } from './memory-manager';
import type {
  AgentConfig,
  AgentCallbacks,
  HermesAgentResult,
  ToolExecutor,
} from './types';
import { ToolRegistry } from './tools';

/**
 * Run the agent loop: call LLM → execute tools → repeat until done.
 */
export async function runAgentLoop(
  config: AgentConfig,
  context: Context,
): Promise<HermesAgentResult> {
  const {
    model,
    maxIterations = 90,
    callbacks,
    toolExecutor,
    streaming = true,
    streamOptions,
    memoryManager,
    turnNumber = 1,
  } = config;

  const budget = new IterationBudget(maxIterations);
  let apiCalls = 0;

  // Extract abort signal from streamOptions for cancellation checks
  const signal = streamOptions?.signal as AbortSignal | undefined;

  // Context compression (optional — only if model has a known context window)
  const compressor =
    model.contextWindow && model.contextWindow > 0
      ? new ContextCompressor({ contextLength: model.contextWindow })
      : null;

  // Save original user message and prefetch memory before the loop
  let originalUserContent = '';
  const userMessages = context.messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (lastUserMsg && typeof lastUserMsg.content === 'string') {
    originalUserContent = lastUserMsg.content;
  }

  if (memoryManager && originalUserContent) {
    try {
      memoryManager.onTurnStart(turnNumber, originalUserContent);
      // Strip any existing ephemeral memory-context blocks before injecting the new one.
      context.messages = context.messages.filter(
        (m) => !(m.role === 'user' && typeof m.content === 'string' && m.content.startsWith('<memory-context>')),
      );
      if (signal?.aborted) {
        console.warn('[AgentLoop] Memory prefetch skipped: aborted');
      } else {
        const prefetchTimeoutMs = (streamOptions?.memoryPrefetchTimeoutMs as number) ?? 5_000;
        const prefetch = await withTimeout(
          memoryManager.prefetchAll(originalUserContent, ''),
          prefetchTimeoutMs,
          `Memory prefetch timed out after ${prefetchTimeoutMs}ms`,
        );
        if (prefetch?.trim()) {
        // Find the last user message by content (more robust than reference equality)
        let lastUserIndex = -1;
        for (let i = context.messages.length - 1; i >= 0; i--) {
          const m = context.messages[i];
          if (m.role === 'user' && typeof m.content === 'string' && m.content === originalUserContent) {
            lastUserIndex = i;
            break;
          }
        }
        if (lastUserIndex >= 0) {
          context.messages.splice(lastUserIndex, 0, {
            role: 'user',
            content: buildMemoryContextBlock(prefetch),
            timestamp: Date.now(),
          });
        }
        }
      }
    } catch (e) {
      console.warn('[AgentLoop] Memory prefetch failed:', e);
    }
  }

  while (!budget.exhausted) {
    // Check abort signal before each iteration
    if (signal?.aborted) {
      return {
        context,
        completed: false,
        apiCalls,
        finalResponse: '',
        error: 'Aborted',
      };
    }

    if (!budget.consume()) {
      callbacks?.onError?.(
        new HermesAgentError(
          `Iteration budget exhausted (${budget.used}/${budget.maxTotal})`,
          'MAX_ITERATIONS_EXCEEDED',
        ),
      );
      break;
    }

    apiCalls++;

    // Call LLM with retry
    let response: AssistantMessage;
    try {
      response = await withRetry(
        async () => {
          if (streaming && callbacks?.onTextDelta) {
            return await streamWithCallbacks(model, context, callbacks, streamOptions);
          }
          return await complete(model, context, streamOptions);
        },
        {
          maxRetries: 3,
          onRetry: (error, attempt, delay) => {
            callbacks?.onError?.(
              new HermesAgentError(
                `Retry ${attempt}: ${error.message} (waiting ${delay.toFixed(1)}s)`,
                error.code,
                { cause: error },
              ),
            );
          },
        },
      );
    } catch (error) {
      return {
        context,
        completed: false,
        apiCalls,
        finalResponse: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Add assistant message to context
    context.messages.push(response);

    // Context compression: check if we need to compact
    if (compressor && response.usage) {
      compressor.updateFromResponse(response.usage);
      if (compressor.shouldCompress()) {
        context.messages = await compressor.compress(
          context.messages,
          model,
          response.usage.input,
        );
      }
    }

    // Extract tool calls from response content
    const toolCalls = response.content.filter(
      (block): block is ToolCall => block.type === 'toolCall',
    );

    // No tool calls → final response, we're done
    if (toolCalls.length === 0) {
      const finalText = extractText(response);

      // Sync memory for this turn
      if (memoryManager && originalUserContent) {
        try {
          const syncTimeoutMs = (streamOptions?.memorySyncTimeoutMs as number) ?? 10_000;
          await withTimeout(
            memoryManager.syncAll(originalUserContent, finalText, ''),
            syncTimeoutMs,
            `Memory sync timed out after ${syncTimeoutMs}ms`,
          );
          memoryManager.queuePrefetchAll(originalUserContent, '');
        } catch (e) {
          console.warn('[AgentLoop] Memory sync failed:', e);
        }
      }

      return {
        context,
        completed: true,
        apiCalls,
        finalResponse: finalText,
      };
    }

    // Notify step callback
    callbacks?.onStep?.(
      budget.used,
      toolCalls.map((tc) => tc.name),
    );

    // Execute tool calls
    for (const toolCall of toolCalls) {
      // Check abort between tool calls
      if (signal?.aborted) {
        return {
          context,
          completed: false,
          apiCalls,
          finalResponse: '',
          error: 'Aborted',
        };
      }

      callbacks?.onToolStart?.(toolCall.name, toolCall.arguments);

      let resultMessage: ToolResultMessage;

      if (toolExecutor) {
        const toolTimeoutMs = (streamOptions?.toolTimeoutMs as number) ?? 60_000;
        let result;
        try {
          result = await withTimeout(
            toolExecutor(toolCall.name, toolCall.arguments, toolCall.id),
            toolTimeoutMs,
            `Tool "${toolCall.name}" timed out after ${toolTimeoutMs}ms`,
          );
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          result = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: [{ type: 'text' as const, text: errMsg }],
            isError: true,
          };
        }

        callbacks?.onToolEnd?.(result);

        resultMessage = {
          role: 'toolResult',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: result.content,
          isError: result.isError,
          timestamp: Date.now(),
        };
      } else {
        resultMessage = {
          role: 'toolResult',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: [
            {
              type: 'text',
              text: `Tool "${toolCall.name}" has no executor configured`,
            },
          ],
          isError: true,
          timestamp: Date.now(),
        };
      }

      context.messages.push(resultMessage);
    }
  }

  // Budget exhausted — sync best-effort before returning
  if (memoryManager && originalUserContent) {
    try {
      const syncTimeoutMs = (streamOptions?.memorySyncTimeoutMs as number) ?? 10_000;
      await withTimeout(
        memoryManager.syncAll(originalUserContent, '', ''),
        syncTimeoutMs,
        `Memory sync timed out after ${syncTimeoutMs}ms`,
      );
      memoryManager.queuePrefetchAll(originalUserContent, '');
    } catch (e) {
      console.warn('[AgentLoop] Memory sync failed:', e);
    }
  }

  return {
    context,
    completed: false,
    apiCalls,
    finalResponse: '',
    error: `Max iterations (${maxIterations}) exceeded`,
  };
}

/**
 * Stream LLM response while forwarding text deltas to callbacks.
 */
async function streamWithCallbacks(
  model: AgentConfig['model'],
  context: Context,
  callbacks: AgentCallbacks,
  options?: Record<string, unknown>,
): Promise<AssistantMessage> {
  const s = stream(model, context, options);

  for await (const event of s) {
    if (event.type === 'text_delta') {
      callbacks.onTextDelta?.(event.delta);
    } else if (event.type === 'error') {
      throw new HermesAgentError(
        event.error.errorMessage ?? 'Stream error',
        'API_ERROR',
      );
    }
  }

  return await s.result();
}

/**
 * Extract the final text from an assistant message.
 */
function extractText(message: AssistantMessage): string {
  return message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> =>
      block.type === 'text',
    )
    .map((block) => block.text)
    .join('');
}

/**
 * Create a ToolExecutor from a ToolRegistry.
 */
export function createToolExecutor(registry: ToolRegistry): ToolExecutor {
  return async (name, args, toolCallId) => {
    return registry.execute(name, args, toolCallId);
  };
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
