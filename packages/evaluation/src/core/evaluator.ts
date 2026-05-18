import { runMockCase } from './mock-runner';
import { runRealCase, type RealRunOptions } from './real-runner';
import { runAllScorers } from './scorers';
import { getGlobalRegistry } from './scorer-registry';
import {
  runAnswerRelevancyWrapper,
  runBiasWrapper,
  runCompletenessWrapper,
  runContentSimilarityWrapper,
  runContextRelevanceWrapper,
  runFaithfulnessWrapper,
  runHallucinationWrapper,
  runKeywordCoverageWrapper,
  runPromptAlignmentWrapper,
  runToneWrapper,
  runToxicityWrapper,
} from './scorer-wrapper';
import { runWebApiCase, type WebApiRunOptions } from './web-api-runner';
import type { PersistenceAdapter } from './persistence';
import type {
  BenchmarkCase,
  CaseEvaluationResult,
  EvaluationCategory,
  EvaluationEngine,
  EvaluationReport,
  EvaluationSummary,
  EvaluationRunRecord,
  EvaluationTransport,
  ScorerResult,
} from './types';

const dimensions: ScorerResult['dimension'][] = ['mission', 'action', 'context', 'execution', 'ethics'];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

export function calculateDimensionScores(scorers: ScorerResult[]): Record<ScorerResult['dimension'], number> {
  return Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      average(scorers.filter((scorer) => scorer.dimension === dimension).map((scorer) => scorer.score)),
    ]),
  ) as Record<ScorerResult['dimension'], number>;
}

export function summarizeResults(results: CaseEvaluationResult[]): EvaluationSummary {
  const byCategory: EvaluationSummary['byCategory'] = {};

  for (const result of results) {
    const category = result.case.category;
    byCategory[category] ??= { failed: 0, passed: 0, score: 0, total: 0 };
    byCategory[category].total += 1;
    byCategory[category].passed += result.passed ? 1 : 0;
    byCategory[category].failed += result.passed ? 0 : 1;
  }

  for (const [category, bucket] of Object.entries(byCategory)) {
    const categoryResults = results.filter((result) => result.case.category === category);
    bucket.score = average(categoryResults.map((result) => result.score));
  }

  const byDimension = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      average(results.map((result) => result.dimensionScores[dimension])),
    ]),
  ) as EvaluationSummary['byDimension'];

  return {
    byCategory,
    byDimension,
    failed: results.filter((result) => !result.passed).length,
    passed: results.filter((result) => result.passed).length,
    score: average(results.map((result) => result.score)),
    total: results.length,
  };
}

export interface EvaluateCasesOptions {
  categories: EvaluationCategory[];
  engine: EvaluationEngine;
  mastraModel?: string;
  /** @deprecated Use persistenceAdapter instead */
  persist?: boolean;
  /** Optional persistence adapter for saving reports */
  persistenceAdapter?: PersistenceAdapter;
  realRun?: RealRunOptions;
  runId: string;
  threshold: number;
  transport: EvaluationTransport;
  webApiRun?: WebApiRunOptions;
}

async function runMastraScorers(
  testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  model: string,
): Promise<ScorerResult[]> {
  const scorers: ScorerResult[] = [];
  const registry = getGlobalRegistry({ model });

  // Initialize on first use
  if (!registry.listScorers().length) {
    await registry.initialize();
  }

  const mastraScorers = [
    { name: 'answer-relevancy', wrapper: runAnswerRelevancyWrapper, enabled: true },
    { name: 'toxicity', wrapper: runToxicityWrapper, enabled: true },
    { name: 'bias', wrapper: runBiasWrapper, enabled: true },
    { name: 'hallucination', wrapper: runHallucinationWrapper, enabled: true },
    { name: 'prompt-alignment', wrapper: runPromptAlignmentWrapper, enabled: true },
    { name: 'context-relevance', wrapper: runContextRelevanceWrapper, enabled: true },
    { name: 'faithfulness', wrapper: runFaithfulnessWrapper, enabled: true },
    { name: 'completeness', wrapper: runCompletenessWrapper, enabled: true },
    { name: 'content-similarity', wrapper: runContentSimilarityWrapper, enabled: true },
    { name: 'keyword-coverage', wrapper: runKeywordCoverageWrapper, enabled: true },
    { name: 'tone', wrapper: runToneWrapper, enabled: true },
  ];

  const results = await Promise.allSettled(
    mastraScorers.map((scorerDef) => scorerDef.wrapper(testCase, record, { model })),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      scorers.push(result.value);
    }
  }

  // Run per-case context scorers (tool-call-accuracy, trajectory) when case has expected tools
  if (testCase.expected.tools.length > 0) {
    const caseContext = {
      availableTools: testCase.expected.tools,
      expectedTrajectory: testCase.expected.tools,
    };

    const contextScorers = ['tool-call-accuracy-llm', 'tool-call-accuracy-code', 'trajectory-llm', 'trajectory-code'];
    const contextResults = await Promise.allSettled(
      contextScorers.map((name) => registry.runWithContext(name, record, caseContext)),
    );

    for (const result of contextResults) {
      if (result.status === 'fulfilled') {
        scorers.push(result.value);
      }
    }
  }

  return scorers;
}

export async function evaluateCases(
  cases: BenchmarkCase[],
  options: EvaluateCasesOptions,
): Promise<EvaluationReport> {
  const results: CaseEvaluationResult[] = [];

  for (const testCase of cases) {
    const record = options.engine === 'mock'
      ? await runMockCase(testCase, options.engine)
      : options.transport === 'web-api'
        ? await runWebApiCase(testCase, options.engine, options.webApiRun ?? {
            baseUrl: 'http://localhost:3000',
            maxIterations: 15,
            model: 'gpt-5.5',
            provider: 'openai',
            timeoutMs: 60000,
          })
        : await runRealCase(testCase, options.engine, options.realRun ?? {
            model: 'gpt-4o-mini',
            provider: 'openai',
            timeoutMs: 60000,
            userId: 1,
          });

    let scorers = runAllScorers(testCase, record);

    if (options.mastraModel) {
      try {
        const mastraResults = await runMastraScorers(testCase, record, options.mastraModel);
        scorers = scorers.concat(mastraResults);
      } catch (error) {
        console.warn(`[Evaluator] Mastra scorers failed for case ${testCase.id}:`, error instanceof Error ? error.message : error);
      }
    }

    const dimensionScores = calculateDimensionScores(scorers);
    const score = average(Object.values(dimensionScores));

    results.push({
      case: testCase,
      dimensionScores,
      passed: score >= options.threshold && dimensionScores.mission > 0,
      record,
      score,
      scorers,
    });
  }

  const report: EvaluationReport = {
    config: {
      categories: options.categories,
      engine: options.engine,
      threshold: options.threshold,
      transport: options.transport,
    },
    generatedAt: new Date().toISOString(),
    results,
    runId: options.runId,
    summary: summarizeResults(results),
  };

  if (options.persistenceAdapter) {
    try {
      await options.persistenceAdapter.saveReport(report);
    } catch (error) {
      console.error('[Evaluator] Persistence failed:', error instanceof Error ? error.message : error);
    }
  }

  return report;
}
