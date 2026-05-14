/**
 * Observability Repository
 *
 * 数据访问层：支持观测能力的历史查询
 * 兼容 chat_traces/chat_spans 表和扩展表
 */
import { db } from '@server/lib/db';
import { chatTraces, chatSpans } from '@/drizzle/schema/chat';
import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base';

// 使用现有表结构
export type TraceEntity = typeof chatTraces.$inferSelect;
export type CreateTraceData = Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTraceData = Partial<Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>>;

export type SpanEntity = typeof chatSpans.$inferSelect;
export type CreateSpanData = Omit<SpanEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSpanData = Partial<Omit<SpanEntity, 'id' | 'createdAt' | 'updatedAt'>>;

export class ObservabilityTraceRepository extends BaseRepository<TraceEntity> {
  constructor() {
    super(chatTraces);
  }

  async create(data: CreateTraceData): Promise<{ id: string }> {
    return this._create(data as any);
  }

  async findById(id: string): Promise<TraceEntity | undefined> {
    return this._findById(id);
  }

  async update(id: string, data: UpdateTraceData): Promise<boolean> {
    return this._update(id, data as any);
  }

  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  async findBySessionId(sessionId: string, options?: { limit?: number; offset?: number }): Promise<TraceEntity[]> {
    return (db as any)
      .select()
      .from(chatTraces)
      .where(eq(chatTraces.sessionId, sessionId))
      .orderBy(desc(chatTraces.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0) as TraceEntity[];
  }

  async findByTopicId(topicId: string): Promise<TraceEntity[]> {
    return (db as any)
      .select()
      .from(chatTraces)
      .where(eq(chatTraces.topicId, topicId))
      .orderBy(desc(chatTraces.createdAt)) as TraceEntity[];
  }

  async findByStatus(status: 'running' | 'completed' | 'error', options?: { limit?: number }): Promise<TraceEntity[]> {
    return (db as any)
      .select()
      .from(chatTraces)
      .where(eq(chatTraces.status, status))
      .orderBy(desc(chatTraces.createdAt))
      .limit(options?.limit ?? 100) as TraceEntity[];
  }

  async findRecent(options?: { limit?: number }): Promise<TraceEntity[]> {
    return (db as any)
      .select()
      .from(chatTraces)
      .orderBy(desc(chatTraces.createdAt))
      .limit(options?.limit ?? 50) as TraceEntity[];
  }

  async getSessionMetrics(sessionId: string) {
    const result = await (db as any)
      .select({
        totalTraces: sql<number>`count(*)`.as('total_traces'),
        totalTokens: sql<number>`coalesce(sum(${chatTraces.totalTokens}), 0)`.as('total_tokens'),
        totalCost: sql<number>`coalesce(sum(${chatTraces.totalCost}), 0)`.as('total_cost'),
        avgLatency: sql<number>`coalesce(avg(${chatTraces.latencyMs}), 0)`.as('avg_latency'),
        totalToolCalls: sql<number>`coalesce(sum(${chatTraces.toolCallCount}), 0)`.as('total_tool_calls'),
      })
      .from(chatTraces)
      .where(eq(chatTraces.sessionId, sessionId));

    const row = result[0];
    return {
      totalTraces: row.totalTraces ?? 0,
      totalTokens: row.totalTokens ?? 0,
      totalCost: row.totalCost ?? 0,
      avgLatency: row.avgLatency ?? 0,
      totalToolCalls: row.totalToolCalls ?? 0,
    };
  }
}

export class ObservabilitySpanRepository extends BaseRepository<SpanEntity> {
  constructor() {
    super(chatSpans);
  }

  async create(data: CreateSpanData): Promise<{ id: string }> {
    return this._create(data as any);
  }

  async findById(id: string): Promise<SpanEntity | undefined> {
    return this._findById(id);
  }

  async update(id: string, data: UpdateSpanData): Promise<boolean> {
    return this._update(id, data as any);
  }

  async findByTraceId(traceId: string): Promise<SpanEntity[]> {
    return (db as any)
      .select()
      .from(chatSpans)
      .where(eq(chatSpans.traceId, traceId))
      .orderBy(chatSpans.startTime) as SpanEntity[];
  }

  async findByParentSpanId(parentSpanId: string): Promise<SpanEntity[]> {
    return (db as any)
      .select()
      .from(chatSpans)
      .where(eq(chatSpans.parentSpanId, parentSpanId))
      .orderBy(chatSpans.startTime) as SpanEntity[];
  }

  async getSpanStats(traceId: string): Promise<{
    totalSpans: number;
    errorSpans: number;
    avgDurationMs: number;
    byName: Record<string, { count: number; avgDurationMs: number; errorCount: number }>;
  }> {
    const spans = await this.findByTraceId(traceId);
    
    const byName: Record<string, { count: number; totalDuration: number; errorCount: number }> = {};
    let totalDuration = 0;
    let errorSpans = 0;

    for (const span of spans) {
      const name = span.name as string;
      if (!byName[name]) {
        byName[name] = { count: 0, totalDuration: 0, errorCount: 0 };
      }
      byName[name].count++;
      if (span.durationMs !== null) {
        byName[name].totalDuration += span.durationMs;
        totalDuration += span.durationMs;
      }
      if (span.status === 'error') {
        byName[name].errorCount++;
        errorSpans++;
      }
    }

    const result: Record<string, { count: number; avgDurationMs: number; errorCount: number }> = {};
    for (const [name, stats] of Object.entries(byName)) {
      result[name] = {
        count: stats.count,
        avgDurationMs: stats.count > 0 ? stats.totalDuration / stats.count : 0,
        errorCount: stats.errorCount,
      };
    }

    return {
      totalSpans: spans.length,
      errorSpans,
      avgDurationMs: spans.length > 0 ? totalDuration / spans.length : 0,
      byName: result,
    };
  }
}

export const observabilityTraceRepository = new ObservabilityTraceRepository();
export const observabilitySpanRepository = new ObservabilitySpanRepository();
