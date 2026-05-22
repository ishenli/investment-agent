/**
 * Evaluation Baseline Repository
 *
 * 数据访问层：负责 evaluation_baselines 表的数据库操作
 */
import { eq, desc } from 'drizzle-orm';
import { evaluationBaselines } from '@/drizzle/schema';
import { BaseStringRepositoryLite } from './base';

export type EvaluationBaseline = typeof evaluationBaselines.$inferSelect;
export type CreateEvaluationBaseline = Omit<EvaluationBaseline, 'id' | 'createdAt'>;

export class EvaluationBaselineRepository extends BaseStringRepositoryLite<EvaluationBaseline> {
  constructor() {
    super(evaluationBaselines);
  }

  /**
   * 查询所有基线（按 createdAt 降序）
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<EvaluationBaseline[]> {
    return this.findMany(undefined, {
      ...options,
      orderBy: [desc(evaluationBaselines.createdAt)],
    });
  }

  /**
   * 根据名称查找基线
   */
  async findByName(name: string): Promise<EvaluationBaseline | null> {
    return this.findOne(eq(evaluationBaselines.name, name));
  }

  /**
   * 根据 runId 查找基线
   */
  async findByRunId(runId: string): Promise<EvaluationBaseline[]> {
    return this.findMany(eq(evaluationBaselines.runId, runId), {
      orderBy: [desc(evaluationBaselines.createdAt)],
    });
  }
}

export const evaluationBaselineRepository = new EvaluationBaselineRepository();
