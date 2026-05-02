/**
 * DeepAgents Engine
 *
 * IAgentEngine 实现，封装 LangChain DeepAgents 的调用逻辑。
 * 将 investmentAdvisorAgent.chat() 映射到统一的 engine.run() 接口。
 */
import { HumanMessage, AIMessage, type BaseMessage } from 'langchain';
import { SSEEmitter } from '@server/base/sseEmitter';
import { investmentAdvisorAgent } from './deepagents/investmentAdvisorAgent';
import type { IAgentEngine, EngineRunContext, EngineRunResult, DeepAgentsEngineExtra, EngineMessage } from '@server/core/engine/types';
import logger from '@server/base/logger';

export class DeepAgentsEngine implements IAgentEngine {
  readonly name = 'deepagents';

  async run(ctx: EngineRunContext, emitter: SSEEmitter): Promise<EngineRunResult> {
    const extra = (ctx.extra ?? {}) as DeepAgentsEngineExtra;
    const accountId = extra.accountId ?? String(ctx.userId);
    const model = ctx.model;

    const sourceMessages = extra.messages ?? ctx.messages;
    const userQuery =
      sourceMessages.findLast((m: EngineMessage) => m.role === 'user')?.content ?? '';

    const baseMessages: BaseMessage[] = sourceMessages
      .filter((m: EngineMessage) => m.role !== 'system')
      .map((m: EngineMessage) => {
        if (m.role === 'user') return new HumanMessage(m.content);
        return new AIMessage(m.content);
      })
      .filter((m: BaseMessage) => {
        const text = typeof m.content === 'string' ? m.content : '';
        return text.trim().length > 0;
      });

    logger.info(`[DeepAgentsEngine] accountId=${accountId} model=${model}`);

    try {
      await investmentAdvisorAgent.chat({
        messages: baseMessages,
        userQuery,
        accountId,
        emitter,
        model,
      });

      return {
        content: '',
        completed: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'DeepAgents 执行失败';
      logger.error('[DeepAgentsEngine] Error:', msg);
      return {
        content: '',
        completed: false,
        error: msg,
      };
    }
  }
}
