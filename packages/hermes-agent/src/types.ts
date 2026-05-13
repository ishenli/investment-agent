/**
 * Core type definitions for Hermes Agent.
 *
 * Uses @mariozechner/pi-ai types as the foundation.
 */

// ============== Permission Types ==============

import type { PermissionLevel, ToolCategory, ConfirmationRequest, ConfirmationResult } from './permission/types';

export type { PermissionLevel, ToolCategory, ConfirmationRequest, ConfirmationResult };

// ============== PI-AI Type Re-exports ==============

import type {
  Context,
  Message,
  AssistantMessage,
  UserMessage,
  ToolResultMessage,
  Tool,
  ToolCall,
  TextContent,
  ThinkingContent,
  ImageContent,
  Api,
  Model,
} from '@mariozechner/pi-ai';

// Re-export pi-ai types for convenience
export type {
  Context,
  Message,
  AssistantMessage,
  UserMessage,
  ToolResultMessage,
  Tool,
  ToolCall,
  TextContent,
  ThinkingContent,
  ImageContent,
  Api,
  Model,
};

// ============== Observability Re-exports ==============

import type {
  ObservabilityConfig,
  ObservabilityResult,
  TraceContext,
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
  MetricEvent,
  ModelPricingTable,
  CostBreakdown,
  TraceMetrics,
} from './observability/types';

export type {
  ObservabilityConfig,
  ObservabilityResult,
  TraceContext,
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
  MetricEvent,
  ModelPricingTable,
  CostBreakdown,
  TraceMetrics,
};

// ============== Agent Input / Output ==============

export interface HermesAgentInput {
  /** User message text or a full Message object */
  message: string | UserMessage;
  /** Previous conversation context (optional, for multi-turn) */
  context?: Context;
}

export interface HermesAgentResult {
  /** The full conversation context after execution */
  context: Context;
  /** Whether the agent completed normally */
  completed: boolean;
  /** Number of LLM API calls made */
  apiCalls: number;
  /** Final text response extracted from the last assistant message */
  finalResponse: string;
  /** Error message if completed is false */
  error?: string;
  /** Observability summary when enabled */
  observability?: ObservabilityResult;
}

// ============== Tool Definitions ==============

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  isError: boolean;
  durationMs?: number;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
  toolCallId: string,
) => Promise<ToolCallResult>;

// ============== Agent Configuration ==============

/** Options forwarded to pi-ai's stream()/complete() calls. */
export interface StreamOptions {
  /** API key override (takes precedence over env vars) */
  apiKey?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Timeout in milliseconds for each LLM call */
  timeoutMs?: number;
  /** Memory prefetch timeout in milliseconds */
  memoryPrefetchTimeoutMs?: number;
  /** Memory sync timeout in milliseconds */
  memorySyncTimeoutMs?: number;
  /** Additional options passed through to the provider */
  [key: string]: unknown;
}

// ============== Background Review Types ==============

/** Trigger type for background review */
export type BackgroundReviewTrigger = 'memory' | 'skills' | 'combined';

/** Summary of background review results */
export interface BackgroundReviewSummary {
  /** What triggered the review */
  trigger: BackgroundReviewTrigger;
  /** Whether the review succeeded */
  success: boolean;
  /** Skills created (if any) */
  skillsCreated?: string[];
  /** Memory updated (true if memory was modified) */
  memoryUpdated?: boolean;
  /** Error message if review failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

export interface AgentCallbacks {
  onToolStart?: (name: string, args: Record<string, unknown>) => void;
  onToolEnd?: (result: ToolCallResult) => void;
  onError?: (error: Error) => void;
  onStep?: (iteration: number, toolNames: string[]) => void;
  onTextDelta?: (delta: string) => void;
  /** Fired after a turn completes and memory has been synced */
  onTurnEnd?: (result: HermesAgentResult) => void | Promise<void>;
  // Permission confirmation callback
  onConfirmationRequest?: (request: ConfirmationRequest) => Promise<ConfirmationResult>;
  // Observability callbacks (optional, fire-and-forget)
  onTraceStart?: (trace: TraceStartEvent) => void;
  onSpanStart?: (span: SpanStartEvent) => void;
  onSpanEnd?: (span: SpanEndEvent) => void;
  onTraceEnd?: (trace: TraceEndEvent) => void;
  onMetric?: (metric: MetricEvent) => void;
  // Background review callbacks
  /** Fired when a background review thread starts */
  onBackgroundReviewStart?: (trigger: BackgroundReviewTrigger) => void;
  /** Fired when a background review thread completes */
  onBackgroundReviewComplete?: (summary: BackgroundReviewSummary) => void;
}

/** Reflection / self-improvement configuration */
export interface ReflectionConfig {
  /** Whether reflection is enabled (default: false) */
  enabled?: boolean;
  /** Whether to run reflection in background thread (default: true) */
  backgroundMode?: boolean;
  /** Trigger memory review every N turns (0 = disabled, default: 10) */
  turnNudgeInterval?: number;
  /** Trigger skill review after N tool iterations in a turn (0 = disabled, default: 10) */
  iterationNudgeInterval?: number;
  /** Path to the framework checklist JSON file */
  frameworksPath?: string;
  /** Maximum tokens for audit LLM output (default: 2000) */
  maxTokens?: number;
  /** Local directory for auto-created skills */
  localSkillsDir?: string;
  /** Callback when a skill is created by reflection */
  onSkillChanged?: (event: { action: 'create'; slug: string }) => void | Promise<void>;
  /** Maximum iterations for background review agent (default: 8) */
  maxReviewIterations?: number;
}

export interface AgentConfig {
  /** Agent name for logging/identification */
  name?: string;
  /** pi-ai Model instance (from getModel) */
  model: Model<Api>;
  /** System prompt */
  systemPrompt?: string;
  /** Tools available to the agent */
  tools?: Tool[];
  /** Custom tool executor */
  toolExecutor?: ToolExecutor;
  /** Maximum tool-calling iterations (default: 90) */
  maxIterations?: number;
  /** Event callbacks */
  callbacks?: AgentCallbacks;
  /** Whether to use streaming (default: true) */
  streaming?: boolean;
  /** Options forwarded to pi-ai stream()/complete() calls (apiKey, signal, etc.) */
  streamOptions?: StreamOptions;
  /** Optional memory manager for prefetch/sync */
  memoryManager?: import('./memory-manager').MemoryManager;
  /** Monotonic turn counter for session-level memory tracking */
  turnNumber?: number;
  /** Observability configuration */
  observability?: ObservabilityConfig;
  /** Permission level for tool execution (default: 'standard') */
  permissionLevel?: PermissionLevel;
}
