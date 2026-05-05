/**
 * Span Repository
 *
 * 数据访问层：负责 chat_spans 表的数据库操作
 */
import { db } from '@server/lib/db';
import { chatSpans } from '@/drizzle/schema/chat';
import { eq } from 'drizzle-orm';
import { BaseRepository } from './base';

export type SpanEntity = {
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: 'llm_call' | 'tool_call' | 'context_compression';
  kind: 'client' | 'internal';
  status: 'ok' | 'error';
  attributes: Record<string, unknown> | null;
  events: Array<Record<string, unknown>> | null;
  startTime: Date;
  endTime: Date | null;
  durationMs: number | null;
  tokenInput: number | null;
  tokenOutput: number | null;
  cost: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSpanData = Omit<SpanEntity, 'id'>;
export type UpdateSpanData = Partial<Omit<SpanEntity, 'id'>>;

export class SpanRepository extends BaseRepository<SpanEntity> {
  constructor() {
    super(chatSpans);
  }

  // ========== Public wrappers for protected base methods ==========

  async create(data: CreateSpanData): Promise<{ id: string }> {
    return this._create(data as any);
  }

  async findById(id: string): Promise<SpanEntity | undefined> {
    return this._findById(id);
  }

  async update(id: string, data: UpdateSpanData): Promise<boolean> {
    return this._update(id, data as any);
  }

  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  // ========== Custom queries ==========

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
}

export const spanRepository = new SpanRepository();
