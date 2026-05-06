/**
 * Tracer — manages trace and span lifecycles with explicit context passing.
 *
 * No AsyncLocalStorage; TraceContext is passed as an argument so it works
 * in browser, Node, and Electron environments.
 */

import type {
  Trace,
  Span,
  SpanName,
  SpanKind,
  SpanStatus,
  SpanEvent,
  TraceContext,
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
} from './types';
import type { ObservabilityBus } from './bus';
import type { TraceMetrics, CostBreakdown } from './types';

let _traceIdCounter = 0;
let _spanIdCounter = 0;

function generateTraceId(): string {
  return `tr_${Date.now().toString(36)}_${(++_traceIdCounter).toString(36)}`;
}

function generateSpanId(): string {
  return `sp_${Date.now().toString(36)}_${(++_spanIdCounter).toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

export class Tracer {
  constructor(private bus: ObservabilityBus | undefined) {}

  /** Start a new trace. Returns the TraceContext to pass around. */
  startTrace(agentName: string, extra?: { sessionId?: string; topicId?: string; metadata?: Record<string, unknown> }): TraceContext {
    const traceId = generateTraceId();
    const startTime = Date.now();

    const traceContext: TraceContext = {
      traceId,
      agentName,
      startTime,
      sessionId: extra?.sessionId,
      topicId: extra?.topicId,
    };

    const event: TraceStartEvent = {
      traceId,
      agentName,
      startTime,
      sessionId: extra?.sessionId,
      topicId: extra?.topicId,
      metadata: extra?.metadata,
    };

    this.bus?.emit({
      level: 'info',
      timestamp: startTime,
      traceId,
      type: 'trace_start',
      payload: event,
    });

    return traceContext;
  }

  /** Start a span inside a trace */
  startSpan(
    traceCtx: TraceContext,
    name: SpanName,
    kind: SpanKind = 'internal',
    attributes?: Record<string, unknown>,
  ): Span {
    const spanId = generateSpanId();
    const startTime = Date.now();

    const span: Span = {
      id: spanId,
      traceId: traceCtx.traceId,
      name,
      kind,
      status: 'ok',
      startTime,
      events: [],
      attributes,
    };

    const event: SpanStartEvent = {
      traceId: traceCtx.traceId,
      spanId,
      name,
      kind,
      startTime,
      attributes,
    };

    this.bus?.emit({
      level: 'debug',
      timestamp: startTime,
      traceId: traceCtx.traceId,
      spanId,
      type: 'span_start',
      payload: event,
    });

    return span;
  }

  /** End a span and emit the span_end event */
  endSpan(
    span: Span,
    options?: {
      status?: SpanStatus;
      tokenInput?: number;
      tokenOutput?: number;
      cost?: number;
      attributes?: Record<string, unknown>;
    },
  ): Span {
    const endTime = Date.now();
    const durationMs = endTime - span.startTime;

    span.endTime = endTime;
    span.durationMs = durationMs;
    span.status = options?.status ?? span.status;
    span.tokenInput = options?.tokenInput ?? span.tokenInput;
    span.tokenOutput = options?.tokenOutput ?? span.tokenOutput;
    span.cost = options?.cost ?? span.cost;
    if (options?.attributes) {
      span.attributes = { ...span.attributes, ...options.attributes };
    }

    const event: SpanEndEvent = {
      traceId: span.traceId,
      spanId: span.id,
      name: span.name,
      status: span.status,
      startTime: span.startTime,
      endTime,
      durationMs,
      attributes: span.attributes,
      events: span.events,
      tokenInput: span.tokenInput,
      tokenOutput: span.tokenOutput,
      cost: span.cost,
    };

    this.bus?.emit({
      level: span.status === 'error' ? 'warn' : 'debug',
      timestamp: endTime,
      traceId: span.traceId,
      spanId: span.id,
      type: 'span_end',
      payload: event,
    });

    return span;
  }

  /** Add an event to an existing span */
  addEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
    const event: SpanEvent = {
      name,
      timestamp: Date.now(),
      attributes,
    };
    span.events.push(event);
  }

  /** End a trace and emit the trace_end event */
  endTrace(
    traceCtx: TraceContext,
    options: {
      status: 'completed' | 'error';
      metrics: TraceMetrics;
      cost: CostBreakdown;
      error?: string;
      metadata?: Record<string, unknown>;
    },
  ): TraceEndEvent {
    const endTime = Date.now();
    const durationMs = endTime - traceCtx.startTime;

    const event: TraceEndEvent = {
      traceId: traceCtx.traceId,
      agentName: traceCtx.agentName,
      startTime: traceCtx.startTime,
      endTime,
      durationMs,
      status: options.status,
      metrics: options.metrics,
      cost: options.cost,
      error: options.error,
      sessionId: traceCtx.sessionId,
      topicId: traceCtx.topicId,
      metadata: options.metadata,
    };

    this.bus?.emit({
      level: options.status === 'error' ? 'error' : 'info',
      timestamp: endTime,
      traceId: traceCtx.traceId,
      type: 'trace_end',
      payload: event,
    });

    return event;
  }
}
