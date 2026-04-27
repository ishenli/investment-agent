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
  } = config;

  const budget = new IterationBudget(maxIterations);
  let apiCalls = 0;

  // Context compression (optional — only if model has a known context window)
  const compressor =
    model.contextWindow > 0
      ? new ContextCompressor({ contextLength: model.contextWindow })
      : null;

  while (!budget.exhausted) {
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
            return await streamWithCallbacks(model, context, callbacks);
          }
          return await complete(model, context);
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
      callbacks?.onToolStart?.(toolCall.name, toolCall.arguments);

      let resultMessage: ToolResultMessage;

      if (toolExecutor) {
        const result = await toolExecutor(
          toolCall.name,
          toolCall.arguments,
          toolCall.id,
        );

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

  // Budget exhausted
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
): Promise<AssistantMessage> {
  const s = stream(model, context);

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
