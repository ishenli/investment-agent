import crypto from 'node:crypto';
import { BaseController } from '../base/baseController';
import evaluationService from '@server/service/evaluationService';
import logger from '@server/base/logger';
import { WithRequestContextStatic } from '@/server/base/decorators';

class EvaluationController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      const query = await super.getQuery(request);
      const engine = query.engine as string | undefined;
      const limit = query.limit ? Number(query.limit) : 10;
      const runs = await evaluationService.getRecentRuns(engine, limit);
      return this.success({ runs });
    } catch (error) {
      logger.error('[EvaluationController] Failed to get runs:', error);
      return this.error('获取评测列表失败', 'get_runs_error');
    }
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const body = await super.getBody(request);
      const {
        engine = 'hermes',
        categories = ['asset-query'],
        threshold = 0.7,
        transport = 'web-api',
        model = 'Kimi-K2.6',
        provider = 'ant',
        timeoutMs = 180000,
        maxIterations = 15,
        concurrency = 3,
        limit,
      } = body;

      const runId = `eval-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;

      await evaluationService.createEvaluationRun({
        categories,
        engine,
        runId,
        threshold,
      });

      const { loadBenchmarkCases, evaluateCases } = await import('@investment-agent/evaluation');

      let cases = loadBenchmarkCases(categories);
      if (limit) cases = cases.slice(0, Number(limit));

      (async () => {
        try {
          const report = await evaluateCases(cases, {
            categories,
            concurrency,
            engine,
            runId,
            threshold,
            transport,
            webApiRun: {
              baseUrl: 'http://localhost:3000',
              maxIterations,
              model,
              provider,
              timeoutMs,
            },
            realRun: {
              model,
              provider,
              timeoutMs,
              userId: 1,
            },
          });

          await evaluationService.saveCaseResults(
            runId,
            report.results.map((r: any) => ({
              caseId: r.case.id,
              category: r.case.category,
              dimensionScores: r.dimensionScores,
              engine,
              passed: r.passed,
              runRecord: r.record,
              score: r.score,
              scorers: r.scorers,
            })),
          );

          await evaluationService.completeEvaluationRun(runId, {
            failedCases: report.summary.failed,
            passedCases: report.summary.passed,
            score: report.summary.score,
            totalCases: report.summary.total,
          });
        } catch (error) {
          logger.error(`[EvaluationController] Evaluation run ${runId} failed:`, error);
          await evaluationService.failEvaluationRun(
            runId,
            error instanceof Error ? error.message : String(error),
          );
        }
      })();

      return this.success({ runId, status: 'running' });
    } catch (error) {
      logger.error('[EvaluationController] Failed to start evaluation:', error);
      return this.error('启动评测失败', 'start_eval_error');
    }
  }
}

export const GET = EvaluationController.GET;
export const POST = EvaluationController.POST;
