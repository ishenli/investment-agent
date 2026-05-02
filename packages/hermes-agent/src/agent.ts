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
import { BuiltinMemoryProvider } from './builtin-tools/builtin-memory-provider';
import { memorySchema } from './builtin-tools/memory';
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
  /**
   * Directory for built-in file-backed memory (MEMORY.md / USER.md).
   * If provided, auto-initializes BuiltinMemoryProvider + MemoryManager and
   * registers the 'memory' tool in toolRegistry. Ignored if memoryManager is set.
   */
  memoryDir?: string;
  /**
   * Session ID for memory snapshot scoping (e.g. String(userId)).
   * Used by BuiltinMemoryProvider.initialize(). Defaults to 'default'.
   */
  memorySessionId?: string;
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

    // Auto-setup memory from memoryDir (if no explicit memoryManager provided).
    // Must run BEFORE tool resolution so the 'memory' tool appears in this.tools.
    this.memoryManager = config.memoryManager ?? this.initMemory(config);

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
   * Initialize built-in file-backed memory from config.memoryDir.
   * Registers the 'memory' tool into config.toolRegistry if available.
   * Returns the created MemoryManager, or undefined if memoryDir is not set.
   */
  private initMemory(config: HermesAgentConfig): MemoryManager | undefined {
    if (!config.memoryDir) return undefined;

    const provider = new BuiltinMemoryProvider({
      dir: config.memoryDir,
      maxChars: 2200,      // MEMORY.md — consistent with Claude SDK
      maxCharsUser: 1375,  // USER.md  — consistent with Claude SDK
    });
    provider.initialize(config.memorySessionId ?? 'default');

    const manager = new MemoryManager();
    manager.addProvider(provider);

    // Auto-register 'memory' tool if a registry is present and not already registered
    if (config.toolRegistry && !config.toolRegistry.has('memory')) {
      config.toolRegistry.register(
        'memory',
        'Read, add, replace, or remove entries in persistent agent memory (MEMORY.md) or user profile (USER.md).',
        memorySchema,
        async (_id, args) => {
          const jsonResult = await manager.handleToolCall('memory', args);
          let isError = false;
          try {
            const parsed = JSON.parse(jsonResult) as { success?: boolean };
            isError = parsed.success === false;
          } catch { /* keep isError = false */ }
          return { content: [{ type: 'text' as const, text: jsonResult }], isError };
        },
      );
    }

    return manager;
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
