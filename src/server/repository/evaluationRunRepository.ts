/**
 * Evaluation Run Repository
 *
 * 数据访问层：负责 evaluation_runs 表的数据库操作
 */
import { db } from '@server/lib/db';
import { eq, desc } from 'drizzle-orm';
import { evaluationRuns, evaluationCaseResults, evaluationScorerResults } from '@/drizzle/schema';
import { BaseStringRepository } from './base';

export type EvaluationRun = typeof evaluationRuns.$inferSelect;
export type CreateEvaluationRun = Omit<EvaluationRun, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEvaluationRun = Partial<Omit<EvaluationRun, 'id' | 'createdAt' | 'updatedAt'>>;

export class EvaluationRunRepository extends BaseStringRepository<EvaluationRun> {
  constructor() {
    super(evaluationRuns);
  }

  /**
   * 查询所有记录（按 createdAt 降序）
   */
  async findAll(options?: { limit?: number; offset?: number }): Promise<EvaluationRun[]> {
    return this.findMany(undefined, {
      ...options,
      orderBy: [desc(evaluationRuns.createdAt)],
    });
  }

  /**
   * 事务：保存完整评测报告（运行记录 + 用例结果 + scorer 结果）
   */
  async saveFullReport(input: {
    caseResults: Array<{
      caseId: string;
      category: string;
      dimensionScores: string;
      engine: string;
      passed: boolean;
      runId: string;
      runRecord: string;
      score: number;
      scorers: Array<{
        dimension: string;
        name: string;
        passed: boolean;
        reason: string;
        score: number;
      }>;
    }>;
    run: {
      categories: string;
      engine: string;
      failedCases: number;
      id: string;
      passedCases: number;
      reportPath?: string | null;
      score: number;
      threshold: number;
      totalCases: number;
    };
  }): Promise<EvaluationRun> {
    return await (db as any).transaction(async (tx: any) => {
      const now = new Date();

      const [run] = await tx
        .insert(evaluationRuns)
        .values({
          ...input.run,
          createdAt: now,
          status: 'completed',
          updatedAt: now,
        })
        .returning();

      if (input.caseResults.length > 0) {
        const caseValues = input.caseResults.map((c) => ({
          caseId: c.caseId,
          category: c.category,
          createdAt: now,
          dimensionScores: c.dimensionScores,
          engine: c.engine,
          passed: c.passed,
          runId: c.runId,
          runRecord: c.runRecord,
          score: c.score,
        }));

        const cases = await tx
          .insert(evaluationCaseResults)
          .values(caseValues)
          .returning();

        const scorerValues: Array<{
          caseResultId: number;
          createdAt: Date;
          dimension: string;
          name: string;
          passed: boolean;
          reason: string;
          score: number;
        }> = [];

        for (let i = 0; i < cases.length; i += 1) {
          const caseInput = input.caseResults[i];
          const caseRecord = cases[i];
          for (const scorer of caseInput.scorers) {
            scorerValues.push({
              caseResultId: caseRecord.id,
              createdAt: now,
              dimension: scorer.dimension,
              name: scorer.name,
              passed: scorer.passed,
              reason: scorer.reason,
              score: scorer.score,
            });
          }
        }

        if (scorerValues.length > 0) {
          await tx.insert(evaluationScorerResults).values(scorerValues);
        }
      }

      return run as EvaluationRun;
    });
  }

  /**
   * 根据引擎查找
   */
  async findByEngine(engine: string, options?: { limit?: number; offset?: number }): Promise<EvaluationRun[]> {
    return this.findMany(eq(evaluationRuns.engine, engine), {
      ...options,
      orderBy: [desc(evaluationRuns.createdAt)],
    });
  }

  /**
   * 根据状态查找
   */
  async findByStatus(status: 'running' | 'completed' | 'failed'): Promise<EvaluationRun[]> {
    return this.findMany(eq(evaluationRuns.status, status), {
      orderBy: [desc(evaluationRuns.createdAt)],
    });
  }
}

export const evaluationRunRepository = new EvaluationRunRepository();
