/**
 * Evaluation Service
 *
 * 处理 Agent 评测结果的业务逻辑和数据持久化
 */
import logger from '@server/base/logger';
import { evaluationRunRepository } from '@server/repository/evaluationRunRepository';
import { evaluationBaselineRepository } from '@server/repository/evaluationBaselineRepository';
import type { EvaluationRun } from '@server/repository/evaluationRunRepository';

export interface EvaluationScorerInput {
  dimension: string;
  name: string;
  passed: boolean;
  reason: string;
  score: number;
}

export interface EvaluationCaseInput {
  caseId: string;
  category: string;
  dimensionScores: Record<string, number>;
  engine: string;
  passed: boolean;
  runRecord: object;
  score: number;
  scorers: EvaluationScorerInput[];
}

export interface SaveEvaluationReportInput {
  categories: string[];
  engine: string;
  failedCases: number;
  passedCases: number;
  reportPath?: string;
  runId: string;
  score: number;
  threshold: number;
  totalCases: number;
  caseResults: EvaluationCaseInput[];
}

export class EvaluationService {
  // ============== 评测结果持久化 ==============

  /**
   * 保存完整评测报告到数据库（事务）
   */
  async saveEvaluationReport(input: SaveEvaluationReportInput): Promise<EvaluationRun | null> {
    try {
      const result = await evaluationRunRepository.saveFullReport({
        caseResults: input.caseResults.map((caseResult) => ({
          caseId: caseResult.caseId,
          category: caseResult.category,
          dimensionScores: JSON.stringify(caseResult.dimensionScores),
          engine: caseResult.engine,
          passed: caseResult.passed,
          runId: input.runId,
          runRecord: JSON.stringify(caseResult.runRecord),
          score: caseResult.score,
          scorers: caseResult.scorers,
        })),
        run: {
          categories: JSON.stringify(input.categories),
          engine: input.engine,
          failedCases: input.failedCases,
          id: input.runId,
          passedCases: input.passedCases,
          reportPath: input.reportPath,
          score: input.score,
          threshold: input.threshold,
          totalCases: input.totalCases,
        },
      });

      logger.info(`[EvaluationService] Saved evaluation run ${input.runId}: ${input.passedCases}/${input.totalCases} passed`);
      return result;
    } catch (error) {
      logger.error(`[EvaluationService] Failed to save evaluation report: ${error}`);
      return null;
    }
  }

  /**
   * 创建评测运行记录（ running 状态）
   */
  async createEvaluationRun(params: {
    categories: string[];
    engine: string;
    runId: string;
    threshold: number;
  }): Promise<EvaluationRun | null> {
    try {
      return await evaluationRunRepository.create({
        categories: JSON.stringify(params.categories),
        completedAt: null,
        engine: params.engine,
        failedCases: 0,
        passedCases: 0,
        reportPath: null,
        score: 0,
        startedAt: new Date(),
        status: 'running',
        threshold: params.threshold,
        totalCases: 0,
        id: params.runId,
      });
    } catch (error) {
      logger.error(`[EvaluationService] Failed to create evaluation run: ${error}`);
      return null;
    }
  }

  /**
   * 更新评测运行状态为完成
   */
  async completeEvaluationRun(runId: string, params: {
    failedCases: number;
    passedCases: number;
    reportPath?: string;
    score: number;
    totalCases: number;
  }): Promise<EvaluationRun | null> {
    try {
      const result = await evaluationRunRepository.update(runId, {
        completedAt: new Date(),
        failedCases: params.failedCases,
        passedCases: params.passedCases,
        reportPath: params.reportPath,
        score: params.score,
        status: 'completed',
        totalCases: params.totalCases,
      });

      logger.info(`[EvaluationService] Completed evaluation run ${runId}: score=${params.score.toFixed(3)}`);
      return result;
    } catch (error) {
      logger.error(`[EvaluationService] Failed to complete evaluation run: ${error}`);
      return null;
    }
  }

  /**
   * 更新评测运行状态为失败
   */
  async failEvaluationRun(runId: string, reason?: string): Promise<EvaluationRun | null> {
    try {
      logger.error(`[EvaluationService] Evaluation run ${runId} failed: ${reason ?? 'unknown'}`);
      return await evaluationRunRepository.update(runId, {
        completedAt: new Date(),
        status: 'failed',
      });
    } catch (error) {
      logger.error(`[EvaluationService] Failed to mark evaluation run as failed: ${error}`);
      return null;
    }
  }

  /**
   * 创建基线
   */
  async createBaseline(runId: string, name: string, description?: string): Promise<boolean> {
    try {
      const id = `baseline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await evaluationBaselineRepository.create({
        description: description ?? null,
        id,
        name,
        runId,
      });

      logger.info(`[EvaluationService] Created baseline ${name} for run ${runId}`);
      return true;
    } catch (error) {
      logger.error(`[EvaluationService] Failed to create baseline: ${error}`);
      return false;
    }
  }

  /**
   * 获取最近的评测运行
   */
  async getRecentRuns(engine?: string, limit = 10): Promise<EvaluationRun[]> {
    if (engine) {
      return evaluationRunRepository.findByEngine(engine, { limit });
    }
    return evaluationRunRepository.findAll({ limit });
  }
}

const evaluationService = new EvaluationService();
export default evaluationService;
