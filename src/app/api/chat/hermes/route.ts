/**
 * Hermes Agent Chat API Route
 *
 * 使用 @investment-agent/hermes-agent 包处理聊天请求
 * 支持 pi-ai 多 Provider（OpenAI、Anthropic、Google 等）
 * 通过 SSE 流式输出 AgentStreamEvent
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  HermesAgent,
  ToolRegistry,
  registerBuiltinTools,
  getModel,
  type KnownProvider,
  type AgentCallbacks,
  type ToolCallResult,
  type AssistantMessage,
} from '@investment-agent/hermes-agent';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import authService from '@server/service/authService';
import logger from '@server/base/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============== Request Schema ==============

const HermesChatRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  /** pi-ai provider name (e.g. 'openai', 'anthropic', 'google') */
  provider: z.string().default('openai'),
  /** Model ID within the provider */
  model: z.string().default('gpt-4o'),
  /** Custom system prompt */
  systemPrompt: z.string().optional(),
  /** Enable built-in tools (default: true) */
  enableTools: z.boolean().optional().default(true),
  /** Max tool-calling iterations */
  maxIterations: z.number().optional().default(30),
});

type HermesChatRequest = z.infer<typeof HermesChatRequestSchema>;

// ============== Controller ==============

class HermesAgentController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: NextRequest) {
    try {
      // 1. 参数验证
      const body = await this.validateBody(request, HermesChatRequestSchema);

      // 2. 提取最后一条用户消息
      const userMessage = body.messages.findLast((msg) => msg.role === 'user');
      if (!userMessage) {
        return this.error('未找到用户消息', 'no_user_message');
      }

      // 3. 用户认证
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 4. 创建 SSE Emitter
      const sseEmitter = new SSEEmitter();
      const messageId = `msg_${Date.now()}`;

      // 5. AbortController
      const abortController = new AbortController();
      request.signal.addEventListener('abort', () => {
        abortController.abort();
      });

      // 6. 后台异步执行 Agent
      (async () => {
        try {
          await runHermesAgent(body, sseEmitter, messageId);
        } catch (error) {
          logger.error('[HermesAgentController] Stream error:', error);
          await sseEmitter.sendAgentError(
            error instanceof Error ? error.message : 'Unknown error',
            'hermes_error',
          );
        } finally {
          await sseEmitter.sendDone();
          await sseEmitter.close();
        }
      })();

      return createSSEResponse(sseEmitter.readable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      logger.error('[HermesAgentController] Error:', error);
      return this.error('处理 Hermes 聊天请求时发生错误', 'hermes_chat_error');
    }
  }
}

// ============== Agent Execution ==============

async function runHermesAgent(
  body: HermesChatRequest,
  emitter: SSEEmitter,
  messageId: string,
): Promise<void> {
  const { provider, model: modelId, messages, systemPrompt, enableTools, maxIterations } = body;

  // 1. 创建 pi-ai Model
  emitter.sendStatus(`初始化模型 ${provider}/${modelId}`, {
    id: messageId,
    level: 'info',
  });

  let piModel;
  try {
    piModel = getModel(provider as KnownProvider, modelId as never);
  } catch (err) {
    throw new Error(`无法创建模型 ${provider}/${modelId}: ${err instanceof Error ? err.message : err}`);
  }

  // 2. 注册工具
  let registry: ToolRegistry | undefined;
  if (enableTools) {
    registry = ToolRegistry.create();
    registerBuiltinTools(registry);
  }

  // 3. 构造 pi-ai 消息历史
  // 将请求消息格式化为对话上下文供 Agent 理解
  const conversationContext = messages
    .map((msg) => {
      const roleLabel = msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'System';
      return `<${roleLabel}>\n${msg.content.trim()}\n</${roleLabel}>`;
    })
    .join('\n');

  const prompt = [
    '# 聊天记录',
    conversationContext,
    '# 用户问题',
    messages.findLast((m) => m.role === 'user')!.content,
  ].join('\n');

  // 4. 创建 Agent callbacks → SSE events
  const callbacks: AgentCallbacks = {
    onTextDelta: (delta: string) => {
      emitter.sendTextDelta(messageId, delta);
    },
    onToolStart: (name: string, args: Record<string, unknown>) => {
      const toolId = `tool_${Date.now()}`;
      emitter.sendToolUseEvent(toolId, name, args);
      emitter.sendStatus(`执行工具: ${name}`, {
        id: toolId,
        level: 'info',
        step: 'tool_start',
      });
    },
    onToolEnd: (result: ToolCallResult) => {
      const statusMsg = result.isError
        ? `工具 ${result.toolName} 执行失败`
        : `工具 ${result.toolName} 执行成功`;
      emitter.sendStatus(statusMsg, {
        id: result.toolCallId,
        level: result.isError ? 'error' : 'info',
      });
    },
    onStep: (iteration: number, toolNames: string[]) => {
      emitter.sendStatus(`迭代 #${iteration}: ${toolNames.join(', ') || '思考中...'}`, {
        id: messageId,
        level: 'debug',
        step: 'iteration',
        progress: iteration,
      });
    },
    onError: (error: Error) => {
      logger.warn('[HermesAgent] Error in loop:', error.message);
    },
  };

  // 5. 创建并运行 Agent
  const agent = new HermesAgent({
    model: piModel,
    systemPrompt,
    toolRegistry: registry,
    maxIterations,
    callbacks,
    streaming: true,
    platform: 'web',
    loadContextFiles: false,
  });

  emitter.sendStatus('Agent 开始执行', { id: messageId, level: 'info' });

  const result = await agent.run(prompt);

  // 6. 发送最终结果
  if (result.completed) {
    // 发送 isFinal 标记
    await emitter.sendTextDelta(messageId, '', true);

    // 发送 result 事件（含 token 用量）
    const lastAssistant = result.context.messages
      .filter((m): m is AssistantMessage => m.role === 'assistant')
      .pop();

    const usage = lastAssistant && 'usage' in lastAssistant ? lastAssistant.usage : undefined;

    await emitter.sendResult(messageId, result.finalResponse, usage ? {
      input: usage.input,
      output: usage.output,
      total: usage.totalTokens,
      costUsd: usage.cost?.total,
    } : undefined);
  } else {
    await emitter.sendAgentError(
      result.error ?? 'Agent 未能完成任务',
      'agent_incomplete',
      { apiCalls: result.apiCalls },
    );
  }

  logger.info(
    `[HermesAgent] Completed: success=${result.completed} apiCalls=${result.apiCalls}`,
  );
}

export const POST = HermesAgentController.POST;
