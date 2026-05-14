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
  ObservabilityConfig,
  ReflectionConfig,
} from './types';
import type { AuditResult } from './reflection/types';
import { createObservability, Tracer, MetricsCollector, CostTracker } from './observability';
import type { ObservabilityBus } from './observability';
import {
  ReflectionAuditor,
  SkillGenerator,
  LearningRecorder,
  ReflectionMetricsCollector,
  estimateTokens,
  BackgroundReviewer,
} from './reflection';

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
  /** Observability configuration (sinks, pricing, callbacks) */
  observability?: ObservabilityConfig;
  /** Reflection / self-improvement configuration */
  reflectionConfig?: ReflectionConfig;
}

/** Default maximum skills to create per reflection turn. */
const MAX_SKILLS_PER_TURN = 3;

/** Default timeout for reflection audit LLM call (milliseconds). */
const REFLECTION_AUDIT_TIMEOUT_MS = 30_000;

export class HermesAgent {
  private readonly config: HermesAgentConfig;
  private readonly tools: Tool[];
  private readonly toolExecutor?: ToolExecutor;
  private cachedSystemPrompt: string | null = null;
  private readonly memoryManager?: MemoryManager;
  private turnCount = 0;
  private backgroundReviewer?: BackgroundReviewer;
  
  // Observability components (shared across main loop and background reviewer)
  private observability?: ObservabilityBus;
  private tracer?: Tracer;
  private metrics?: MetricsCollector;

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

    // Initialize observability components (created once, shared across runs)
    this.observability = createObservability(config.observability);
    this.tracer = this.observability ? new Tracer(this.observability) : undefined;
    this.metrics = this.observability ? new MetricsCollector(this.observability) : undefined;

    // Initialize background reviewer if reflection is enabled with background mode
    if (config.reflectionConfig?.enabled && config.reflectionConfig?.backgroundMode !== false) {
      this.backgroundReviewer = new BackgroundReviewer(
        config.reflectionConfig,
        {
          onBackgroundReviewStart: config.callbacks?.onBackgroundReviewStart,
          onBackgroundReviewComplete: config.callbacks?.onBackgroundReviewComplete,
        },
      );
      // Share observability components with background reviewer
      this.backgroundReviewer.setObservability(this.observability, this.tracer, this.metrics);
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

    this.turnCount++;
    
    // Notify background reviewer of turn start
    this.backgroundReviewer?.onTurnStart();
    
    const context = this.buildContext(input);

    // Note: observability components are created once in constructor and reused
    const costTracker = this.observability && this.config.observability?.pricing
      ? new CostTracker(this.config.observability.pricing, this.config.observability.defaultPricing)
      : undefined;

    const traceCtx = this.tracer?.startTrace(this.config.name ?? 'hermes');

    const agentConfig: AgentConfig = {
      name: this.config.name ?? 'hermes',
      model: this.config.model,
      systemPrompt: this.getSystemPrompt(),
      tools: this.tools,
      toolExecutor: this.toolExecutor,
      maxIterations: this.config.maxIterations ?? 90,
      callbacks: {
        ...this.config.callbacks,
        // Track tool iterations for background reviewer
        onStep: (iteration: number, toolNames: string[]) => {
          this.backgroundReviewer?.onToolIteration();
          this.config.callbacks?.onStep?.(iteration, toolNames);
        },
      },
      streaming: this.config.streaming ?? true,
      streamOptions: this.config.streamOptions,
      memoryManager: this.memoryManager,
      turnNumber: this.turnCount,
      observability: this.config.observability,
    };

    const result = await runAgentLoop(agentConfig, context, traceCtx, this.tracer, this.metrics, costTracker);

    // ========== Background Reflection Review (async) ==========
    // Spawn background review if:
    // 1. Reflection is enabled with backgroundMode (default true)
    // 2. Turn completed successfully (not interrupted, has final response)
    if (
      this.backgroundReviewer &&
      result.completed &&
      result.finalResponse &&
      this.config.reflectionConfig?.backgroundMode !== false
    ) {
      try {
        this.backgroundReviewer.spawn(
          [...context.messages], // Snapshot of messages
          this.config.model,
          result.finalResponse,
          this.memoryManager,
        );
        // Increment turn counter for trigger tracking
        this.backgroundReviewer.incrementTurn();
      } catch {
        // Background review spawn is best-effort, ignore errors
      }
    }

    // ========== Synchronous Reflection (fallback when backgroundMode is false) ==========
    // Only run sync reflection if backgroundMode is explicitly set to false
    let reflectionSpan: import('./observability/types').Span | undefined;
    const reflectionMetrics = new ReflectionMetricsCollector();

    if (traceCtx && this.tracer && this.config.reflectionConfig?.enabled && this.config.reflectionConfig?.backgroundMode === false && result.completed) {
      reflectionSpan = this.tracer.startSpan(traceCtx, 'reflection', 'internal');

      try {
        const frameworksPath = this.config.reflectionConfig.frameworksPath;
        if (!frameworksPath) {
          console.warn('[HermesAgent] reflectionConfig.frameworksPath is required when reflection is enabled');
          throw new Error('Missing frameworksPath');
        }

        const auditor = new ReflectionAuditor(frameworksPath);

        const userMessages = context.messages
          .filter((m) => m.role === 'user')
          .map((m) => (typeof m.content === 'string' ? m.content : ''));

        const auditPromise = auditor.audit(
          this.config.model,
          userMessages,
          result.finalResponse,
          this.config.reflectionConfig.maxTokens ?? 2000,
        );

        const auditResult: AuditResult = await withTimeout(
          auditPromise,
          REFLECTION_AUDIT_TIMEOUT_MS,
          `Reflection audit timed out after ${REFLECTION_AUDIT_TIMEOUT_MS}ms`,
        );

        reflectionMetrics.setDimensions(
          auditResult.dimensions.length,
          auditResult.missing.length,
        );

        // Estimate tokens from prompt + response
        const promptText = userMessages.join(' ') + result.finalResponse;
        reflectionMetrics.setTokens(
          estimateTokens(promptText),
          estimateTokens(auditResult.rawResponse ?? ''),
        );

        // Generate skills for missing dimensions (capped per turn)
        const skillsCreated: string[] = [];
        const localSkillsDir = this.config.reflectionConfig.localSkillsDir;
        const missing = auditResult.missing;

        if (localSkillsDir && missing.length > 0) {
          const skillGen = new SkillGenerator(
            localSkillsDir,
            this.config.reflectionConfig.onSkillChanged,
          );

          const limit = Math.min(missing.length, MAX_SKILLS_PER_TURN);
          if (missing.length > MAX_SKILLS_PER_TURN) {
            console.warn(
              `[HermesAgent] ${missing.length} skills missing but capping at ${MAX_SKILLS_PER_TURN} per turn.`,
            );
          }

          for (let i = 0; i < limit; i++) {
            const dim = missing[i];
            const slug = skillGen.create(dim, dim.evidence);
            if (slug) skillsCreated.push(slug);
          }
        }

        reflectionMetrics.setSkillsCreated(skillsCreated.length);

        // Record learnings to memory
        if (this.memoryManager && auditResult.domainRelevant) {
          const recorder = new LearningRecorder(this.turnCount);
          const framework = await auditor.loadFramework();
          const learningRecord = recorder.buildRecord(
            framework?.name ?? 'unknown',
            auditResult,
            skillsCreated,
          );
          await this.memoryManager.recordLearnings(result, [learningRecord]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const errorRecord = { error: msg }; // Prepare for observability
        console.warn('[HermesAgent] Reflection failed:', msg, errorRecord);
        if (reflectionSpan) {
          reflectionSpan.status = 'error';
        }
      }
    }

    if (reflectionSpan && this.tracer) {
      const rmSnapshot = reflectionMetrics.snapshot();
      this.tracer.endSpan(reflectionSpan, {
        status: reflectionSpan.status === 'error' ? 'error' : 'ok',
        tokenInput: rmSnapshot.tokensInput,
        tokenOutput: rmSnapshot.tokensOutput,
        attributes: {
          dimensionsChecked: rmSnapshot.dimensionsChecked,
          dimensionsMissing: rmSnapshot.dimensionsMissing,
          skillsCreated: rmSnapshot.skillsCreated,
        },
      });
    }

    // Build observability summary
    if (traceCtx && this.tracer && this.metrics) {
      const snapshot = this.metrics.snapshot();
      const cost = costTracker?.totalCost() ?? {
        inputCost: 0, outputCost: 0, cachedCost: 0, reasoningCost: 0, totalCost: 0,
      };

      this.tracer.endTrace(traceCtx, {
        status: result.completed ? 'completed' : 'error',
        metrics: snapshot,
        cost,
        error: result.error,
      });

      result.observability = {
        traceId: traceCtx.traceId,
        durationMs: Date.now() - traceCtx.startTime,
        tokens: {
          input: snapshot.inputTokens,
          output: snapshot.outputTokens,
          total: snapshot.totalTokens,
        },
        cost: cost.totalCost,
        toolCalls: snapshot.toolCalls,
      };
    }

    return result;
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
  
  /** Access the ObservabilityBus (if configured). */
  getObservability(): ObservabilityBus | undefined {
    return this.observability;
  }
}

// ============== Utilities ==============

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(message));
    }, ms);
  });
  return Promise.race([promise, timeout]);
}
