/**
 * Observability Service
 *
 * 接收 hermes-agent 的 callbacks 数据，将 trace/span 持久化到数据库。
 * 所有写入操作使用 fire-and-forget 模式，不阻塞 agent 执行循环。
 */
import { traceRepository, spanRepository } from '@server/repository/chat';
import logger from '@server/base/logger';
import type {
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
} from '@investment-agent/hermes-agent';

export class ObservabilityService {
  // ============== Trace persistence ==============

  async createTrace(trace: TraceStartEvent): Promise<void> {
    try {
      await traceRepository.create({
        id: trace.traceId,
        sessionId: trace.sessionId ?? '',
        topicId: trace.topicId ?? null,
        agentName: trace.agentName,
        status: 'running',
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        latencyMs: 0,
        toolCallCount: 0,
        error: null,
        metadata: trace.metadata ?? null,
      } as any);
    } catch (error) {
      logger.error('[ObservabilityService] Failed to create trace:', error);
    }
  }

  async updateTrace(trace: TraceEndEvent): Promise<void> {
    try {
      await traceRepository.update(trace.traceId, {
        status: trace.status,
        totalTokens: trace.metrics.totalTokens,
        inputTokens: trace.metrics.inputTokens,
        outputTokens: trace.metrics.outputTokens,
        totalCost: trace.cost.totalCost,
        inputCost: trace.cost.inputCost,
        outputCost: trace.cost.outputCost,
        latencyMs: trace.durationMs,
        toolCallCount: trace.metrics.toolCalls,
        error: trace.error ?? null,
      });
    } catch (error) {
      logger.error('[ObservabilityService] Failed to update trace:', error);
    }
  }

  // ============== Span persistence ==============

  async createSpan(span: SpanStartEvent): Promise<void> {
    try {
      await spanRepository.create({
        id: span.spanId,
        traceId: span.traceId,
        parentSpanId: span.parentSpanId ?? null,
        name: span.name,
        kind: span.kind,
        status: 'ok',
        attributes: span.attributes ?? null,
        events: null,
        startTime: new Date(span.startTime),
        endTime: null,
        durationMs: null,
        tokenInput: null,
        tokenOutput: null,
        cost: null,
      } as any);
    } catch (error) {
      logger.error('[ObservabilityService] Failed to create span:', error);
    }
  }

  async updateSpan(span: SpanEndEvent): Promise<void> {
    try {
      await spanRepository.update(span.spanId, {
        status: span.status,
        attributes: span.attributes ?? null,
        events: span.events as any,
        endTime: new Date(span.endTime),
        durationMs: span.durationMs,
        tokenInput: span.tokenInput ?? null,
        tokenOutput: span.tokenOutput ?? null,
        cost: span.cost ?? null,
      });
    } catch (error) {
      logger.error('[ObservabilityService] Failed to update span:', error);
    }
  }

  // ============== Query ==============

  async getSessionMetrics(sessionId: string) {
    return traceRepository.getSessionMetrics(sessionId);
  }

  async findTracesBySession(sessionId: string, options?: { limit?: number; offset?: number }) {
    return traceRepository.findBySessionId(sessionId, options);
  }

  async findSpansByTrace(traceId: string) {
    return spanRepository.findByTraceId(traceId);
  }
}

export const observabilityService = new ObservabilityService();
