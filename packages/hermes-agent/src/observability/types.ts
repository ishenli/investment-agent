/**
 * Observability core types for Hermes Agent.
 *
 * Provides hierarchical tracing, metrics collection, structured logging,
 * and cost tracking. All trace context is passed explicitly (no
 * AsyncLocalStorage) for browser / Node / Electron compatibility.
 */

// ============== Sink Interface ==============

/** Severity levels for observability events */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Base interface for all observability sinks */
export interface ObservabilitySink {
  /** Unique name for this sink instance */
  readonly name: string;

  /** Emit a single observability event */
  emit(event: ObservabilityEvent): void | Promise<void>;

  /** Flush any buffered output (best-effort) */
  flush?(): Promise<void>;

  /** Close the sink and release resources */
  close?(): void | Promise<void>;
}

// ============== Trace / Span Model ==============

/** Valid span names */
export type SpanName =
  | 'llm_call'
  | 'tool_call'
  | 'skill_use'
  | 'context_compression'
  | 'reflection'
  | 'background_review'
  | 'background_review_audit'
  | 'background_review_skill_gen';

/** Span kind — client = LLM call, internal = agent bookkeeping */
export type SpanKind = 'client' | 'internal';

/** Span / trace status */
export type SpanStatus = 'ok' | 'error';

/** A single event attached to a span */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

/** Hierarchical span within a trace */
export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: SpanName;
  kind: SpanKind;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes?: Record<string, unknown>;
  events: SpanEvent[];
  tokenInput?: number;
  tokenOutput?: number;
  cost?: number;
}

/** Root trace containing all spans for one agent.run() */
export interface Trace {
  id: string;
  agentName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'running' | 'completed' | 'error';
  spans: Span[];
  error?: string;
}

// ============== Metric Model ==============

/** Kinds of metrics the collector tracks */
export type MetricName =
  | 'tokens.input'
  | 'tokens.output'
  | 'tokens.cached'
  | 'tokens.reasoning'
  | 'tokens.total'
  | 'latency.llm'
  | 'latency.tool'
  | 'latency.total'
  | 'api_calls'
  | 'tool_calls'
  | 'iterations.used'
  | 'iterations.remaining'
  | 'compressions.count'
  | 'tokens.saved_compression'
  // Reflection metrics
  | 'reflection.audit.latency'
  | 'reflection.audit.tokens'
  | 'reflection.skills.created'
  | 'reflection.memory.updated'
  | 'reflection.dimensions.checked'
  | 'reflection.dimensions.covered'
  | 'reflection.dimensions.missing';

/** A single metric reading */
export interface MetricPoint {
  name: MetricName;
  value: number;
  timestamp: number;
  traceId: string;
  spanId?: string;
  labels?: Record<string, string>;
}

/** Aggregated metrics for a completed trace */
export interface TraceMetrics {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  apiCalls: number;
  toolCalls: number;
  iterationsUsed: number;
  iterationsRemaining: number;
  compressionCount: number;
  tokensSavedByCompression: number;
  totalLatencyMs: number;
  llmLatencyMs: number;
  toolLatencyMs: number;
  // Reflection metrics
  reflectionAuditLatencyMs?: number;
  reflectionAuditTokens?: number;
  reflectionSkillsCreated?: number;
  reflectionMemoryUpdated?: boolean;
  reflectionDimensionsChecked?: number;
  reflectionDimensionsCovered?: number;
  reflectionDimensionsMissing?: number;
}

// ============== Cost Model ==============

/** Pricing for a single model (per million tokens, USD) */
export interface ModelPricing {
  /** Input price per 1M tokens in USD */
  inputPerMillion: number;
  /** Output price per 1M tokens in USD */
  outputPerMillion: number;
  /** Cached input price per 1M tokens (optional) */
  cachedInputPerMillion?: number;
  /** Reasoning token price per 1M tokens (optional) */
  reasoningPerMillion?: number;
}

/** Pricing table keyed by model name */
export type ModelPricingTable = Record<string, ModelPricing>;

/** Cost breakdown for a trace or span */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cachedCost: number;
  reasoningCost: number;
  totalCost: number;
}

// ============== Callback Events ==============

/** Fired when a trace starts */
export interface TraceStartEvent {
  traceId: string;
  agentName: string;
  startTime: number;
  sessionId?: string;
  topicId?: string;
  metadata?: Record<string, unknown>;
}

/** Fired when a span starts */
export interface SpanStartEvent {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: SpanName;
  kind: SpanKind;
  startTime: number;
  attributes?: Record<string, unknown>;
}

/** Fired when a span ends */
export interface SpanEndEvent {
  traceId: string;
  spanId: string;
  name: SpanName;
  status: SpanStatus;
  startTime: number;
  endTime: number;
  durationMs: number;
  attributes?: Record<string, unknown>;
  events: SpanEvent[];
  tokenInput?: number;
  tokenOutput?: number;
  cost?: number;
}

/** Fired when a trace ends */
export interface TraceEndEvent {
  traceId: string;
  agentName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'running' | 'completed' | 'error';
  metrics: TraceMetrics;
  cost: CostBreakdown;
  error?: string;
  sessionId?: string;
  topicId?: string;
  metadata?: Record<string, unknown>;
}

/** Fired when a new metric is recorded */
export interface MetricEvent {
  traceId: string;
  metric: MetricPoint;
}

/** All callback payload types */
export type ObservabilityCallbackEvent =
  | TraceStartEvent
  | SpanStartEvent
  | SpanEndEvent
  | TraceEndEvent;

// ============== Configuration ==============

/** Sink factory or instance */
export type SinkConfig =
  | ObservabilitySink
  | { type: 'console'; level?: LogLevel; color?: boolean }
  | { type: 'file'; path: string; level?: LogLevel };

/** User-provided observability configuration */
export interface ObservabilityConfig {
  /** Whether observability is enabled (default: true when config is present) */
  enabled?: boolean;
  /** Minimum log level for console / file sinks (default: 'info') */
  level?: LogLevel;
  /** Sinks — instances or shorthand configs */
  sinks?: SinkConfig[];
  /** Model pricing table for cost tracking */
  pricing?: ModelPricingTable;
  /** Optional default cost for unknown models (USD per 1M tokens) */
  defaultPricing?: ModelPricing;
  /** Callbacks for external consumers (fire-and-forget) */
  callbacks?: {
    onTraceStart?: (trace: TraceStartEvent) => void;
    onSpanStart?: (span: SpanStartEvent) => void;
    onSpanEnd?: (span: SpanEndEvent) => void;
    onTraceEnd?: (trace: TraceEndEvent) => void;
    onMetric?: (metric: MetricEvent) => void;
  };
  /** Event sampling rate 0–1 (default: 1 = all events) */
  sampleRate?: number;
}

// ============== Runtime Events ==============

/** Shape of every event emitted internally by the observability bus */
export interface ObservabilityEvent {
  level: LogLevel;
  timestamp: number;
  traceId: string;
  spanId?: string;
  type: 'trace_start' | 'span_start' | 'span_end' | 'trace_end' | 'metric' | 'log';
  payload:
    | TraceStartEvent
    | SpanStartEvent
    | SpanEndEvent
    | TraceEndEvent
    | MetricEvent
    | Record<string, unknown>;
}

// ============== Trace Context (explicit passing) ==============

/** Passed explicitly into every instrumented function instead of AsyncLocalStorage */
export interface TraceContext {
  traceId: string;
  sessionId?: string;
  topicId?: string;
  agentName: string;
  startTime: number;
}

/** Summary attached to HermesAgentResult when observability is enabled */
export interface ObservabilityResult {
  traceId: string;
  durationMs: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  toolCalls: number;
}
