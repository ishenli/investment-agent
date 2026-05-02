/**
 * Claude Engine
 *
 * IAgentEngine 实现，封装 Claude Agent SDK 的调用逻辑。
 * 将 streamClaude() 的 ReadableStream 消费并映射为统一的 SSE 事件。
 */
import { SSEEmitter } from '@server/base/sseEmitter';
import { streamClaude } from './claudeClient';
import { getToolDisplayName } from './toolNameMapper';
import logger from '@server/base/logger';
import type {
  SSEEvent,
  TokenUsage,
  MessageContentBlock,
  ApiProvider,
  FileAttachment,
} from '@/types';
import type { IAgentEngine, EngineRunContext, EngineRunResult, ClaudeEngineExtra } from '@server/core/engine/types';

export class ClaudeEngine implements IAgentEngine {
  readonly name = 'claude';

  async run(ctx: EngineRunContext, emitter: SSEEmitter): Promise<EngineRunResult> {
    const extra = (ctx.extra ?? {}) as ClaudeEngineExtra;

    // --- build prompt from messages ---
    const userMessage = ctx.messages.findLast((m) => m.role === 'user');
    if (!userMessage) {
      throw new Error('ClaudeEngine: no user message found');
    }

    const content = ctx.messages
      .map((msg) => {
        const roleLabel =
          msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'System';
        return `<${roleLabel}>\n${msg.content.trim()}\n</${roleLabel}>`;
      })
      .join('\n');

    const prompt = ['# 聊天记录', content, '# 用户问题', userMessage.content].join('\n');

    // --- resolve provider ---
    const provider = extra.provider as ApiProvider | undefined;
    if (!provider) {
      throw new Error('ClaudeEngine: extra.provider is required');
    }

    // --- build system prompt ---
    const systemPrompt = extra.systemPromptOverride
      ? [extra.systemPromptOverride, ctx.systemPrompt].filter(Boolean).join('\n\n')
      : ctx.systemPrompt;

    // --- prepare abort controller ---
    const abortController = new AbortController();
    const listener = () => abortController.abort();
    ctx.signal.addEventListener('abort', listener);

    // --- map files ---
    const files = (extra.files ?? []).map((f) => ({
      name: f.fileName,
      data: f.fileContent,
      type: f.mimeType || 'application/octet-stream',
      filePath: f.filePath,
    })) as FileAttachment[];

    try {
      const stream = streamClaude({
        prompt,
        sessionId: ctx.sessionId,
        sdkSessionId: undefined,
        model: ctx.model,
        systemPrompt: systemPrompt || undefined,
        workingDirectory: extra.workingDirectory,
        mcpServers: extra.mcpServers as Record<string, any> | undefined,
        abortController,
        permissionMode: (extra.permissionMode as 'code' | 'plan' | 'ask') || 'code',
        files,
        toolTimeoutSeconds: extra.toolTimeout ?? 600,
        provider,
        settings: {},
        allowedTools: extra.allowedTools as string[] | undefined,
        updateSdkSessionId: (_id: string, _newSdkSessionId: string) => {
          // TODO: persist SDK session ID to DB
        },
      });

      const { content: finalContent, usage } = await this.consumeStream(stream, emitter, ctx.messageId);

      return {
        content: finalContent,
        completed: true,
        usage: usage
          ? {
              input: usage.input_tokens,
              output: usage.output_tokens,
              total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
              costUsd: usage.cost_usd,
            }
          : undefined,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Claude engine execution failed';
      logger.error('[ClaudeEngine] Error:', msg);
      return {
        content: '',
        completed: false,
        error: msg,
      };
    } finally {
      ctx.signal.removeEventListener('abort', listener);
    }
  }

  private async consumeStream(
    stream: ReadableStream<string>,
    emitter: SSEEmitter,
    messageId: string,
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    const reader = stream.getReader();
    let currentText = '';
    let tokenUsage: TokenUsage | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = value.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'text': {
                currentText += event.data;
                await emitter.sendTextDelta(messageId, event.data);
                break;
              }
              case 'tool_use': {
                try {
                  const toolData = JSON.parse(event.data);
                  const displayName = getToolDisplayName(toolData.name, 'zh-CN', true);
                  await emitter.sendToolUseEvent(toolData.id, displayName, toolData.input);
                  await emitter.sendStatus(`tool ${toolData.name} started`, {
                    id: toolData.id,
                    level: 'info',
                    step: 'tool_start',
                  });
                } catch {
                  // ignore malformed tool_use
                }
                break;
              }
              case 'tool_result': {
                try {
                  const resultData = JSON.parse(event.data);
                  const statusMsg = resultData.is_error
                    ? `执行失败: ${resultData.content?.substring(0, 100) || '未知错误'}`
                    : '执行成功';
                  await emitter.sendStatus(statusMsg, {
                    id: resultData.tool_use_id,
                    level: resultData.is_error ? 'error' : 'info',
                  });
                } catch {
                  // ignore malformed tool_result
                }
                break;
              }
              case 'tool_output': {
                await emitter.sendStatus(event.data, {
                  id: messageId,
                  level: 'debug',
                  step: 'tool_output',
                });
                break;
              }
              case 'status': {
                try {
                  const statusData = JSON.parse(event.data);
                  if (statusData.session_id) {
                    logger.info(`[ClaudeEngine] SDK session: ${statusData.session_id}`);
                  }
                  await emitter.sendStatus('Claude SDK 已初始化', {
                    id: messageId,
                    level: 'info',
                  });
                } catch {
                  // ignore
                }
                break;
              }
              case 'result': {
                try {
                  const resultData = JSON.parse(event.data);
                  if (resultData.usage) {
                    tokenUsage = resultData.usage;
                  }
                } catch {
                  // ignore
                }
                break;
              }
              case 'error': {
                await emitter.sendAgentEvent({
                  type: 'error',
                  message: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
                  code: 'claude_sdk_error',
                });
                break;
              }
              case 'permission_request': {
                try {
                  const permData = JSON.parse(event.data);
                  await emitter.sendAgentEvent({
                    type: 'permission_request',
                    permissionRequestId: permData.permissionRequestId,
                    toolName: permData.toolName,
                    toolInput: permData.toolInput,
                    suggestions: permData.suggestions,
                    decisionReason: permData.decisionReason,
                    blockedPath: permData.blockedPath,
                    toolUseId: permData.toolUseId,
                    description: permData.description,
                  });
                  await emitter.sendStatus(`需要授权: ${permData.toolName}`, {
                    id: messageId,
                    level: 'warning',
                    step: 'permission_request',
                  });
                } catch {
                  // ignore
                }
                break;
              }
              default:
                break;
            }
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    } catch (error) {
      logger.error('[ClaudeEngine] Stream error:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }

    return { content: currentText, usage: tokenUsage };
  }
}
