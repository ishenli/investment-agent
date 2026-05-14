/**
 * Observability History API
 *
 * GET /api/observability - 查询历史 traces
 * 支持分页、过滤和统计查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { observabilityTraceRepository, observabilitySpanRepository } from '@server/repository/chat/observability';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const query = QuerySchema.parse(params);

    let traces;
    if (query.sessionId) {
      traces = await observabilityTraceRepository.findBySessionId(query.sessionId, {
        limit: query.limit,
        offset: query.offset,
      });
    } else if (query.topicId) {
      traces = await observabilityTraceRepository.findByTopicId(query.topicId);
    } else if (query.status) {
      traces = await observabilityTraceRepository.findByStatus(query.status, { limit: query.limit });
    } else {
      traces = await observabilityTraceRepository.findRecent({ limit: query.limit });
    }

    // 可选：加载每个 trace 的 spans
    let tracesWithSpans = traces;
    if (query.includeSpans) {
      tracesWithSpans = await Promise.all(
        traces.map(async (trace) => {
          const spans = await observabilitySpanRepository.findByTraceId(trace.id);
          return { ...trace, spans };
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: tracesWithSpans,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: traces.length,
      },
    });
  } catch (error) {
    console.error('[Observability API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
