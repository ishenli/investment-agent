import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { produce } from 'immer';
import type { SpanName } from '@investment-agent/hermes-agent';

export interface SpanData {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: SpanName;
  kind: 'client' | 'internal';
  status: 'ok' | 'error';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes?: Record<string, unknown>;
  tokenInput?: number;
  tokenOutput?: number;
  cost?: number;
}

export interface TraceData {
  traceId: string;
  agentName: string;
  sessionId?: string;
  topicId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'running' | 'completed' | 'error';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  apiCalls: number;
  toolCalls: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  error?: string;
}

export interface ObservabilityMetrics {
  totalTokens: number;
  totalCost: number;
  totalLatencyMs: number;
  toolCallCount: number;
}

export interface ObservabilityState {
  isOpen: boolean;
  activeTraceId: string | null;
  traces: TraceData[];
  spansByTraceId: Record<string, SpanData[]>;
  metrics: ObservabilityMetrics;
}

export interface ObservabilityActions {
  togglePanel: (open?: boolean) => void;
  handleTraceStart: (event: {
    traceId: string;
    agentName: string;
    startTime: number;
    sessionId?: string;
    topicId?: string;
  }) => void;
  handleSpanStart: (event: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: SpanName;
    kind: 'client' | 'internal';
    startTime: number;
    attributes?: Record<string, unknown>;
  }) => void;
  handleSpanEnd: (event: {
    traceId: string;
    spanId: string;
    status: 'ok' | 'error';
    endTime: number;
    durationMs: number;
    attributes?: Record<string, unknown>;
    tokenInput?: number;
    tokenOutput?: number;
    cost?: number;
  }) => void;
  handleTraceEnd: (event: {
    traceId: string;
    endTime: number;
    durationMs: number;
    status: 'running' | 'completed' | 'error';
    metrics: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      apiCalls: number;
      toolCalls: number;
      totalLatencyMs: number;
    };
    cost: {
      inputCost: number;
      outputCost: number;
      totalCost: number;
    };
    error?: string;
  }) => void;
  handleMetric: (event: {
    traceId: string;
    metric: {
      name: string;
      value: number;
      timestamp: number;
      labels?: Record<string, string>;
    };
  }) => void;
  reset: () => void;
}

export type ObservabilityStore = ObservabilityState & ObservabilityActions;

const initialState: ObservabilityState = {
  isOpen: false,
  activeTraceId: null,
  traces: [],
  spansByTraceId: {},
  metrics: {
    totalTokens: 0,
    totalCost: 0,
    totalLatencyMs: 0,
    toolCallCount: 0,
  },
};

export const useObservabilityStore = createWithEqualityFn<ObservabilityStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      togglePanel: (open) => {
        set(
          { isOpen: open === undefined ? !get().isOpen : open },
          false,
          'observability/togglePanel',
        );
      },

      handleTraceStart: ({ traceId, agentName, startTime, sessionId, topicId }) => {
        const trace: TraceData = {
          traceId,
          agentName,
          sessionId,
          topicId,
          startTime,
          status: 'running',
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          apiCalls: 0,
          toolCalls: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
        };
        set(
          produce(get(), (draft) => {
            draft.traces.push(trace);
            draft.activeTraceId = traceId;
            draft.spansByTraceId[traceId] = [];
          }),
          false,
          'observability/traceStart',
        );
      },

      handleSpanStart: ({ traceId, spanId, parentSpanId, name, kind, startTime, attributes }) => {
        set(
          produce(get(), (draft) => {
            const spans = draft.spansByTraceId[traceId];
            if (!spans) return;
            // avoid duplicates on reconnection
            if (spans.find((s) => s.spanId === spanId)) return;
            spans.push({
              spanId,
              traceId,
              parentSpanId,
              name,
              kind,
              status: 'ok',
              startTime,
              attributes,
            });
          }),
          false,
          'observability/spanStart',
        );
      },

      handleSpanEnd: ({
        traceId,
        spanId,
        status,
        endTime,
        durationMs,
        attributes,
        tokenInput,
        tokenOutput,
        cost,
      }) => {
        set(
          produce(get(), (draft) => {
            const spans = draft.spansByTraceId[traceId];
            if (!spans) return;
            const span = spans.find((s) => s.spanId === spanId);
            if (!span) return;
            span.status = status;
            span.endTime = endTime;
            span.durationMs = durationMs;
            if (attributes) span.attributes = { ...span.attributes, ...attributes };
            if (tokenInput !== undefined) span.tokenInput = tokenInput;
            if (tokenOutput !== undefined) span.tokenOutput = tokenOutput;
            if (cost !== undefined) span.cost = cost;
          }),
          false,
          'observability/spanEnd',
        );
      },

      handleTraceEnd: ({ traceId, endTime, durationMs, status, metrics, cost, error }) => {
        set(
          produce(get(), (draft) => {
            const trace = draft.traces.find((t) => t.traceId === traceId);
            if (!trace) return;
            trace.endTime = endTime;
            trace.durationMs = durationMs;
            trace.status = status;
            trace.inputTokens = metrics.inputTokens;
            trace.outputTokens = metrics.outputTokens;
            trace.totalTokens = metrics.totalTokens;
            trace.apiCalls = metrics.apiCalls;
            trace.toolCalls = metrics.toolCalls;
            trace.inputCost = cost.inputCost;
            trace.outputCost = cost.outputCost;
            trace.totalCost = cost.totalCost;
            if (error) trace.error = error;

            draft.metrics.totalTokens += metrics.totalTokens;
            draft.metrics.totalCost += cost.totalCost;
            draft.metrics.totalLatencyMs += durationMs;
            draft.metrics.toolCallCount += metrics.toolCalls;
          }),
          false,
          'observability/traceEnd',
        );
      },

      handleMetric: ({ traceId, metric }) => {
        set(
          produce(get(), (draft) => {
            // metrics are informational; we accumulate them on the trace
            const trace = draft.traces.find((t) => t.traceId === traceId);
            if (!trace) return;
            // @ts-expect-error dynamic metric attachment
            trace[`metric_${metric.name}`] = metric.value;
          }),
          false,
          'observability/metric',
        );
      },

      reset: () => {
        set(initialState, false, 'observability/reset');
      },
    }),
    { name: 'observability' },
  ),
  shallow,
);
