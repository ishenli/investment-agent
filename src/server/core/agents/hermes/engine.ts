/**
 * Hermes Agent Engine
 *
 * IAgentEngine 实现，封装 @investment-agent/hermes-agent 的调用逻辑。
 * 将 Hermes Agent 的回调事件映射为标准 SSE 事件。
 */
import {
  HermesAgent,
  ToolRegistry,
  registerBuiltinTools,
  type AgentCallbacks,
  type ToolCallResult,
  type AssistantMessage,
} from '@investment-agent/hermes-agent';
import { SSEEmitter } from '@server/base/sseEmitter';
import { resolveAgentModel } from '@server/service/agentModelResolver';
import { registerBusinessTools } from '@server/core/agents/hermes';
import { getProjectRoot } from '@server/base/env';
import logger from '@server/base/logger';
import path from 'path';
import type { IAgentEngine, EngineRunContext, EngineRunResult } from '@server/core/engine/types';

export class HermesEngine implements IAgentEngine {
  readonly name = 'hermes';

  async run(ctx: EngineRunContext, emitter: SSEEmitter): Promise<EngineRunResult> {
    const { model: modelSlug, provider = 'openai', messages, systemPrompt, signal, messageId, userId, extra } = ctx;
    const enableTools = (extra?.enableTools as boolean) ?? true;
    const maxIterations = (extra?.maxIterations as number) ?? 30;

    // 1. 解析模型配置
    emitter.sendStatus(`初始化模型 ${provider}/${modelSlug}`, {
      id: messageId,
      level: 'info',
    });

    const { model: piModel, apiKey } = await resolveAgentModel(userId, provider, modelSlug);

    // 2. 注册工具
    let registry: ToolRegistry | undefined;
    if (enableTools) {
      registry = ToolRegistry.create();
      registerBuiltinTools(registry, {
        enable: ['read_file', 'search_files', 'list_directory', 'web_search', 'web_fetch', 'think'],
      });
      registerBusinessTools(registry);
    }

    // 3. Build pi-ai message context
    const piMessages = messages.map((msg) => {
      if (msg.role === 'user') {
        return { role: 'user' as const, content: msg.content, timestamp: Date.now() };
      }
      return {
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: msg.content }],
        timestamp: Date.now(),
      };
    });

    // 4. Create callbacks → SSE events
    let emitterClosed = false;
    const callbacks: AgentCallbacks = {
      onTextDelta: async (delta: string) => {
        if (emitterClosed || signal.aborted) return;
        const sent = await emitter.sendTextDelta(messageId, delta);
        if (!sent) emitterClosed = true;
      },
      onToolStart: (name: string, args: Record<string, unknown>) => {
        if (emitterClosed) return;
        const toolId = `tool_${crypto.randomUUID()}`;
        emitter.sendToolUseEvent(toolId, name, args);
        emitter.sendStatus(`执行工具: ${name}`, { id: toolId, level: 'info', step: 'tool_start' });
      },
      onToolEnd: (result: ToolCallResult) => {
        if (emitterClosed) return;
        const statusMsg = result.isError ? `工具 ${result.toolName} 执行失败` : `工具 ${result.toolName} 执行成功`;
        emitter.sendStatus(statusMsg, { id: result.toolCallId, level: result.isError ? 'error' : 'info' });
      },
      onStep: (iteration: number, toolNames: string[]) => {
        if (emitterClosed) return;
        emitter.sendStatus(`迭代 #${iteration}: ${toolNames.join(', ') || '思考中...'}`, {
          id: messageId,
          level: 'debug',
          step: 'iteration',
          progress: iteration,
        });
      },
      onError: (error: Error) => {
        logger.warn('[HermesEngine] Error in loop:', error.message);
      },
    };

    // 5. 创建并运行 Agent
    const agent = new HermesAgent({
      model: piModel,
      systemPrompt,
      toolRegistry: registry,
      memoryDir: path.join(getProjectRoot(), 'workspace', String(userId), '.hermes', 'memories'),
      memorySessionId: String(userId),
      maxIterations,
      callbacks,
      streaming: true,
      platform: 'web',
      loadContextFiles: false,
      streamOptions: {
        ...(apiKey ? { apiKey } : {}),
        signal,
      },
    });

    const result = await agent.run({
      message: messages.findLast((m) => m.role === 'user')!.content,
      context: {
        systemPrompt: agent.getSystemPrompt(),
        messages: piMessages.slice(0, -1) as any, // pi-ai Message[] requires full provider metadata not available at input time
      },
    });

    // 6. 发送最终结果
    if (result.completed) {
      await emitter.sendTextDelta(messageId, '', true);

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
    }

    logger.info(`[HermesEngine] Completed: success=${result.completed} apiCalls=${result.apiCalls}`);

    return {
      content: result.finalResponse,
      completed: result.completed,
      error: result.completed ? undefined : (result.error ?? 'Agent 未能完成任务'),
    };
  }
}
