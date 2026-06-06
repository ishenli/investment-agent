/**
 * Hermes Agent Engine
 *
 * IAgentEngine 实现，封装 @investment-agent/hermes-agent 的调用逻辑。
 * 将 Hermes Agent 的回调事件映射到 EngineEventSink 接口。
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
import { resolveAgentModel } from '@server/service/agentModelResolver';
import { skillService } from '@server/service/skillService';
import { registerBusinessTools } from '@server/core/agents/hermes';
import { getProjectRoot, getProjectDir } from '@server/base/env';
import { observabilityService } from '@server/service/observabilityService';
import { defaultModelPricing } from '@server/config/modelPricing';
import logger from '@server/base/logger';
import path from 'path';
import type { IAgentEngine, EngineRunContext, EngineRunResult, EngineEventSink } from '@server/core/engine/types';
import type { ConfirmationRequest } from '@investment-agent/hermes-agent';
import { registerHermesPermission } from './permissionRegistry';

export class HermesEngine implements IAgentEngine {
  readonly name = 'hermes';

 async run(ctx: EngineRunContext, eventSink: EngineEventSink): Promise<EngineRunResult> {
   const { model: modelSlug, provider = 'openai', messages, systemPrompt, signal, messageId, userId, extra, topicId } = ctx;

   // 1. 解析模型配置
    const enableTools = (extra?.enableTools as boolean) ?? true;
    const maxIterations = (extra?.maxIterations as number) ?? 30;
    const permissionLevel = (extra?.permissionLevel as 'safe' | 'auto' | 'full-access') ?? 'auto';
    const platform = (extra?.platform as string) ?? 'web';

    await eventSink.sendStatus(`初始化模型 ${provider}/${modelSlug}`, {
      id: messageId,
      level: 'info',
    });

    const { model: piModel, apiKey } = await resolveAgentModel(userId, provider, modelSlug);

    logger.info(`[HermesEngine] Resolved model: id=${piModel.id} api=${piModel.api} provider=${piModel.provider} baseUrl=${piModel.baseUrl} apiKey=${apiKey ? '***' : 'NONE'}`);

    // 2. 注册工具
    const userSkillsDir = skillFileScanner.ensureUserSkillsRoot(userId);
    const handleSkillChanged = async (event: { slug: string }) => {
      await skillService.ensureSkillRecord(userId, event.slug);
      skillRegistry.invalidate(userId);
      await skillService.syncDeployment(userId);
    };

    let registry: ToolRegistry | undefined;
    if (enableTools) {
      registry = ToolRegistry.create();
      registerBuiltinTools(registry, {
        enable: ['read_file', 'search_files', 'list_directory', 'web_search', 'web_fetch', 'think'],
      });
      registerBusinessTools(
        registry,
        { exclude: platform !== 'web' ? ['create_ui_artifact'] : [] },
        eventSink,
      );
      // Respect UI-level skill enablement toggles.
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      // Reverse so that more specific/later skill roots override earlier ones
      // in registerSkillTools (user skills > bundled skills).
      registerSkillTools(registry, {
        skillRoots: [...skillFileScanner.getSkillRoots(userSkillsDir)].reverse(),
        localSkillsDir: userSkillsDir,
        sessionId: String(userId),
        enabledSlugs: enabledSkills.map((s) => s.id),
        onSkillChanged: handleSkillChanged,
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

    // 4. Create callbacks → eventSink events
    let emitterClosed = false;
    const callbacks: AgentCallbacks = {
      onTextDelta: async (delta: string) => {
        if (emitterClosed || signal.aborted) return;
        const sent = await eventSink.sendTextDelta(messageId, delta);
        if (!sent) emitterClosed = true;
      },
      onToolStart: (name: string, args: Record<string, unknown>) => {
        if (emitterClosed) return;
        const toolId = `tool_${crypto.randomUUID()}`;
        eventSink.sendToolUseEvent(toolId, name, args);
        eventSink.sendStatus(`执行工具: ${name}`, { id: toolId, level: 'info', step: 'tool_start' });
      },
      onToolEnd: (result: ToolCallResult) => {
        if (emitterClosed) return;
        const statusMsg = result.isError ? `工具 ${result.toolName} 执行失败` : `工具 ${result.toolName} 执行成功`;
        eventSink.sendStatus(statusMsg, { id: result.toolCallId, level: result.isError ? 'error' : 'info' });
      },
      onStep: (iteration: number, toolNames: string[]) => {
        if (emitterClosed) return;
        eventSink.sendStatus(`迭代 #${iteration}: ${toolNames.join(', ') || '思考中...'}`, {
          id: messageId,
          level: 'debug',
          step: 'iteration',
          progress: iteration,
        });
      },
      onError: (error: Error) => {
        logger.error('[HermesEngine] Error in agent loop:', {
          errorMessage: error.message,
          errorStack: error.stack?.split('\n').slice(0, 3).join(' | '),
        });
      },
      onConfirmationRequest: async (request: ConfirmationRequest) => {
        const permissionId = `hermes_perm_${crypto.randomUUID()}`;
        const toolUseId = `tool_${crypto.randomUUID()}`;

        await eventSink.send({
          type: 'permission_request',
          permissionRequestId: permissionId,
          toolName: request.toolName,
          toolInput: request.args,
          toolUseId,
          description: `工具 "${request.toolName}" 需要确认执行`,
        });

        const decision = await registerHermesPermission(permissionId, request.toolName, signal);
        return decision === 'allow' ? 'confirm' : 'decline';
      },
    };

    // 5. Observability callbacks (fire-and-forget)
    const observabilityCallbacks: AgentCallbacks = {
      onTraceStart: (trace) => {
        observabilityService.createTrace({ ...trace, sessionId: ctx.sessionId, topicId }).catch((err) =>
          logger.error('[HermesEngine] persist trace failed:', err),
        );
        const sessionId = ctx.sessionId;
        const tid = topicId;
        eventSink.send({ type: 'trace_start', ...trace, sessionId, topicId: tid } as any);
      },
      onSpanStart: (span) => {
        observabilityService.createSpan(span).catch((err) =>
          logger.error('[HermesEngine] persist span failed:', err),
        );
        eventSink.send({ type: 'span_start', ...span } as any);
      },
      onSpanEnd: (span) => {
        observabilityService.updateSpan(span).catch((err) =>
          logger.error('[HermesEngine] update span failed:', err),
        );
        eventSink.send({ type: 'span_end', ...span } as any);
      },
      onTraceEnd: (trace) => {
        observabilityService.updateTrace({ ...trace, sessionId: ctx.sessionId, topicId }).catch((err) =>
          logger.error('[HermesEngine] update trace failed:', err),
        );
        const sessionId = ctx.sessionId;
        const tid = topicId;
        eventSink.send({ type: 'trace_end', ...trace, sessionId, topicId: tid } as any);
      },
      onMetric: (metric) => {
        eventSink.send({ type: 'metric', ...metric } as any);
      },
    };

    // 6. 创建并运行 Agent
    const name = (extra?.name as string) ?? 'hermes';
    const agent = new HermesAgent({
      model: piModel,
      name,
      systemPrompt,
      toolRegistry: registry,
      permissionLevel,
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
        level: 'debug',
        sinks: [],
        callbacks: observabilityCallbacks,
        pricing: defaultModelPricing,
      },
      reflectionConfig: {
        enabled: true,
        backgroundMode: true,
        frameworksPath: path.join(
          getProjectDir(),
          'packages/hermes-agent/src/reflection/frameworks/investment-analysis.json',
        ),
        localSkillsDir: userSkillsDir,
        onSkillChanged: handleSkillChanged,
      },
    });

    logger.info(`[HermesEngine] Starting agent.run() with ${piMessages.length} messages`);

    let result;
    try {
      result = await agent.run({
        message: messages.findLast((m) => m.role === 'user')!.content,
        context: {
          systemPrompt: agent.getSystemPrompt(),
          messages: piMessages.slice(0, -1) as any,
        },
      });
    } catch (runError) {
      logger.error(`[HermesEngine] agent.run() threw:`, runError);
      throw runError;
    }

    logger.info(`[HermesEngine] agent.run() returned: completed=${result.completed} apiCalls=${result.apiCalls} error=${result.error ?? 'none'} finalResponse.length=${result.finalResponse?.length ?? 0}`);

    // Debug: log last assistant message from context
    const contextMessages = result.context?.messages ?? [];
    const lastAssistantMsg = contextMessages.filter((m: any) => m.role === 'assistant').pop();
    if (lastAssistantMsg) {
      logger.info(`[HermesEngine] Last assistant msg content: ${JSON.stringify(lastAssistantMsg.content)?.slice(0, 500)}`);
    } else {
      logger.warn(`[HermesEngine] No assistant message found in context (total messages: ${contextMessages.length})`);
    }

    // 7. 发送最终结果
    if (result.completed) {
      await eventSink.sendTextDelta(messageId, '', true);

      const lastAssistant = result.context.messages
        .filter((m): m is AssistantMessage => m.role === 'assistant')
        .pop();
      const usage = lastAssistant && 'usage' in lastAssistant ? lastAssistant.usage : undefined;

      await eventSink.sendResult(messageId, result.finalResponse, usage ? {
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
