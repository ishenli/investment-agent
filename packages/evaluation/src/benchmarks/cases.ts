import type { BenchmarkCase, EvaluationCategory } from '../core/types';

import assetQueryCases from './datasets/asset-query.json';
import portfolioAnalysisCases from './datasets/portfolio-analysis.json';
import marketResearchCases from './datasets/market-research.json';
import multiTurnCases from './datasets/multi-turn.json';
import edgeCases from './datasets/edge-cases.json';

type RawCase = Omit<BenchmarkCase, 'category'>;

const datasets: Record<EvaluationCategory, RawCase[]> = {
  'asset-query': assetQueryCases as unknown as RawCase[],
  'portfolio-analysis': portfolioAnalysisCases as unknown as RawCase[],
  'market-research': marketResearchCases as unknown as RawCase[],
  'multi-turn': multiTurnCases as unknown as RawCase[],
  'edge-cases': edgeCases as unknown as RawCase[],
};

export function loadBenchmarkCases(categories?: EvaluationCategory[]): BenchmarkCase[] {
  const selected = categories?.length ? categories : (Object.keys(datasets) as EvaluationCategory[]);
  const cases: BenchmarkCase[] = [];

  for (const category of selected) {
    const dataset = datasets[category];
    if (dataset) {
      cases.push(...dataset.map((c) => ({ ...c, category })));
    }
  }

  return cases;
}
