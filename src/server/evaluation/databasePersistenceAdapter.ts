/**
 * Database persistence adapter for evaluation reports.
 * This adapter is part of the main application and depends on evaluationService.
 */
import type { PersistenceAdapter, EvaluationReport } from '@investment-agent/evaluation';

/**
 * Maps evaluation results to database service format.
 */
function mapToServiceFormat(report: EvaluationReport) {
  return {
    categories: report.config.categories,
    engine: report.config.engine,
    failedCases: report.summary.failed,
    passedCases: report.summary.passed,
    reportPath: undefined,
    runId: report.runId,
    score: report.summary.score,
    threshold: report.config.threshold,
    totalCases: report.summary.total,
    caseResults: report.results.map((r) => ({
      caseId: r.case.id,
      category: r.case.category,
      dimensionScores: r.dimensionScores,
      engine: report.config.engine,
      passed: r.passed,
      runRecord: r.record,
      score: r.score,
      scorers: r.scorers.map((s) => ({
        dimension: s.dimension,
        name: s.name,
        passed: s.passed,
        reason: s.reason,
        score: s.score,
      })),
    })),
  };
}

/**
 * Database persistence adapter that saves evaluation reports via evaluationService.
 * Suitable for use when running within the main application context.
 */
export class DatabasePersistenceAdapter implements PersistenceAdapter {
  async saveReport(report: EvaluationReport): Promise<boolean> {
    try {
      const { default: evaluationService } = await import('../service/evaluationService');
      const result = await evaluationService.saveEvaluationReport(mapToServiceFormat(report));
      return result !== null;
    } catch (error) {
      // Log error but don't throw - persistence failure shouldn't break evaluation
      console.error('[DatabasePersistenceAdapter] Failed to save report:', error);
      return false;
    }
  }
}
