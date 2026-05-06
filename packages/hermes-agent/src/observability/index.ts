/**
 * Hermes Agent Observability System
 *
 * Public API for configuring and using the observability subsystem.
 */

export type {
  // Sink
  ObservabilitySink,
  LogLevel,
  // Trace / Span
  Span,
  Trace,
  SpanName,
  SpanKind,
  SpanStatus,
  SpanEvent,
  // Metric
  MetricName,
  MetricPoint,
  TraceMetrics,
  // Cost
  ModelPricing,
  ModelPricingTable,
  CostBreakdown,
  // Callback Events
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
  MetricEvent,
  ObservabilityCallbackEvent,
  // Config
  ObservabilityConfig,
  SinkConfig,
  // Runtime
  ObservabilityEvent,
  TraceContext,
  ObservabilityResult,
} from './types';

export { Tracer } from './tracer';
export { MetricsCollector } from './metrics';
export { CostTracker } from './cost-tracker';
export { calculateCost } from './pricing';
export { ConsoleSink } from './sinks/console-sink';
export { FileSink } from './sinks/file-sink';
export { ObservabilityBus, createObservability } from './bus';
