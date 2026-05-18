export const evaluationCategories = [
  'asset-query',
  'portfolio-analysis',
  'market-research',
  'multi-turn',
  'edge-cases',
] as const;

export const evaluationEngines = ['mock', 'deepagents', 'claude', 'hermes'] as const;
export const evaluationTransports = ['web-api', 'direct'] as const;

export type EvaluationCategory = (typeof evaluationCategories)[number];
export type EvaluationEngine = (typeof evaluationEngines)[number];
export type EvaluationTransport = (typeof evaluationTransports)[number];

export interface EvaluationToolCall {
  args: Record<string, unknown>;
  durationMs?: number;
  error?: string;
  isError: boolean;
  name: string;
  result?: unknown;
}

export interface EvaluationMessage {
  content: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
}

export interface EvaluationRunRecord {
  agentId: string;
  caseId: string;
  completedAt: string;
  cost: {
    costUsd?: number;
    inputTokens?: number;
    latencyMs?: number;
    model?: string;
    outputTokens?: number;
    totalTokens?: number;
  };
  engine: EvaluationEngine;
  error?: {
    code?: string;
    message: string;
    recoverable?: boolean;
  };
  id: string;
  input: string | EvaluationMessage[];
  messages: EvaluationMessage[];
  output: string;
  startedAt: string;
  status: 'completed' | 'failed';
  toolCalls: EvaluationToolCall[];
  trace: {
    metrics: Array<Record<string, unknown>>;
    spans: Array<Record<string, unknown>>;
    traceId?: string;
  };
}

export interface BenchmarkCase {
  category: EvaluationCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  expected: {
    keywords: string[];
    minKeywordCoverage: number;
    prohibitedPhrases: string[];
    requireRiskDisclosure: boolean;
    tools: string[];
  };
  id: string;
  input: string | EvaluationMessage[];
  title: string;
}

export interface ScorerResult {
  dimension: 'mission' | 'action' | 'context' | 'execution' | 'ethics';
  name: string;
  passed: boolean;
  reason: string;
  score: number;
}

export interface CaseEvaluationResult {
  case: BenchmarkCase;
  dimensionScores: Record<ScorerResult['dimension'], number>;
  passed: boolean;
  record: EvaluationRunRecord;
  score: number;
  scorers: ScorerResult[];
}

export interface EvaluationSummary {
  byCategory: Record<string, { failed: number; passed: number; score: number; total: number }>;
  byDimension: Record<ScorerResult['dimension'], number>;
  failed: number;
  passed: number;
  score: number;
  total: number;
}

export interface EvaluationReport {
  config: {
    categories: EvaluationCategory[];
    engine: EvaluationEngine;
    threshold: number;
    transport: EvaluationTransport;
  };
  generatedAt: string;
  results: CaseEvaluationResult[];
  runId: string;
  summary: EvaluationSummary;
}
