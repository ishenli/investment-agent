import { engineRegistry } from './registry';
import { HermesEngine } from '../agents/hermes/engine';
import { ClaudeEngine } from '../agents/claude/engine';

export type {
  IAgentEngine,
  EngineRunContext,
  EngineRunResult,
  EngineMessage,
  EngineType,
  ClaudeEngineExtra,
  HermesEngineExtra,
  EngineEventSink,
} from './types';
export { ENGINE_TYPES } from './types';
export { engineRegistry } from './registry';
export { HermesEngine } from '../agents/hermes/engine';
export { ClaudeEngine } from '../agents/claude/engine';
export { runEngine } from './runner';
export { NoOpEventSink, LoggingEventSink } from './eventSink';

/*
 * 在模块加载时自动注册所有内置引擎。
 * 这保证了一旦 import engine/ 中的任何导出，registry 就可直接使用。
 */
engineRegistry.register('hermes', new HermesEngine());
engineRegistry.register('claude', new ClaudeEngine());
