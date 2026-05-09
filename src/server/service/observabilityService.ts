/**
 * Observability Service
 *
 * 接收 hermes-agent 的 callbacks 数据，将 trace/span 挰久化到数据库。
 * 所有写入操作使用 fire-and-forget 模式，不阻塞 agent 执行循环。
 * 
 * 关键：确保 trace 在 span 之前创建，避免外键约束失败。
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
  /** 已知的 trace ID 集合，用于避免重复创建和确保外键完整性 */
  private knownTraces = new Set<string>();
  
  /** 等待中的 span 创建请求，按 traceId 分组 */
  private pendingSpans = new Map<string, SpanStartEvent[]>();

  // ============== Trace persistence ==============

  async createTrace(trace: TraceStartEvent): Promise<void> {
    try {
      // 标记此 trace 为已知，在 createSpan 中可以检查
      this.knownTraces.add(trace.traceId);
      
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
      
      // Trace 创建成功后，处理所有等待此 trace 的 spans
      const pending = this.pendingSpans.get(trace.traceId);
      if (pending && pending.length > 0) {
        this.pendingSpans.delete(trace.traceId);
        // 异步处理等待的 spans（fire-and-forget）
        Promise.all(pending.map(span => this.createSpan(span)))
          .catch(err => logger.error('[ObservabilityService] Failed to process pending spans:', err));
      }
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
      
      // 清理已知的 trace（trace 结束后）
      this.knownTraces.delete(trace.traceId);
    } catch (error) {
      logger.error('[ObservabilityService] Failed to update trace:', error);
    }
  }

  // ============== Span persistence ==============

  async createSpan(span: SpanStartEvent): Promise<void> {
    try {
      // 检查 trace 是否存在
      if (!this.knownTraces.has(span.traceId)) {
        // Trace 还没创建，将 span 加入等待队列
        const pending = this.pendingSpans.get(span.traceId) || [];
        pending.push(span);
        this.pendingSpans.set(span.traceId, pending);
        
        // 等待一段时间后重试（给 trace 创建机会）
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 如果 trace 还是不存在，放弃这个 span
        if (!this.knownTraces.has(span.traceId)) {
          logger.warn(`[ObservabilityService] Dropping span ${span.spanId}: trace ${span.traceId} not found after wait`);
          return;
        }
      }
      
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
