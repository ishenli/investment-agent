import { getGlobalRegistry, type MastraModelConfig } from './scorer-registry';
import { scoreKeywordCoverage } from './scorers';
import { scoreProhibitedWords, scoreRiskDisclosure } from '../scorers';
import type { BenchmarkCase, EvaluationRunRecord, ScorerResult } from './types';

interface WrapperOptions {
  expected?: string;
  keywords?: string[];
  model?: MastraModelConfig;
}

async function runMastraScorer(
  name: string,
  record: EvaluationRunRecord,
  model: MastraModelConfig,
  options?: WrapperOptions,
): Promise<ScorerResult | null> {
  const registry = getGlobalRegistry({ model });
  if (!registry.has(name)) return null;
  const result = await registry.run(name, record, options);
  if (result.score === 0 && result.reason.includes('not available')) return null;
  return result;
}

/** 运行 Mastra 内容相似度评分器，失败时降级到本地关键词覆盖评分器。 */
export async function runContentSimilarityWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('content-similarity', record, options?.model ?? 'openai/gpt-4o-mini', options);
  if (result) return result;
  return scoreKeywordCoverage(_testCase, record);
}

/** 运行 Mastra 完整性评分器，失败时降级到本地关键词覆盖评分器。 */
export async function runCompletenessWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('completeness', record, options?.model ?? 'openai/gpt-4o-mini', options);
  if (result) return result;
  return scoreKeywordCoverage(_testCase, record);
}

/** 运行 Mastra 相关性评分器 */
export async function runAnswerRelevancyWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('answer-relevancy', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'execution',
    name: 'answer-relevancy',
    passed: false,
    reason: 'Skipped: Mastra answer-relevancy scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 毒性检测评分器 */
export async function runToxicityWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('toxicity', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'ethics',
    name: 'toxicity',
    passed: false,
    reason: 'Skipped: Mastra toxicity scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 偏见检测评分器 */
export async function runBiasWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('bias', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'ethics',
    name: 'bias',
    passed: false,
    reason: 'Skipped: Mastra bias scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 幻觉检测评分器 */
export async function runHallucinationWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('hallucination', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'execution',
    name: 'hallucination',
    passed: false,
    reason: 'Skipped: Mastra hallucination scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 提示对齐评分器 */
export async function runPromptAlignmentWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('prompt-alignment', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'ethics',
    name: 'prompt-alignment',
    passed: false,
    reason: 'Skipped: Mastra prompt-alignment scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 上下文相关性评分器 */
export async function runContextRelevanceWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('context-relevance', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'context',
    name: 'context-relevance',
    passed: false,
    reason: 'Skipped: Mastra context-relevance scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 信实度评分器 */
export async function runFaithfulnessWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('faithfulness', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'execution',
    name: 'faithfulness',
    passed: false,
    reason: 'Skipped: Mastra faithfulness scorer not available.',
    score: 0,
  };
}

/** 运行 Mastra 关键词覆盖评分器，失败时降级到本地。 */
export async function runKeywordCoverageWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('keyword-coverage', record, options?.model ?? 'openai/gpt-4o-mini', options);
  if (result) return result;
  return scoreKeywordCoverage(_testCase, record);
}

/** 运行 Mastra 语调评分器 */
export async function runToneWrapper(
  _testCase: BenchmarkCase,
  record: EvaluationRunRecord,
  options?: WrapperOptions,
): Promise<ScorerResult> {
  const result = await runMastraScorer('tone', record, options?.model ?? 'openai/gpt-4o-mini');
  if (result) return result;
  return {
    dimension: 'execution',
    name: 'tone',
    passed: false,
    reason: 'Skipped: Mastra tone scorer not available.',
    score: 0,
  };
}

/** 运行本地风险披露评分器 */
export function runRiskDisclosureWrapper(
  testCase: BenchmarkCase,
  record: EvaluationRunRecord,
): ScorerResult {
  return scoreRiskDisclosure(testCase, record);
}

/** 运行本地禁止用语评分器 */
export function runProhibitedWordsWrapper(
  testCase: BenchmarkCase,
  record: EvaluationRunRecord,
): ScorerResult {
  return scoreProhibitedWords(testCase, record);
}
