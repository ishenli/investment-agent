/**
 * Evaluation Scorer Result Repository
 *
 * 数据访问层：负责 evaluation_scorer_results 表的数据库操作
 */
import { db } from '@server/lib/db';
import { eq } from 'drizzle-orm';
import { evaluationScorerResults } from '@/drizzle/schema';
import { BaseIntRepositoryLite } from './base';

export type EvaluationScorerResult = typeof evaluationScorerResults.$inferSelect;
export type CreateEvaluationScorerResult = Omit<EvaluationScorerResult, 'id' | 'createdAt'>;
export type UpdateEvaluationScorerResult = Partial<Omit<EvaluationScorerResult, 'id' | 'createdAt'>>;

export class EvaluationScorerResultRepository extends BaseIntRepositoryLite<EvaluationScorerResult> {
  constructor() {
    super(evaluationScorerResults);
  }

  /**
   * 根据 caseResultId 查找 scorer 结果
   */
  async findByCaseResultId(caseResultId: number): Promise<EvaluationScorerResult[]> {
    return this.findMany(eq(evaluationScorerResults.caseResultId, caseResultId));
  }

  /**
   * 根据 dimension 查找 scorer 结果
   */
  async findByDimension(dimension: string): Promise<EvaluationScorerResult[]> {
    return this.findMany(eq(evaluationScorerResults.dimension, dimension));
  }

  /**
   * 批量创建 scorer 结果
   */
  async createMany(data: CreateEvaluationScorerResult[]): Promise<EvaluationScorerResult[]> {
    if (data.length === 0) return [];

    const now = new Date();
    const values = data.map((item) => ({
      ...item,
      createdAt: now,
    }));

    return (db as any).insert(evaluationScorerResults).values(values).returning() as Promise<EvaluationScorerResult[]>;
  }
}

export const evaluationScorerResultRepository = new EvaluationScorerResultRepository();
