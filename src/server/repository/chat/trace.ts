/**
 * Trace Repository
 *
 * 数据访问层：负责 chat_traces 表的数据库操作
 */
import { db } from '@server/lib/db';
import { chatTraces } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base';

export type TraceEntity = {
  id: string;
  sessionId: string;
  topicId: string | null;
  agentName: string;
  status: 'running' | 'completed' | 'error';
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  latencyMs: number;
  toolCallCount: number;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTraceData = Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTraceData = Partial< Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>>;

export class TraceRepository extends BaseRepository<TraceEntity> {
  constructor() {
    super(chatTraces);
  }

  // ========== Public wrappers for protected base methods ==========

  async create(data: CreateTraceData): Promise<{ id: string }> {
    return this._create(data);
  }

  async findById(id: string): Promise<TraceEntity | undefined> {
    return this._findById(id);
  }

  async update(id: string, data: UpdateTraceData): Promise<boolean> {
    return this._update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  // ========== Custom queries ==========

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

  async getSessionMetrics(sessionId: string): Promise<{
    totalTraces: number;
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
    totalToolCalls: number;
  }> {
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

export const traceRepository = new TraceRepository();
