import { BaseBizController } from './base';
import { observabilityTraceRepository, observabilitySpanRepository } from '@server/repository/chat/observability';
import { observabilityService } from '@server/service/observabilityService';
import logger from '@server/base/logger';
import { z } from 'zod';

const QuerySchema = z.object({
  sessionId: z.string().optional(),
  topicId: z.string().optional(),
  status: z.enum(['running', 'completed', 'error']).optional(),
  agentName: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  includeSpans: z.coerce.boolean().default(false),
});

interface SpanNode {
  id: string;
  name: string;
  durationMs: number | null;
  status: string;
  children: SpanNode[];
  [key: string]: any;
}

function buildSpanTree(spans: any[]): SpanNode[] {
  const nodes: Record<string, SpanNode> = {};
  const roots: SpanNode[] = [];

  for (const span of spans) {
    nodes[span.id] = {
      id: span.id,
      name: span.name,
      durationMs: span.durationMs,
      status: span.status,
      children: [],
      ...span,
    };
  }

  for (const span of spans) {
    const node = nodes[span.id];
    if (span.parentSpanId && nodes[span.parentSpanId]) {
      nodes[span.parentSpanId].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export class ObservabilityBizController extends BaseBizController {
  // ============== 查询操作 ==============

  /**
   * 查询 trace 列表
   * @param query 查询参数
   */
  async getTraces(query: Record<string, unknown>) {
    try {
      const parsed = QuerySchema.safeParse(query);
      if (!parsed.success) {
        return this.error('Invalid query parameters', 'validation_error');
      }
      const params = parsed.data;

      let traces;
      if (params.sessionId) {
        traces = await observabilityTraceRepository.findBySessionId(params.sessionId, {
          limit: params.limit,
          offset: params.offset,
        });
      } else if (params.topicId) {
        traces = await observabilityTraceRepository.findByTopicId(params.topicId);
      } else if (params.status) {
        traces = await observabilityTraceRepository.findByStatus(params.status, { limit: params.limit });
      } else {
        traces = await observabilityTraceRepository.findRecent({ limit: params.limit });
      }

      // Enrich traces with user input query from chat_messages
      const traceIds = traces.map((t) => t.id);
      const inputMap = await observabilityService.getTraceInputs(traceIds);

      const enrichedTraces = traces.map((trace) => ({
        ...trace,
        input: inputMap.get(trace.id) ?? null,
      }));

      let result = enrichedTraces;
      if (params.includeSpans) {
        result = await Promise.all(
          enrichedTraces.map(async (trace) => {
            const spans = await observabilitySpanRepository.findByTraceId(trace.id);
            return { ...trace, spans };
          })
        );
      }

      return this.success(result);
    } catch (error) {
      logger.error('[ObservabilityBizController] Failed to get traces:', error);
      return this.error(
        error instanceof Error ? error.message : 'Failed to get traces',
        'get_traces_error',
      );
    }
  }

  /**
   * 查询单个 trace 详情
   * @param params 包含 traceId
   */
  async getTraceDetail(params: { traceId: string }) {
    try {
      const trace = await observabilityTraceRepository.findById(params.traceId);
      if (!trace) {
        return this.error('Trace not found', 'trace_not_found');
      }

      const spans = await observabilitySpanRepository.findByTraceId(params.traceId);
      const stats = await observabilitySpanRepository.getSpanStats(params.traceId);
      const spanTree = buildSpanTree(spans);

      return this.success({
        trace,
        spans,
        spanTree,
        stats,
      });
    } catch (error) {
      logger.error('[ObservabilityBizController] Failed to get trace detail:', error);
      return this.error(
        error instanceof Error ? error.message : 'Failed to get trace detail',
        'get_trace_detail_error',
      );
    }
  }
}
