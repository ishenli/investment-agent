/**
 * Evaluation Case Result Repository
 *
 * 数据访问层：负责 evaluation_case_results 表的数据库操作
 */
import { db } from '@server/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { evaluationCaseResults } from '@/drizzle/schema';
import { BaseIntRepositoryLite } from './base';

export type EvaluationCaseResult = typeof evaluationCaseResults.$inferSelect;
export type CreateEvaluationCaseResult = Omit<EvaluationCaseResult, 'id' | 'createdAt'>;
export type UpdateEvaluationCaseResult = Partial<Omit<EvaluationCaseResult, 'id' | 'createdAt'>>;

export class EvaluationCaseResultRepository extends BaseIntRepositoryLite<EvaluationCaseResult> {
  constructor() {
    super(evaluationCaseResults);
  }

  /**
   * 根据 runId 查找所有用例结果
   */
  async findByRunId(runId: string): Promise<EvaluationCaseResult[]> {
    return this.findMany(eq(evaluationCaseResults.runId, runId), {
      orderBy: [desc(evaluationCaseResults.createdAt)],
    });
  }

  /**
   * 根据 runId 和 caseId 查找
   */
  async findByRunIdAndCaseId(runId: string, caseId: string): Promise<EvaluationCaseResult | null> {
    return this.findOne(and(eq(evaluationCaseResults.runId, runId), eq(evaluationCaseResults.caseId, caseId))!);
  }

  /**
   * 根据 caseId 和 engine 查找历史结果
   */
  async findByCaseIdAndEngine(caseId: string, engine: string, options?: { limit?: number }): Promise<EvaluationCaseResult[]> {
    return this.findMany(
      and(eq(evaluationCaseResults.caseId, caseId), eq(evaluationCaseResults.engine, engine)),
      {
        limit: options?.limit,
        orderBy: [desc(evaluationCaseResults.createdAt)],
      },
    );
  }

  /**
   * 根据 category 查找
   */
  async findByCategory(category: string): Promise<EvaluationCaseResult[]> {
    return this.findMany(eq(evaluationCaseResults.category, category), {
      orderBy: [desc(evaluationCaseResults.createdAt)],
    });
  }

  /**
   * 批量创建用例结果
   */
  async createMany(data: CreateEvaluationCaseResult[]): Promise<EvaluationCaseResult[]> {
    if (data.length === 0) return [];

    const now = new Date();
    const values = data.map((item) => ({
      ...item,
      createdAt: now,
    }));

    return (db as any).insert(evaluationCaseResults).values(values).returning() as Promise<EvaluationCaseResult[]>;
  }
}

export const evaluationCaseResultRepository = new EvaluationCaseResultRepository();
