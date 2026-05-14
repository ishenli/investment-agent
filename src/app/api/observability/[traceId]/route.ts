/**
 * Single Trace Detail API
 *
 * GET /api/observability/[traceId] - 获取单个 trace 详情
 */
import { NextRequest, NextResponse } from 'next/server';
import { observabilityTraceRepository, observabilitySpanRepository } from '@server/repository/chat/observability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  try {
    const { traceId } = await params;

    const trace = await observabilityTraceRepository.findById(traceId);
    if (!trace) {
      return NextResponse.json(
        { success: false, error: 'Trace not found' },
        { status: 404 }
      );
    }

    // 获取所有 spans
    const spans = await observabilitySpanRepository.findByTraceId(traceId);

    // 获取 span 统计
    const stats = await observabilitySpanRepository.getSpanStats(traceId);

    // 构建 span 树结构
    const spanTree = buildSpanTree(spans);

    return NextResponse.json({
      success: true,
      data: {
        trace,
        spans,
        spanTree,
        stats,
      },
    });
  } catch (error) {
    console.error('[Observability API] GET trace error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

  // 先构建所有节点
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

  // 构建树结构
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
