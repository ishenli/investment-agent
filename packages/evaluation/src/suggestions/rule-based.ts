import type { CaseEvaluationResult, EvaluationReport, ScorerResult } from '../core/types';
import type { EvaluationSuggestion, SuggestionCategory, SuggestionEffort, SuggestionPriority } from './types';

interface SuggestionTemplate {
  category: SuggestionCategory;
  description: string;
  effort: SuggestionEffort;
  priority: SuggestionPriority;
  title: string;
}

const dimensionSuggestions: Record<ScorerResult['dimension'], SuggestionTemplate> = {
  mission: {
    category: 'timeout',
    description: '大量用例因超时或连接失败导致任务未完成。建议增加 timeoutMs（推荐 180s），并确认 Agent API 端点可达且响应稳定。',
    effort: 'small',
    priority: 'high',
    title: '增加评测超时时间并检查 API 连通性',
  },
  action: {
    category: 'system-prompt',
    description: 'Agent 倾向于直接回答问题而非调用工具获取实时数据。建议在 system prompt 中加入明确指令：当用户询问具体股票、持仓、市场数据时，必须先调用对应工具获取最新数据。',
    effort: 'medium',
    priority: 'high',
    title: '在 System Prompt 中强化工具调用引导',
  },
  context: {
    category: 'architecture',
    description: '多轮对话中 Agent 未能引用前几轮提到的实体（股票代码、金额、用户偏好）。检查是否完整传递了历史消息，以及 context window 是否足够容纳多轮会话。',
    effort: 'medium',
    priority: 'medium',
    title: '确保多轮对话传递完整历史上下文',
  },
  execution: {
    category: 'knowledge',
    description: 'Agent 输出未覆盖预期的关键词和分析维度。建议扩展 Agent 知识库或 skill 配置，确保其能覆盖估值指标、行业分析、技术指标等分析维度。',
    effort: 'large',
    priority: 'medium',
    title: '扩展 Agent 知识库和分析能力覆盖度',
  },
  ethics: {
    category: 'system-prompt',
    description: 'Agent 的投资分析回复缺少风险警告和免责声明。建议在 system prompt 末尾添加强制风险提示模板，要求每次涉及投资建议时必须附加风险披露。',
    effort: 'small',
    priority: 'high',
    title: '在 System Prompt 中追加风险免责模板',
  },
};

interface ScorerPattern {
  match: (reason: string) => boolean;
  template: SuggestionTemplate;
}

const scorerPatterns: ScorerPattern[] = [
  {
    match: (r) => /Missing:.*disclaimer/i.test(r),
    template: {
      category: 'system-prompt',
      description: '在 system prompt 中要求 Agent 对所有投资相关回答附加标准免责声明，如"以上分析仅供参考，不构成投资建议"。',
      effort: 'small',
      priority: 'high',
      title: '添加固定风险提示后缀',
    },
  },
  {
    match: (r) => /Missing:.*specific-risk/i.test(r),
    template: {
      category: 'system-prompt',
      description: '要求 Agent 在分析特定股票时指出该标的的具体风险因素（如集中度风险、行业周期风险、估值过高风险等）。',
      effort: 'small',
      priority: 'medium',
      title: '要求 Agent 输出具体风险因素',
    },
  },
  {
    match: (r) => /Matched 0\/\d+ expected tools/i.test(r),
    template: {
      category: 'tool-config',
      description: 'Agent 完全没有调用预期的工具。检查工具是否正确注册，以及 system prompt 是否有明确的工具使用引导。',
      effort: 'medium',
      priority: 'high',
      title: '检查工具注册和调用引导配置',
    },
  },
  {
    match: (r) => /Referenced 0\/\d+ entities/i.test(r),
    template: {
      category: 'architecture',
      description: '在多轮对话中 Agent 完全未引用前几轮出现的实体。确认历史消息已完整传递，并检查 prompt 中是否有指令要求 Agent 关联前文。',
      effort: 'medium',
      priority: 'medium',
      title: '修复多轮对话上下文丢失',
    },
  },
  {
    match: (r) => /Contradictory signals/i.test(r),
    template: {
      category: 'system-prompt',
      description: 'Agent 在同一段落中输出了矛盾信号。建议在 system prompt 中要求分析时先列出看多/看空因素，然后给出综合判断，避免前后矛盾。',
      effort: 'small',
      priority: 'medium',
      title: '引导 Agent 结构化分析避免矛盾输出',
    },
  },
  {
    match: (r) => /Run failed|response was too short/i.test(r),
    template: {
      category: 'timeout',
      description: 'Agent 执行失败或返回内容过短。可能是超时、API 错误或模型生成异常。检查日志确认具体失败原因。',
      effort: 'small',
      priority: 'high',
      title: '排查 Agent 运行失败根因',
    },
  },
  {
    match: (r) => /Missing:.*actionability/i.test(r),
    template: {
      category: 'system-prompt',
      description: 'Agent 回答缺乏可操作性。建议在 system prompt 中要求给出具体、可执行的建议（如具体的买入价位、仓位比例、时间框架）而非笼统描述。',
      effort: 'small',
      priority: 'medium',
      title: '提升回答的可操作性',
    },
  },
];

function makeSuggestionId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(3, '0')}`;
}

function findAffectedCases(results: CaseEvaluationResult[], dimension: ScorerResult['dimension'], threshold: number): string[] {
  return results
    .filter((r) => !r.passed && r.dimensionScores[dimension] < threshold)
    .map((r) => r.case.id);
}

export function generateRuleBasedSuggestions(report: EvaluationReport): EvaluationSuggestion[] {
  const suggestions: EvaluationSuggestion[] = [];
  const failedResults = report.results.filter((r) => !r.passed);
  let idx = 0;

  // Dimension-level suggestions
  for (const [dimension, score] of Object.entries(report.summary.byDimension)) {
    if (score < report.config.threshold) {
      const dim = dimension as ScorerResult['dimension'];
      const template = dimensionSuggestions[dim];
      const affected = findAffectedCases(report.results, dim, report.config.threshold);
      if (affected.length > 0) {
        suggestions.push({
          ...template,
          affectedCases: affected,
          dimension: dim,
          id: makeSuggestionId('rule-dim', idx++),
          source: 'rule',
        });
      }
    }
  }

  // Scorer-level pattern matching
  const seenPatterns = new Set<number>();

  for (const result of failedResults) {
    for (const scorer of result.scorers) {
      if (scorer.passed) continue;

      for (let pi = 0; pi < scorerPatterns.length; pi++) {
        const pattern = scorerPatterns[pi];
        if (!seenPatterns.has(pi) && pattern.match(scorer.reason)) {
          const affected = failedResults
            .filter((r) => r.scorers.some((s) => !s.passed && pattern.match(s.reason)))
            .map((r) => r.case.id);

          suggestions.push({
            ...pattern.template,
            affectedCases: affected,
            dimension: scorer.dimension,
            id: makeSuggestionId('rule-scorer', idx++),
            source: 'rule',
          });
          seenPatterns.add(pi);
        }
      }
    }
  }

  return suggestions;
}
