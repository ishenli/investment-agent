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
  registerSkillTools,
  type AgentCallbacks,
  type ToolCallResult,
  type AssistantMessage,
} from '@investment-agent/hermes-agent';
import { skillFileScanner } from '@server/lib/skill/SkillFileScanner';
import { skillRegistry } from '@server/lib/skill/SkillRegistry';
import { SSEEmitter } from '@server/base/sseEmitter';
import { resolveAgentModel } from '@server/service/agentModelResolver';
import { registerBusinessTools } from '@server/core/agents/hermes';
import { getProjectRoot } from '@server/base/env';
import { observabilityService } from '@server/service/observabilityService';
import { defaultModelPricing, getModelPricing } from '@server/config/modelPricing';
import logger from '@server/base/logger';
import path from 'path';
import type { IAgentEngine, EngineRunContext, EngineRunResult } from '@server/core/engine/types';

export class HermesEngine implements IAgentEngine {
  readonly name = 'hermes';

  async run(ctx: EngineRunContext, emitter: SSEEmitter): Promise<EngineRunResult> {
    const { model: modelSlug, provider = 'openai', messages, systemPrompt, signal, messageId, userId, extra, topicId } = ctx;
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
      // Respect UI-level skill enablement toggles.
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      // Reverse so that more specific/later skill roots override earlier ones
      // in registerSkillTools (user skills > bundled skills).
      registerSkillTools(registry, {
        skillRoots: [...skillFileScanner.getSkillRoots()].reverse(),
        localSkillsDir: skillFileScanner.ensureSkillsRoot(),
        sessionId: String(userId),
        enabledSlugs: enabledSkills.map((s) => s.id),
      });
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
    const platform = (extra?.platform as string) ?? 'web';
    const name = (extra?.name as string) ?? 'hermes';
    // 5. Observability callbacks (fire-and-forget)
    const observabilityCallbacks: AgentCallbacks = {
      onTraceStart: (trace) => {
        observabilityService.createTrace({ ...trace, sessionId: ctx.sessionId, topicId }).catch((err) =>
          logger.error('[HermesEngine] persist trace failed:', err),
        );
        emitter.send({ type: 'trace_start', ...trace, sessionId: ctx.sessionId, topicId });
      },
      onSpanStart: (span) => {
        observabilityService.createSpan(span).catch((err) =>
          logger.error('[HermesEngine] persist span failed:', err),
        );
        emitter.send({ type: 'span_start', ...span });
      },
      onSpanEnd: (span) => {
        observabilityService.updateSpan(span).catch((err) =>
          logger.error('[HermesEngine] update span failed:', err),
        );
        emitter.send({ type: 'span_end', ...span });
      },
      onTraceEnd: (trace) => {
        observabilityService.updateTrace({ ...trace, sessionId: ctx.sessionId, topicId }).catch((err) =>
          logger.error('[HermesEngine] update trace failed:', err),
        );
        emitter.send({ type: 'trace_end', ...trace, sessionId: ctx.sessionId, topicId });
      },
      onMetric: (metric) => {
        emitter.send({ type: 'metric', ...metric });
      },
    };

    // 6. 创建并运行 Agent
    const agent = new HermesAgent({
      model: piModel,
      name,
      systemPrompt,
      toolRegistry: registry,
      memoryDir: path.join(getProjectRoot(), 'workspace', String(userId), '.hermes', 'memories'),
      memorySessionId: String(userId),
      maxIterations,
      callbacks: {
        ...callbacks,
        ...observabilityCallbacks,
      },
      streaming: true,
      platform,
      loadContextFiles: false,
      streamOptions: {
        ...(apiKey ? { apiKey } : {}),
        signal,
      },
      observability: {
        enabled: true,
        sinks: [],
        callbacks: observabilityCallbacks,
        pricing: defaultModelPricing,
      },
    });

    const result = await agent.run({
      message: messages.findLast((m) => m.role === 'user')!.content,
      context: {
        systemPrompt: agent.getSystemPrompt(),
        messages: piMessages.slice(0, -1) as any,
      },
    });

    // 7. 发送最终结果
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
      usage: result.observability
        ? {
            input: result.observability.tokens.input,
            output: result.observability.tokens.output,
            total: result.observability.tokens.total,
            costUsd: result.observability.cost,
          }
        : undefined,
      apiCalls: result.apiCalls,
      observability: result.observability,
    };
  }
}
