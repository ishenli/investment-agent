/**
 * AI Insight Repository
 *
 * 数据访问层：负责 ai_insights 表的数据库操作
 */
import { aiInsights } from '@/drizzle/schema';
import { db } from '../lib/db';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { BaseIntRepository } from './base';
import type { AiInsightEntity, InsightSource, InsightType, CreateAiInsightInput } from '@/types/aiInsight';

export class AiInsightRepository extends BaseIntRepository<AiInsightEntity> {
  constructor() {
    super(aiInsights);
  }

  /**
   * 批量创建洞察记录
   * @param data 洞察数据数组
   * @returns 创建的洞察 ID 列表
   */
  async createMany(data: CreateAiInsightInput[]): Promise<number[]> {
    if (data.length === 0) return [];

    const values = data.map((item) => ({
      userId: item.userId,
      accountId: item.accountId ?? null,
      jobId: item.jobId ?? null,
      title: item.title,
      description: item.description,
      type: item.type,
      confidence: item.confidence ?? null,
      metadata: item.metadata ?? null,
      source: item.source,
    }));

    const result = await db.insert(aiInsights).values(values).returning({ id: aiInsights.id });
    return result.map((r) => r.id);
  }

  /**
   * 按用户 ID 查询洞察列表（分页 + 筛选）
   */
  async findByUserId(
    userId: number,
    options: {
      page?: number;
      pageSize?: number;
      source?: InsightSource;
      type?: InsightType;
      accountId?: number;
    } = {},
  ): Promise<{ items: AiInsightEntity[]; totalCount: number }> {
    const { page = 1, pageSize = 20, source, type, accountId } = options;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [eq(aiInsights.userId, userId)];
    if (source) conditions.push(eq(aiInsights.source, source));
    if (type) conditions.push(eq(aiInsights.type, type));
    if (accountId) conditions.push(eq(aiInsights.accountId, accountId));

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(aiInsights)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count || 0);

    const items = await db
      .select()
      .from(aiInsights)
      .where(whereClause)
      .orderBy(desc(aiInsights.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { items: items as AiInsightEntity[], totalCount };
  }

  /**
   * 按任务 ID 查询洞察
   */
  async findByJobId(jobId: number): Promise<AiInsightEntity[]> {
    const result = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.jobId, jobId))
      .orderBy(desc(aiInsights.createdAt));
    return result as AiInsightEntity[];
  }

  /**
   * 按用户 ID 统计洞察数量
   */
  async countByUserId(
    userId: number,
    filters?: { source?: InsightSource; type?: InsightType; accountId?: number },
  ): Promise<number> {
    const conditions: SQL[] = [eq(aiInsights.userId, userId)];
    if (filters?.source) conditions.push(eq(aiInsights.source, filters.source));
    if (filters?.type) conditions.push(eq(aiInsights.type, filters.type));
    if (filters?.accountId) conditions.push(eq(aiInsights.accountId, filters.accountId));

    const result = await db
      .select({ count: sql`count(*)` })
      .from(aiInsights)
      .where(and(...conditions));
    return Number(result[0]?.count || 0);
  }
}

export const aiInsightRepository = new AiInsightRepository();
