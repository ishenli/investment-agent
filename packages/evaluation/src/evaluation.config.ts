import type { EvaluationCategory, EvaluationEngine, EvaluationTransport } from './core/types';

export interface EvaluationConfig {
  categories: EvaluationCategory[];
  engine: EvaluationEngine;
  outputDir: string;
  threshold: number;
  transport: EvaluationTransport;
}

const config: EvaluationConfig = {
  categories: ['asset-query', 'portfolio-analysis', 'market-research', 'multi-turn', 'edge-cases'],
  engine: 'mock',
  outputDir: 'reports',
  threshold: 0.8,
  transport: 'web-api',
};

export default config;
