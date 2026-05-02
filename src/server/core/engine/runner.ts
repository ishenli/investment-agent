/**
 * Engine Runner
 *
 * 统一的路由层调用入口，通过 engineRegistry 获取对应引擎并执行。
 * 负责前置状态通知和统一异常兜底。
 */
import { SSEEmitter } from '@server/base/sseEmitter';
import { engineRegistry } from './registry';
import type { EngineType, EngineRunContext, EngineRunResult } from './types';
import logger from '@server/base/logger';

/**
 * 运行指定引擎
 *
 * @param engineType 引擎标识
 * @param ctx 运行上下文
 * @param emitter SSE 发射器
 * @returns 运行结果
 */
export async function runEngine(
  engineType: EngineType,
  ctx: EngineRunContext,
  emitter: SSEEmitter,
): Promise<EngineRunResult> {
  const engine = engineRegistry.get(engineType);
  if (!engine) {
    const msg = `引擎未注册: ${engineType}`;
    logger.error(`[EngineRunner] ${msg}`);
    emitter.sendAgentError(msg, 'engine_not_registered');
    return { content: '', completed: false, error: msg };
  }

  logger.info(`[EngineRunner] engine=${engineType} session=${ctx.sessionId} model=${ctx.model}`);
  emitter.sendStatus('Agent 开始执行', { id: ctx.messageId, level: 'info' });

  try {
    return await engine.run(ctx, emitter);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '引擎执行异常';
    logger.error(`[EngineRunner] engine=${engineType} error:`, msg);
    emitter.sendAgentError(msg, 'engine_runtime_error');
    return { content: '', completed: false, error: msg };
  }
}
