/**
 * HermesAgent — main entry point.
 *
 * A clean wrapper around the agent loop with a simple API:
 *   const agent = new HermesAgent({ model: getModel('openai', 'gpt-4o'), tools });
 *   const result = await agent.run('What is 2+2?');
 */

import type { Context, Tool, UserMessage, Api, Model } from '@mariozechner/pi-ai';
import { runAgentLoop, createToolExecutor } from './loop';
import { buildSystemPrompt, type PromptBuilderConfig } from './prompt';
import { ToolRegistry } from './tools';
import { MemoryManager } from './memory-manager';
import type {
  AgentCallbacks,
  HermesAgentInput,
  HermesAgentResult,
  ToolExecutor,
  AgentConfig,
} from './types';

export interface HermesAgentConfig {
  /** pi-ai Model instance (from getModel) */
  model: Model<Api>;
  /** Agent name for identification (default: 'hermes') */
  name?: string;
  /** Custom system prompt (appended to identity + context files) */
  systemPrompt?: string;
  /** Custom identity (replaces default agent identity) */
  identity?: string;
  /** Platform hint for formatting ('cli', 'telegram', 'web', etc.) */
  platform?: string;
  /** Working directory for context file discovery */
  cwd?: string;
  /** Whether to auto-load context files (default: true) */
  loadContextFiles?: boolean;
  /** Whether to include tool-use enforcement (default: true) */
  toolEnforcement?: boolean;
  /** Memory block to inject into system prompt */
  memoryBlock?: string;
  /** MemoryManager for provider-based memory (alternative to memoryBlock) */
  memoryManager?: MemoryManager;
  /** Tools available to the agent (pi-ai Tool array) */
  tools?: Tool[];
  /** Tool registry (alternative to tools + toolExecutor) */
  toolRegistry?: ToolRegistry;
  /** Custom tool executor */
  toolExecutor?: ToolExecutor;
  /** Maximum tool-calling iterations (default: 90) */
  maxIterations?: number;
  /** Event callbacks */
  callbacks?: AgentCallbacks;
  /** Whether to use streaming (default: true) */
  streaming?: boolean;
  /** Options forwarded to pi-ai stream()/complete() calls (apiKey, etc.) */
  streamOptions?: Record<string, unknown>;
}

export class HermesAgent {
  private readonly config: HermesAgentConfig;
  private readonly tools: Tool[];
  private readonly toolExecutor?: ToolExecutor;
  private cachedSystemPrompt: string | null = null;
  private readonly memoryManager?: MemoryManager;

  constructor(config: HermesAgentConfig) {
    this.config = config;
    this.memoryManager = config.memoryManager;

    // Resolve tools from either direct tools array or registry
    if (config.toolRegistry) {
      this.tools = config.toolRegistry.getDefinitions();
      this.toolExecutor =
        config.toolExecutor ?? createToolExecutor(config.toolRegistry);
    } else {
      this.tools = config.tools ?? [];
      this.toolExecutor = config.toolExecutor;
    }
  }

  /**
   * Run a conversation turn. Accepts a string or structured input.
   */
  async run(input: string | HermesAgentInput): Promise<HermesAgentResult> {
    // Reset prompt cache if memory manager content has changed
    if (this.memoryManager?.hasChanged()) {
      this.resetSystemPrompt();
    }

    const context = this.buildContext(input);

    const agentConfig: AgentConfig = {
      name: this.config.name ?? 'hermes',
      model: this.config.model,
      systemPrompt: this.getSystemPrompt(),
      tools: this.tools,
      toolExecutor: this.toolExecutor,
      maxIterations: this.config.maxIterations ?? 90,
      callbacks: this.config.callbacks,
      streaming: this.config.streaming ?? true,
      streamOptions: this.config.streamOptions,
    };

    return runAgentLoop(agentConfig, context);
  }

  /**
   * Get the assembled system prompt (built once, cached for prefix cache reuse).
   */
  getSystemPrompt(): string {
    if (this.cachedSystemPrompt === null) {
      // If MemoryManager is available, use its system prompt block
      let memoryBlock = this.config.memoryBlock;
      if (!memoryBlock && this.memoryManager) {
        memoryBlock = this.memoryManager.buildSystemPrompt();
      }

      const promptConfig: PromptBuilderConfig = {
        identity: this.config.identity,
        systemPrompt: this.config.systemPrompt,
        platform: this.config.platform,
        cwd: this.config.cwd,
        loadContextFiles: this.config.loadContextFiles,
        toolEnforcement: this.config.toolEnforcement,
        memoryBlock,
        toolNames: this.tools.map((t) => t.name),
      };
      this.cachedSystemPrompt = buildSystemPrompt(promptConfig);
    }
    return this.cachedSystemPrompt;
  }

  /** Invalidate cached system prompt (e.g. after context compression). */
  resetSystemPrompt(): void {
    this.cachedSystemPrompt = null;
  }

  private buildContext(input: string | HermesAgentInput): Context {
    const systemPrompt = this.getSystemPrompt();

    if (typeof input === 'string') {
      return {
        systemPrompt,
        messages: [
          { role: 'user', content: input, timestamp: Date.now() },
        ],
        tools: this.tools,
      };
    }

    const userMessage: UserMessage =
      typeof input.message === 'string'
        ? { role: 'user', content: input.message, timestamp: Date.now() }
        : input.message;

    if (input.context) {
      const context: Context = { ...input.context };
      context.messages = [...context.messages, userMessage];
      context.tools = this.tools;
      return context;
    }

    return {
      systemPrompt,
      messages: [userMessage],
      tools: this.tools,
    };
  }

  get name(): string {
    return this.config.name ?? 'hermes';
  }

  get maxIterations(): number {
    return this.config.maxIterations ?? 90;
  }

  /** Access the MemoryManager (if configured). */
  getMemoryManager(): MemoryManager | undefined {
    return this.memoryManager;
  }
}
