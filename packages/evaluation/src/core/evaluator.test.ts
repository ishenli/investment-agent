import { describe, expect, it } from 'vitest';
import { loadBenchmarkCases } from '../benchmarks/cases';
import { evaluateCases } from './evaluator';

describe('evaluateCases', () => {
  it('evaluates the MVP benchmark set with the mock engine', async () => {
    const cases = loadBenchmarkCases(['asset-query', 'edge-cases']);
    const report = await evaluateCases(cases, {
      categories: ['asset-query', 'edge-cases'],
      engine: 'mock',
      runId: 'test-run',
      threshold: 0.8,
      transport: 'web-api',
    });

    expect(report.summary.total).toBe(35);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.score).toBeGreaterThanOrEqual(0.8);
  });
});
