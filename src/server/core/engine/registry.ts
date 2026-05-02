/**
 * Agent Engine Registry
 *
 * 引擎注册表，根据 EngineType 获取对应的 IAgentEngine 实现。
 * Route 层通过 registry 获取引擎，避免 if/else 分支。
 */
import type { EngineType, IAgentEngine } from './types';

class EngineRegistry {
  private engines = new Map<EngineType, IAgentEngine>();

  register(type: EngineType, engine: IAgentEngine): void {
    this.engines.set(type, engine);
  }

  get(type: EngineType): IAgentEngine | undefined {
    return this.engines.get(type);
  }

  has(type: EngineType): boolean {
    return this.engines.has(type);
  }

  list(): EngineType[] {
    return Array.from(this.engines.keys());
  }
}

export const engineRegistry = new EngineRegistry();
