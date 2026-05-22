import {
  scoreAdviceQuality,
  scoreDataAccuracy,
  scoreProhibitedWords,
  scoreRiskDisclosure,
} from '../scorers';
import type { BenchmarkCase, EvaluationRunRecord, ScorerResult } from './types';

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

function includesInsensitive(text: string, fragment: string): boolean {
  return text.toLowerCase().includes(fragment.toLowerCase());
}

export function scoreKeywordCoverage(testCase: BenchmarkCase, record: EvaluationRunRecord): ScorerResult {
  const keywords = testCase.expected.keywords;
  if (keywords.length === 0) {
    return {
      dimension: 'execution',
      name: 'keyword-coverage',
      passed: true,
      reason: 'No required keywords configured.',
      score: 1,
    };
  }

  const matched = keywords.filter((keyword) => includesInsensitive(record.output, keyword));
  const score = clampScore(matched.length / keywords.length);

  return {
    dimension: 'execution',
    name: 'keyword-coverage',
    passed: score >= testCase.expected.minKeywordCoverage,
    reason: `Matched ${matched.length}/${keywords.length} expected keywords.`,
    score,
  };
}

export function scoreToolCalls(testCase: BenchmarkCase, record: EvaluationRunRecord): ScorerResult {
  const expected = testCase.expected.tools;
  if (expected.length === 0) {
    return {
      dimension: 'action',
      name: 'tool-call-accuracy',
      passed: true,
      reason: 'No tool call required.',
      score: 1,
    };
  }

  const actual = record.toolCalls.map((tool) => tool.name);
  const matched = expected.filter((tool) => actual.includes(tool));
  const errored = record.toolCalls.filter((tool) => tool.isError).length;
  const score = clampScore((matched.length / expected.length) * (errored > 0 ? 0.5 : 1));

  return {
    dimension: 'action',
    name: 'tool-call-accuracy',
    passed: score >= 1,
    reason: `Matched ${matched.length}/${expected.length} expected tools; ${errored} errors.`,
    score,
  };
}

export function scoreMission(record: EvaluationRunRecord): ScorerResult {
  const hasOutput = record.status === 'completed' && record.output.trim().length > 30;
  const hasNoError = !record.error;

  return {
    dimension: 'mission',
    name: 'task-completion',
    passed: hasOutput && hasNoError,
    reason: hasOutput && hasNoError ? 'Run completed with a substantive response.' : 'Run failed or response was too short.',
    score: hasOutput && hasNoError ? 1 : 0,
  };
}

function extractEntities(text: string): string[] {
  const entities: Set<string> = new Set();

  // Stock tickers (2-5 uppercase letters)
  const tickers = text.match(/\b[A-Z]{2,5}\b/g);
  if (tickers) {
    for (const t of tickers) {
      if (!['THE', 'AND', 'FOR', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'ARE', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'DID', 'GET', 'LET', 'SAY', 'SHE', 'TOO', 'USE'].includes(t)) {
        entities.add(t);
      }
    }
  }

  // Percentages and dollar amounts
  const numbers = text.match(/\$[\d,.]+[BMK]?|\d+(?:\.\d+)?%/g);
  if (numbers) {
    for (const n of numbers) entities.add(n);
  }

  // Proper nouns (capitalized multi-word names)
  const properNouns = text.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
  if (properNouns) {
    for (const name of properNouns) entities.add(name);
  }

  // Key financial terms with numbers (e.g., "P/E 25", "52-week high")
  const financialTerms = text.match(/(?:P\/E|EPS|ROE|ROA|EBITDA)\s*(?:of\s*)?\d+(?:\.\d+)?/gi);
  if (financialTerms) {
    for (const term of financialTerms) entities.add(term);
  }

  return [...entities];
}

export function scoreContext(testCase: BenchmarkCase, record: EvaluationRunRecord): ScorerResult {
  if (!Array.isArray(testCase.input)) {
    return {
      dimension: 'context',
      name: 'context-retention',
      passed: true,
      reason: 'Single-turn case.',
      score: 1,
    };
  }

  const priorMessages = testCase.input.slice(0, -1);
  if (priorMessages.length === 0) {
    return {
      dimension: 'context',
      name: 'context-retention',
      passed: true,
      reason: 'No prior turns to reference.',
      score: 1,
    };
  }

  const priorText = priorMessages.map((m) => m.content).join(' ');
  const entities = extractEntities(priorText);

  if (entities.length === 0) {
    return {
      dimension: 'context',
      name: 'context-retention',
      passed: true,
      reason: 'No extractable entities in prior turns.',
      score: 1,
    };
  }

  const referenced = entities.filter((entity) => includesInsensitive(record.output, entity));
  const score = clampScore(referenced.length / entities.length);

  return {
    dimension: 'context',
    name: 'context-retention',
    passed: score >= 0.3,
    reason: `Referenced ${referenced.length}/${entities.length} entities from prior turns.`,
    score,
  };
}

export function runAllScorers(testCase: BenchmarkCase, record: EvaluationRunRecord): ScorerResult[] {
  return [
    scoreMission(record),
    scoreToolCalls(testCase, record),
    scoreContext(testCase, record),
    scoreKeywordCoverage(testCase, record),
    scoreRiskDisclosure(testCase, record),
    scoreProhibitedWords(testCase, record),
    scoreDataAccuracy(testCase, record),
    scoreAdviceQuality(testCase, record),
  ];
}
