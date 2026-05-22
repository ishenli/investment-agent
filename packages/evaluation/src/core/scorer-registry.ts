/**
 * Scorer Registry
 *
 * 统一注册和管理 @mastra/evals 评分器与本地评分器。
 * 隔离 Mastra API 变更，提供项目内部稳定的评分器调用接口。
 */
import type { EvaluationRunRecord, ScorerResult } from './types';

export type MastraModelConfig = string | { provider: string; name: string; apiKey?: string };

export interface ScorerRegistryOptions {
  /** LLM-as-Judge 模型配置，如 'openai/gpt-4o-mini' */
  model: MastraModelConfig;
}

interface MastraScorerLike {
  run(input: { input?: unknown; output?: unknown; groundTruth?: unknown }): Promise<{
    score: number;
    reason?: string;
  }>;
}

export interface CaseContext {
  availableTools: string[];
  expectedTrajectory: string[];
}

type ScorerFactory = (ctx: CaseContext) => MastraScorerLike | null;

export class ScorerRegistry {
  private llmScorers = new Map<string, MastraScorerLike>();
  private llmFactories = new Map<string, ScorerFactory>();
  private codeFactories = new Map<string, ScorerFactory>();
  private initialized = false;
  private readonly options: ScorerRegistryOptions;

  constructor(options: ScorerRegistryOptions) {
    this.options = options;
  }

  /**
   * 初始化并加载所有 @mastra/evals 评分器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const llm: Record<string, any> = await this.dynamicImport('@mastra/evals/scorers/llm');
      const code: Record<string, any> = await this.dynamicImport('@mastra/evals/scorers/code');

      const model = this.normalizeModelConfig(this.options.model);

      // === LLM Scorers ===
      if (llm.createAnswerRelevancyScorer) {
        this.llmScorers.set('answer-relevancy', llm.createAnswerRelevancyScorer({ model }));
      }
      if (llm.createToxicityScorer) {
        this.llmScorers.set('toxicity', llm.createToxicityScorer({ model }));
      }
      if (llm.createBiasScorer) {
        this.llmScorers.set('bias', llm.createBiasScorer({ model }));
      }
      if (llm.createHallucinationScorer) {
        this.llmScorers.set('hallucination', llm.createHallucinationScorer({ model }));
      }
      if (llm.createPromptAlignmentScorerLLM) {
        this.llmScorers.set('prompt-alignment', llm.createPromptAlignmentScorerLLM({ model }));
      }
      if (llm.createContextRelevanceScorerLLM) {
        this.llmScorers.set('context-relevance', llm.createContextRelevanceScorerLLM({ model }));
      }
      if (llm.createContextPrecisionScorer) {
        this.llmScorers.set('context-precision', llm.createContextPrecisionScorer({ model }));
      }
      if (llm.createFaithfulnessScorer) {
        this.llmScorers.set('faithfulness', llm.createFaithfulnessScorer({ model }));
      }
      if (llm.createNoiseSensitivityScorerLLM) {
        this.llmScorers.set('noise-sensitivity', llm.createNoiseSensitivityScorerLLM({ model }));
      }
      // tool-call-accuracy-llm and trajectory-llm are created per-case via runWithContext()
      // because they need case-specific availableTools / expectedTrajectory
      this.llmFactories.set('tool-call-accuracy-llm', (ctx) =>
        llm.createToolCallAccuracyScorerLLM ? llm.createToolCallAccuracyScorerLLM({ model, availableTools: ctx.availableTools }) : null);
      this.llmFactories.set('trajectory-llm', (ctx) =>
        llm.createTrajectoryAccuracyScorerLLM ? llm.createTrajectoryAccuracyScorerLLM({ model, expectedTrajectory: ctx.expectedTrajectory }) : null);

      // === Code Scorers (无需 LLM) ===
      if (code.createCompletenessScorer) {
        this.llmScorers.set('completeness', code.createCompletenessScorer());
      }
      if (code.createContentSimilarityScorer) {
        this.llmScorers.set('content-similarity', code.createContentSimilarityScorer());
      }
      if (code.createKeywordCoverageScorer) {
        this.llmScorers.set('keyword-coverage', code.createKeywordCoverageScorer());
      }
      if (code.createToneScorer) {
        this.llmScorers.set('tone', code.createToneScorer());
      }
      if (code.createTextualDifferenceScorer) {
        this.llmScorers.set('textual-difference', code.createTextualDifferenceScorer());
      }
      // tool-call-accuracy-code is created per-case via runWithContext()
      this.codeFactories.set('tool-call-accuracy-code', (ctx) =>
        code.createToolCallAccuracyScorerCode ? code.createToolCallAccuracyScorerCode({ availableTools: ctx.availableTools }) : null);
      this.codeFactories.set('trajectory-code', (ctx) =>
        code.createTrajectoryAccuracyScorerCode ? code.createTrajectoryAccuracyScorerCode({ expectedTrajectory: ctx.expectedTrajectory }) : null);

      this.initialized = true;
    } catch (error) {
      console.warn('[ScorerRegistry] Failed to load @mastra/evals scorers:', error instanceof Error ? error.message : error);
      this.initialized = true;
    }
  }

  /**
   * 运行指定评分器
   */
  async run(
    name: string,
    record: EvaluationRunRecord,
    options?: { expected?: string; keywords?: string[] },
  ): Promise<ScorerResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const scorer = this.llmScorers.get(name);
    if (!scorer) {
      return {
        dimension: 'execution',
        name,
        passed: false,
        reason: `Scorer "${name}" not available.`,
        score: 0,
      };
    }

    try {
      const input = typeof record.input === 'string' ? record.input : record.messages.map((m) => m.content).join('\n');
      const output = record.output;

      const scorerInput: Record<string, unknown> = {
        input,
        output,
      };

      if (options?.expected) {
        scorerInput.groundTruth = options.expected;
      }
      if (options?.keywords) {
        scorerInput.keywords = options.keywords;
      }

      const result = await scorer.run(scorerInput as any);
      const score = Math.max(0, Math.min(1, Number(result.score)));

      return {
        dimension: this.inferDimension(name),
        name,
        passed: score >= 0.5,
        reason: result.reason ?? `${name} scored ${score.toFixed(3)}`,
        score,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        dimension: this.inferDimension(name),
        name,
        passed: false,
        reason: `Scorer error: ${message}`,
        score: 0,
      };
    }
  }

  /**
   * 运行需要 per-case context 的评分器（tool-call-accuracy, trajectory）
   */
  async runWithContext(
    name: string,
    record: EvaluationRunRecord,
    context: CaseContext,
    options?: { expected?: string; keywords?: string[] },
  ): Promise<ScorerResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const factory = this.llmFactories.get(name) ?? this.codeFactories.get(name);
    if (!factory) {
      return this.run(name, record, options);
    }

    const scorer = factory(context);
    if (!scorer) {
      return {
        dimension: this.inferDimension(name),
        name,
        passed: false,
        reason: `Scorer "${name}" factory returned null.`,
        score: 0,
      };
    }

    try {
      const input = typeof record.input === 'string' ? record.input : record.messages.map((m) => m.content).join('\n');
      const scorerInput: Record<string, unknown> = { input, output: record.output };
      if (options?.expected) scorerInput.groundTruth = options.expected;

      const result = await scorer.run(scorerInput as any);
      const score = Math.max(0, Math.min(1, Number(result.score)));

      return {
        dimension: this.inferDimension(name),
        name,
        passed: score >= 0.5,
        reason: result.reason ?? `${name} scored ${score.toFixed(3)}`,
        score,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        dimension: this.inferDimension(name),
        name,
        passed: false,
        reason: `Scorer error: ${message}`,
        score: 0,
      };
    }
  }

  /**
   * 列出所有已注册的评分器名称
   */
  listScorers(): string[] {
    return Array.from(this.llmScorers.keys());
  }

  /**
   * 检查评分器是否可用
   */
  has(name: string): boolean {
    return this.llmScorers.has(name);
  }

  private inferDimension(name: string): ScorerResult['dimension'] {
    const dimMap: Record<string, ScorerResult['dimension']> = {
      'answer-relevancy': 'execution',
      'completeness': 'execution',
      'content-similarity': 'execution',
      'keyword-coverage': 'execution',
      'tone': 'execution',
      'context-relevance': 'context',
      'context-precision': 'context',
      'tool-call-accuracy-llm': 'action',
      'tool-call-accuracy-code': 'action',
      'trajectory-llm': 'action',
      'trajectory-code': 'action',
      'hallucination': 'execution',
      'faithfulness': 'execution',
      'noise-sensitivity': 'execution',
      'textual-difference': 'execution',
      'toxicity': 'ethics',
      'bias': 'ethics',
      'prompt-alignment': 'ethics',
    };
    return dimMap[name] ?? 'execution';
  }

  private normalizeModelConfig(config: MastraModelConfig) {
    if (typeof config === 'string') {
      const [provider, name] = config.split('/');
      if (provider && name) {
        return { provider, name };
      }
      return config;
    }
    return config;
  }

  private async dynamicImport(specifier: string): Promise<Record<string, unknown>> {
    try {
      const mod = await import(specifier);
      return mod as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

let globalRegistry: ScorerRegistry | null = null;

export function getGlobalRegistry(options?: ScorerRegistryOptions): ScorerRegistry {
  if (!globalRegistry && options) {
    globalRegistry = new ScorerRegistry(options);
  }
  if (!globalRegistry) {
    throw new Error('ScorerRegistry not initialized. Call getGlobalRegistry({ model }) first.');
  }
  return globalRegistry;
}

export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
