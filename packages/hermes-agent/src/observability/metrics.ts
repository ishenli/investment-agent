/**
 * MetricsCollector — accumulates quantitative metrics during agent execution.
 *
 * All counters are per-trace. The collector is designed to be cheap to update
 * (plain number increments) and produces a TraceMetrics snapshot at the end.
 */

import type {
  MetricName,
  MetricPoint,
  TraceMetrics,
  TraceContext,
} from './types';
import type { ObservabilityBus } from './bus';

export class MetricsCollector {
  private counters: Map<MetricName, number> = new Map();
  private latencies: Map<string, number[]> = new Map();

  constructor(private bus: ObservabilityBus | undefined) {}

  /** Record a single metric point */
  record(traceCtx: TraceContext, name: MetricName, value: number, labels?: Record<string, string>): void {
    // Update accumulator
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);

    // Keep latency distributions for breakdowns
    if (name.startsWith('latency.')) {
      const list = this.latencies.get(name) ?? [];
      list.push(value);
      this.latencies.set(name, list);
    }

    // Emit metric event
    const metric: MetricPoint = {
      name,
      value,
      timestamp: Date.now(),
      traceId: traceCtx.traceId,
      labels,
    };

    this.bus?.emit({
      level: 'debug',
      timestamp: metric.timestamp,
      traceId: traceCtx.traceId,
      type: 'metric',
      payload: { traceId: traceCtx.traceId, metric },
    });
  }

  /** Convenience: record token usage from an LLM response */
  recordTokens(
    traceCtx: TraceContext,
    usage: {
      input?: number;
      output?: number;
      cached?: number;
      reasoning?: number;
      total?: number;
    },
    model?: string,
  ): void {
    const labels = model ? { model } : undefined;
    if (usage.input) this.record(traceCtx, 'tokens.input', usage.input, labels);
    if (usage.output) this.record(traceCtx, 'tokens.output', usage.output, labels);
    if (usage.cached) this.record(traceCtx, 'tokens.cached', usage.cached, labels);
    if (usage.reasoning) this.record(traceCtx, 'tokens.reasoning', usage.reasoning, labels);

    const total =
      usage.total ??
      ((usage.input ?? 0) + (usage.output ?? 0) + (usage.cached ?? 0) + (usage.reasoning ?? 0));
    this.record(traceCtx, 'tokens.total', total, labels);
  }

  /** Convenience: record LLM call latency */
  recordLlmLatency(traceCtx: TraceContext, durationMs: number, model?: string): void {
    this.record(traceCtx, 'latency.llm', durationMs, model ? { model } : undefined);
    this.record(traceCtx, 'api_calls', 1, model ? { model } : undefined);
  }

  /** Convenience: record tool call latency */
  recordToolLatency(traceCtx: TraceContext, durationMs: number, toolName?: string): void {
    this.record(traceCtx, 'latency.tool', durationMs, toolName ? { tool: toolName } : undefined);
    this.record(traceCtx, 'tool_calls', 1, toolName ? { tool: toolName } : undefined);
  }

  /** Convenience: record iteration consumption */
  recordIteration(traceCtx: TraceContext, used: number, remaining: number): void {
    this.record(traceCtx, 'iterations.used', used);
    this.record(traceCtx, 'iterations.remaining', remaining);
  }

  /** Convenience: record context compression */
  recordCompression(traceCtx: TraceContext, tokensBefore: number, tokensAfter: number): void {
    this.record(traceCtx, 'compressions.count', 1);
    const saved = Math.max(0, tokensBefore - tokensAfter);
    this.record(traceCtx, 'tokens.saved_compression', saved);
  }

  /** Get current counter value */
  get(name: MetricName): number {
    return this.counters.get(name) ?? 0;
  }

  /** Build a TraceMetrics snapshot from accumulated counters */
  snapshot(): TraceMetrics {
    const sum = (name: MetricName) => this.counters.get(name) ?? 0;
    const llmLatencies = this.latencies.get('latency.llm') ?? [];
    const toolLatencies = this.latencies.get('latency.tool') ?? [];
    const totalLatency =
      llmLatencies.reduce((a, b) => a + b, 0) + toolLatencies.reduce((a, b) => a + b, 0);

    return {
      inputTokens: sum('tokens.input'),
      outputTokens: sum('tokens.output'),
      cachedTokens: sum('tokens.cached'),
      reasoningTokens: sum('tokens.reasoning'),
      totalTokens: sum('tokens.total'),
      apiCalls: sum('api_calls'),
      toolCalls: sum('tool_calls'),
      iterationsUsed: sum('iterations.used'),
      iterationsRemaining: sum('iterations.remaining'),
      compressionCount: sum('compressions.count'),
      tokensSavedByCompression: sum('tokens.saved_compression'),
      totalLatencyMs: totalLatency,
      llmLatencyMs: llmLatencies.reduce((a, b) => a + b, 0),
      toolLatencyMs: toolLatencies.reduce((a, b) => a + b, 0),
    };
  }
}
