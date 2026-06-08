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
import { defaultPermissionPolicy } from './permission/policy';
import type { ToolCategory, ConfirmationRequest, ConfirmationResult } from './permission/types';
import { defaultContentGuard } from './guard/content-validator';
import { defaultAuditLogger } from './guard/audit-logger';
import { ContextCompressor } from './context';
import { buildMemoryContextBlock } from './memory-manager';
import type { AgentConfig, AgentCallbacks, HermesAgentResult, ToolExecutor } from './types';
import { ToolRegistry } from './tools';
import type { TraceContext, Tracer, MetricsCollector, CostTracker } from './observability';

const skillToolActions: Record<string, string> = {
  skills_list: 'list',
  skill_view: 'view',
  skill_manage: 'manage',
};

const buildSkillAttributes = (toolCall: ToolCall): Record<string, unknown> => {
  const skillName =
    toolCall.name === 'skills_list' ? toolCall.arguments.category : toolCall.arguments.name;

  return {
    tool: toolCall.name,
    skillTool: true,
    skillAction: skillToolActions[toolCall.name],
    ...(skillName ? { skillName: String(skillName) } : {}),
    ...(toolCall.arguments.file_path
      ? { skillFilePath: String(toolCall.arguments.file_path) }
      : {}),
  };
};

/**
 * Run the agent loop: call LLM → execute tools → repeat until done.
 */
export async function runAgentLoop(
  config: AgentConfig,
  context: Context,
  traceCtx?: TraceContext,
  tracer?: Tracer,
  metrics?: MetricsCollector,
  costTracker?: CostTracker,
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

  // Helper: truncate long text for span attributes
  const summarize = (text: string, maxLen = 250): string => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  // Helper: extract full prompt from context messages
  const extractFullPrompt = (messages: Context['messages']): string => {
    return messages
      .map((m) => {
        if (typeof m.content === 'string') return `[${m.role}]: ${m.content}`;
        if (Array.isArray(m.content)) {
          const textParts = m.content.filter((b: any) => b.type === 'text').map((b: any) => b.text);
          return `[${m.role}]: ${textParts.join(' ')}`;
        }
        return `[${m.role}]: [non-text content]`;
      })
      .join('\n\n');
  };

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
        (m) =>
          !(
            m.role === 'user' &&
            typeof m.content === 'string' &&
            m.content.startsWith('<memory-context>')
          ),
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
            if (
              m.role === 'user' &&
              typeof m.content === 'string' &&
              m.content === originalUserContent
            ) {
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

    // Record iteration metrics
    if (traceCtx && metrics) {
      metrics.recordIteration(traceCtx, budget.used, budget.remaining);
    }

    apiCalls++;

    // Call LLM with retry (instrumented)
    let response: AssistantMessage;
    const llmSpan =
      traceCtx && tracer
        ? tracer.startSpan(traceCtx, 'llm_call', 'client', { model: model.name })
        : undefined;
    const llmStartTime = Date.now();

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
      const durationMs = Date.now() - llmStartTime;
      if (llmSpan && traceCtx && tracer) {
        tracer.endSpan(llmSpan, { status: 'error' });
      }
      if (traceCtx && metrics) {
        metrics.recordLlmLatency(traceCtx, durationMs, model.name);
      }
      return {
        context,
        completed: false,
        apiCalls,
        finalResponse: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const llmDurationMs = Date.now() - llmStartTime;

    // Record LLM usage and cost
    if (response.usage) {
      if (traceCtx && metrics) {
        metrics.recordTokens(
          traceCtx,
          {
            input: response.usage.input,
            output: response.usage.output,
            total: response.usage.totalTokens,
          },
          model.name,
        );
        metrics.recordLlmLatency(traceCtx, llmDurationMs, model.name);
      }
      if (traceCtx && costTracker && response.usage.totalTokens) {
        costTracker.recordCall(traceCtx, model.name, {
          input: response.usage.input,
          output: response.usage.output,
        });
      }
      if (llmSpan && traceCtx && tracer) {
        tracer.endSpan(llmSpan, {
          status: 'ok',
          tokenInput: response.usage.input,
          tokenOutput: response.usage.output,
          attributes: {
            model: model.name,
            messageCount: context.messages.length,
            promptSummary: summarize(originalUserContent || ''),
            responseSummary: summarize(extractText(response)),
            prompt: extractFullPrompt(context.messages),
            response: extractText(response),
          },
        });
      }
    } else {
      if (llmSpan && traceCtx && tracer) {
        tracer.endSpan(llmSpan, {
          status: 'ok',
          attributes: {
            model: model.name,
            messageCount: context.messages.length,
            promptSummary: summarize(originalUserContent || ''),
            responseSummary: summarize(extractText(response)),
            prompt: extractFullPrompt(context.messages),
            response: extractText(response),
            noUsage: true,
          },
        });
      }
      if (traceCtx && metrics) {
        metrics.recordLlmLatency(traceCtx, llmDurationMs, model.name);
      }
    }

    // Add assistant message to context
    context.messages.push(response);

    // Context compression: check if we need to compact
    if (compressor && response.usage) {
      const tokensBefore = response.usage.input;
      compressor.updateFromResponse(response.usage);
      if (compressor.shouldCompress()) {
        const compressionSpan =
          traceCtx && tracer
            ? tracer.startSpan(traceCtx, 'context_compression', 'internal')
            : undefined;
        context.messages = await compressor.compress(context.messages, model, response.usage.input);
        const tokensAfter = estimateMessageTokens(context.messages);
        if (traceCtx && metrics) {
          metrics.recordCompression(traceCtx, tokensBefore, tokensAfter);
        }
        if (compressionSpan && traceCtx && tracer) {
          tracer.addEvent(compressionSpan, 'compression', {
            tokensBefore,
            tokensAfter,
            saved: Math.max(0, tokensBefore - tokensAfter),
          });
          tracer.endSpan(compressionSpan);
        }
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

      const result: HermesAgentResult = {
        context,
        completed: true,
        apiCalls,
        finalResponse: finalText,
      };

      try {
        await callbacks?.onTurnEnd?.(result);
      } catch {
        // Reflection callbacks must not block the main result
      }

      return result;
    }

    // Notify step callback
    callbacks?.onStep?.(
      budget.used,
      toolCalls.map((tc) => tc.name),
    );

    // Permission configuration (constant per turn)
    const permissionLevel = config.permissionLevel ?? 'auto';
    const CONFIRMATION_TIMEOUT_MS = 60_000;

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

      // ============== Permission & Content Guard Check ==============
      const toolCategory: ToolCategory = config.toolRegistry?.getCategory(toolCall.name) ?? 'write';
      const policy = defaultPermissionPolicy.evaluate(toolCategory, permissionLevel);

      defaultAuditLogger.log({
        toolName: toolCall.name,
        toolCategory,
        permissionLevel,
        policy,
        decision: policy === 'deny' ? 'denied' : 'allowed',
        reason:
          policy === 'deny'
            ? `Permission level ${permissionLevel} denies ${toolCategory} operations`
            : undefined,
      });

      if (policy === 'deny') {
        const msg = `Permission denied: Tool "${toolCall.name}" (${toolCategory}) is not allowed at ${permissionLevel} permission level.`;
        context.messages.push(buildBlockedResult(toolCall, msg, callbacks));
        continue;
      }

      if (policy === 'confirm' && callbacks?.onConfirmationRequest) {
        const confirmationRequest: ConfirmationRequest = {
          toolName: toolCall.name,
          args: toolCall.arguments,
          permissionLevel,
          toolCategory,
          timestamp: Date.now(),
        };

        let confirmed = false;
        try {
          const result = await withTimeout<ConfirmationResult>(
            callbacks.onConfirmationRequest(confirmationRequest),
            CONFIRMATION_TIMEOUT_MS,
            `Confirmation timeout for "${toolCall.name}"`,
          );
          confirmed = result === 'confirm';

          defaultAuditLogger.log({
            toolName: toolCall.name,
            toolCategory,
            permissionLevel,
            policy: 'confirm',
            decision: confirmed ? 'allowed' : 'denied',
            confirmationRequested: true,
            confirmationResult: result,
            reason: confirmed ? undefined : 'User declined',
          });
        } catch {
          defaultAuditLogger.log({
            toolName: toolCall.name,
            toolCategory,
            permissionLevel,
            policy: 'confirm',
            decision: 'denied',
            confirmationRequested: true,
            confirmationResult: 'decline',
            reason: 'Confirmation timeout or error',
          });

          context.messages.push(
            buildBlockedResult(
              toolCall,
              `Confirmation timeout for "${toolCall.name}". Operation cancelled.`,
              callbacks,
            ),
          );
          continue;
        }

        if (!confirmed) {
          context.messages.push(
            buildBlockedResult(
              toolCall,
              `User declined execution of "${toolCall.name}".`,
              callbacks,
            ),
          );
          continue;
        }
      }

      // Content Guard: validate system-category tools for dangerous commands
      if (toolCategory === 'system') {
        const command = toolCall.arguments.command ?? toolCall.arguments.cmd;
        if (command) {
          const guardDecision = defaultContentGuard.validateCommand(
            String(command),
            toolCall.arguments.workdir ? String(toolCall.arguments.workdir) : undefined,
          );
          if (!guardDecision.allowed) {
            defaultAuditLogger.log({
              toolName: toolCall.name,
              toolCategory,
              permissionLevel,
              policy,
              decision: 'denied',
              reason: guardDecision.reason,
              contentGuardPattern: guardDecision.pattern,
            });
            context.messages.push(
              buildBlockedResult(
                toolCall,
                `Content guard blocked: ${guardDecision.reason}`,
                callbacks,
              ),
            );
            continue;
          }
        }
      }

      // Content Guard: validate write-category tools for sensitive file paths
      if (toolCategory === 'write') {
        const filePath =
          toolCall.arguments.filePath ?? toolCall.arguments.file_path ?? toolCall.arguments.path;
        if (filePath) {
          const guardDecision = defaultContentGuard.validateFilePath(String(filePath));
          if (!guardDecision.allowed) {
            defaultAuditLogger.log({
              toolName: toolCall.name,
              toolCategory,
              permissionLevel,
              policy,
              decision: 'denied',
              reason: guardDecision.reason,
              contentGuardPattern: guardDecision.pattern,
            });
            context.messages.push(
              buildBlockedResult(
                toolCall,
                `Content guard blocked: ${guardDecision.reason}`,
                callbacks,
              ),
            );
            continue;
          }
        }
      }

      // ============== Execute Tool ==============
      let resultMessage: ToolResultMessage;
      const isSkillTool = toolCall.name in skillToolActions;
      const toolSpan =
        traceCtx && tracer
          ? tracer.startSpan(
              traceCtx,
              isSkillTool ? 'skill_use' : 'tool_call',
              'internal',
              isSkillTool ? buildSkillAttributes(toolCall) : { tool: toolCall.name },
            )
          : undefined;
      const toolStartTime = Date.now();

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

        const toolDurationMs = Date.now() - toolStartTime;
        if (traceCtx && metrics) {
          metrics.recordToolLatency(traceCtx, toolDurationMs, toolCall.name);
        }
        if (toolSpan && traceCtx && tracer) {
          const resultTexts = result.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ');
          tracer.endSpan(toolSpan, {
            status: result.isError ? 'error' : 'ok',
            attributes: {
              ...(isSkillTool ? buildSkillAttributes(toolCall) : { tool: toolCall.name }),
              args: summarize(JSON.stringify(toolCall.arguments)),
              argsFull: JSON.stringify(toolCall.arguments, null, 2),
              isError: result.isError,
              resultSummary: summarize(resultTexts),
              resultFull: resultTexts,
            },
          });
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
        const toolDurationMs = Date.now() - toolStartTime;
        if (traceCtx && metrics) {
          metrics.recordToolLatency(traceCtx, toolDurationMs, toolCall.name);
        }
        if (toolSpan && traceCtx && tracer) {
          tracer.endSpan(toolSpan, {
            status: 'error',
            attributes: {
              ...(isSkillTool ? buildSkillAttributes(toolCall) : { tool: toolCall.name }),
              args: summarize(JSON.stringify(toolCall.arguments)),
              argsFull: JSON.stringify(toolCall.arguments, null, 2),
              error: 'no executor',
            },
          });
        }

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

  const result: HermesAgentResult = {
    context,
    completed: false,
    apiCalls,
    finalResponse: '',
    error: `Max iterations (${maxIterations}) exceeded`,
  };

  try {
    await callbacks?.onTurnEnd?.(result);
  } catch {
    // Reflection callbacks must not block the main result
  }

  return result;
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
      throw new HermesAgentError(event.error.errorMessage ?? 'Stream error', 'API_ERROR');
    }
  }

  return await s.result();
}

/**
 * Extract the final text from an assistant message.
 */
function extractText(message: AssistantMessage): string {
  return message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * Build a blocked tool result message and notify callbacks.
 */
function buildBlockedResult(
  toolCall: ToolCall,
  text: string,
  callbacks?: AgentCallbacks,
): ToolResultMessage {
  const content = [{ type: 'text' as const, text }];
  callbacks?.onToolEnd?.({
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content,
    isError: true,
  });
  return {
    role: 'toolResult',
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content,
    isError: true,
    timestamp: Date.now(),
  };
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

// ============== Observability helpers (moved from context.ts to avoid import cycle) ==============

function estimateMessageTokens(messages: Array<{ role: string; content: unknown }>): number {
  const CHARS_PER_TOKEN = 4;
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += Math.ceil(msg.content.length / CHARS_PER_TOKEN) + 10;
    }
  }
  return total;
}
