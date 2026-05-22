import type { BenchmarkCase, EvaluationRunRecord, ScorerResult } from '../core/types';

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

/**
 * 提取字符串中的数字数据
 * 支持格式：$123.45, 123.45%, 1,234.56, 123.45
 */
function extractNumbers(text: string): Array<{ raw: string; value: number }> {
  const results: Array<{ raw: string; value: number }> = [];
  // 匹配货币、百分比和数字
  const regex = /(?:(?:\$|€|¥)\s*)?([\d,]+(?:\.\d+)?)\s*(?:%|USD|EUR|CNY|bps)?/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const numStr = match[1].replace(/,/g, '');
    const value = Number.parseFloat(numStr);
    if (!Number.isNaN(value)) {
      results.push({ raw, value });
    }
  }
  return results;
}

function includesInsensitive(text: string, fragment: string): boolean {
  return text.toLowerCase().includes(fragment.toLowerCase());
}

/**
 * 数据准确性评分器
 *
 * 评估 Agent 响应中的金融数据是否包含合理的数值范围和格式。
 * 规则（启发式，非实时交叉验证）：
 * 1. 股价应当在 0.001 ~ 100000 范围内
 * 2. 百分比应当在 -100% ~ 10000% 范围内
 * 3. 日期引用应当存在
 * 4. 不应有自相矛盾的数字
 */
export function scoreDataAccuracy(_: BenchmarkCase, record: EvaluationRunRecord): ScorerResult {
  const output = record.output;
  const numbers = extractNumbers(output);

  if (numbers.length === 0) {
    return {
      dimension: 'execution',
      name: 'data-accuracy',
      passed: true,
      reason: 'No numeric data present in response.',
      score: 1,
    };
  }

  const errors: string[] = [];
  let validCount = 0;

  for (const item of numbers) {
    const { value } = item;
    // 股价或金额合理性
    if (item.raw.includes('$') || item.raw.includes('USD')) {
      if (value < 0 || value > 100_000) {
        errors.push(`Suspicious price: ${item.raw}`);
      } else {
        validCount += 1;
      }
    } else if (item.raw.includes('%')) {
      if (value < -100 || value > 10_000) {
        errors.push(`Suspicious percentage: ${item.raw}`);
      } else {
        validCount += 1;
      }
    } else {
      // 普通数字
      if (value < -1_000_000_000 || value > 1_000_000_000) {
        errors.push(`Suspicious magnitude: ${item.raw}`);
      } else {
        validCount += 1;
      }
    }
  }

  // 检查日期引用
  const hasDateReference =
    /\b(?:19|20)\d{2}\b/.test(output) || // 年份
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i.test(output) ||
    /\b(?:today|yesterday|last week|recent|latest)\b/i.test(output);

  if (!hasDateReference) {
    errors.push('Missing date/time reference for financial data.');
  }

  // 检查自相矛盾（如 "上涨 5%" 和 "下跌 5%" 同时出现）
  const riseSignals = ['rise', 'gain', 'up', 'increase', 'bull', 'rally'].filter((w) => includesInsensitive(output, w));
  const fallSignals = ['fall', 'loss', 'down', 'decrease', 'bear', 'drop'].filter((w) => includesInsensitive(output, w));
  if (riseSignals.length > 0 && fallSignals.length > 0) {
    // 检查是否在同一句子中
    const sentences = output.split(/[.!?。！？]+/);
    for (const sentence of sentences) {
      const hasRise = riseSignals.some((w) => includesInsensitive(sentence, w));
      const hasFall = fallSignals.some((w) => includesInsensitive(sentence, w));
      if (hasRise && hasFall) {
        errors.push(`Contradictory signals in same sentence: "${sentence.trim()}"`);
      }
    }
  }

  const score = clampScore(validCount / numbers.length * (errors.length === 0 ? 1 : 0.7));
  const passed = errors.length === 0 && numbers.length > 0;

  return {
    dimension: 'execution',
    name: 'data-accuracy',
    passed,
    reason: errors.length === 0
      ? `All ${numbers.length} numeric values appear reasonable.`
      : `Issues found: ${errors.join('; ')}`,
    score,
  };
}
