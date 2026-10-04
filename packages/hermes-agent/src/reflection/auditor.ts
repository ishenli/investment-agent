/**
 * ReflectionAuditor — loads framework, detects domain relevance, and runs LLM audit.
 */

import * as fs from 'node:fs';
import { complete, type Model, type Api } from '@earendil-works/pi-ai/compat';
import type {
  FrameworkConfig,
  Dimension,
  AuditResult,
  DimensionAudit,
} from './types';
import { buildAuditPrompt, buildFollowUpPrompt } from './prompts';

export class ReflectionAuditor {
  private framework: FrameworkConfig | null = null;
  private readonly frameworksPath: string;

  constructor(frameworksPath: string) {
    this.frameworksPath = frameworksPath;
  }

  /**
   * Lazily load and cache the framework JSON (async).
   */
  async loadFramework(): Promise<FrameworkConfig | null> {
    if (this.framework) return this.framework;

    try {
      const raw = await fs.promises.readFile(this.frameworksPath, 'utf-8');
      const parsed = JSON.parse(raw) as FrameworkConfig;

      if (!parsed.dimensions || !Array.isArray(parsed.dimensions)) {
        console.warn('[ReflectionAuditor] Framework missing dimensions array');
        return null;
      }

      this.framework = parsed;
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ReflectionAuditor] Failed to load framework: ${msg}`);
      return null;
    }
  }

  /**
   * Quick keyword-based check to see if conversation is investment-related.
   */
  async isDomainRelevant(messages: string[]): Promise<boolean> {
    const framework = await this.loadFramework();
    if (!framework) return false;

    const keywords = framework.domainKeywords || [];
    const text = messages.join(' ').toLowerCase();

    return keywords.some((kw) => text.includes(kw.toLowerCase()));
  }

  /**
   * Run the full audit against the agent's final response.
   */
  async audit(
    model: Model<Api>,
    messages: string[],
    finalResponse: string,
    maxTokens = 2000,
  ): Promise<AuditResult> {
    const framework = await this.loadFramework();
    if (!framework) {
      return { domainRelevant: false, dimensions: [], covered: [], missing: [] };
    }

    if (!(await this.isDomainRelevant([...messages, finalResponse]))) {
      return { domainRelevant: false, dimensions: [], covered: [], missing: [] };
    }

    const prompt = buildAuditPrompt(framework, messages, finalResponse);

    try {
      const response = await complete(
        model,
        {
          systemPrompt:
            'You are a structured audit engine. Always respond with valid JSON only. No markdown formatting.',
          messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
          tools: [],
        },
        { maxTokens },
      );

      const text = extractText(response);
      const parsed = parseAuditJson(text);
      const result = normalizeResult(parsed, framework.dimensions);
      result.rawResponse = text;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ReflectionAuditor] Audit LLM call failed: ${msg}`);
      return { domainRelevant: true, dimensions: [], covered: [], missing: [] };
    }
  }

  /**
   * 生成最多 3 条投资域相关的追问问题（相关建议）。
   *
   * fail-soft：域外、LLM 调用失败/超时、或输出无法解析时一律返回空数组，绝不抛出。
   * @param messages 用户历史消息（纯文本）
   * @param finalResponse 助手最终回答
   * @returns 追问数组，长度 ≤ 3
   */
  async generateFollowUpQuestions(
    model: Model<Api>,
    messages: string[],
    finalResponse: string,
    options?: { apiKey?: string; maxTokens?: number; signal?: AbortSignal; timeoutMs?: number },
  ): Promise<string[]> {
    const allText = [...messages, finalResponse];
    if (!(await this.isDomainRelevant(allText))) return [];

    const prompt = buildFollowUpPrompt(messages, finalResponse);

    try {
      const response = await complete(
        model,
        {
          systemPrompt:
            'You are an investment assistant. Always respond with valid JSON only. No markdown formatting.',
          messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
          tools: [],
        },
        {
          apiKey: options?.apiKey,
          maxTokens: options?.maxTokens ?? 800,
          signal: options?.signal,
          timeoutMs: options?.timeoutMs ?? 5000,
        },
      );

      const text = extractText(response);
      const items = parseFollowUpItems(text);

      // 双保险：无论模型输出多少条，都截断到 ≤3
      return items.slice(0, 3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ReflectionAuditor] Follow-up generation failed: ${msg}`);
      return [];
    }
  }
}

// ============== Internal Helpers ==============

interface PiMessage {
  content: unknown;
}

function extractText(msg: PiMessage): string {
  if (typeof msg.content === 'string') {
    return msg.content.trim();
  }

  if (Array.isArray(msg.content)) {
    return (msg.content as Array<{ type: string; text?: unknown }>)
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();
  }

  console.warn('[ReflectionAuditor] Unexpected content shape:', typeof msg.content);
  return String(msg.content ?? '').trim();
}

interface ParsedAuditJson {
  domainRelevant?: boolean;
  dimensions?: Array<{
    dimensionId?: string;
    covered?: boolean;
    evidence?: string;
  }>;
}

function parseAuditJson(text: string): ParsedAuditJson {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(cleaned) as ParsedAuditJson;
  } catch {
    // Fallback: try to extract a well-formed JSON object using a strict pattern
    // Match the outermost pair of braces by counting balanced brackets
    const match = extractBalancedBraces(cleaned);
    if (match) {
      try {
        return JSON.parse(match) as ParsedAuditJson;
      } catch {
        // ignore — malformed JSON cannot be recovered safely
      }
    }
    return {};
  }
}

/**
 * Extract the outermost balanced pair of { ... } from text.
 * Returns null if no balanced object is found.
 */
function extractBalancedBraces(text: string): string | null {
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * 从模型输出解析追问字符串数组（容错）。
 * 支持的形态：裸数组 ["a","b"] / 包着一层的对象（含若数组字段）{"questions":["a","b"]}
 * / 带 ``` 代码块的 JSON / 无 JSON 时的编号或 dash 列表行。
 * 统一去空串、去重。
 */
function parseFollowUpItems(text: string): string[] {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = extractBalancedArray(cleaned) ?? extractArrayInsideObject(cleaned);
    if (match) {
      try {
        parsed = JSON.parse(match);
      } catch {
        return parseLineList(cleaned);
      }
    } else {
      return parseLineList(cleaned);
    }
  }

  return Array.from(new Set(extractStrings(parsed)));
}

/**
 * 从 { ... } 内再取最内层平衡的 [ ... ]（对象形如 {"questions":["a","b"]} 时用）。
 * 找不到返回 null。
 */
function extractArrayInsideObject(text: string): string | null {
  const obj = extractBalancedBraces(text);
  if (!obj) return null;
  return extractBalancedArray(obj);
}

/**
 * 从 JSON 中提取字符串项：数组则取 string 项；对象则递归收集任意数组字段的 string 项。
 */
function extractStrings(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') out.push(item);
        else walk(item);
      }
    } else if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) walk((v as Record<string, unknown>)[k]);
    }
  };
  walk(value);
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * 无 JSON 时的文本兜底：按行解析 "N. 内容"、"1）内容"、"· 内容" 等列表行。
 */
function parseLineList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*(?:\d+[.、)．]|[-*·•])\s*(.+)$/);
      return match?.[1]?.trim() ?? '';
    })
    .filter((line) => line.length > 0);
}

/**
 * 提取最外层平衡的 [ ... ]（字符串数组）。找不到或无法匹配时返回 null。
 */
function extractBalancedArray(text: string): string | null {
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === ']') {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeResult(
  parsed: ParsedAuditJson,
  frameworkDimensions: Dimension[],
): AuditResult {
  const domainRelevant = parsed.domainRelevant !== false;
  const rawDims = Array.isArray(parsed.dimensions) ? parsed.dimensions : [];

  const dimensions: DimensionAudit[] = frameworkDimensions.map((fd) => {
    const match = rawDims.find((d) => d.dimensionId === fd.id);
    return {
      dimensionId: fd.id,
      dimensionName: fd.name,
      covered: match?.covered === true,
      evidence: match?.evidence || '',
      description: fd.description,
      keywords: fd.keywords,
    };
  });

  return {
    domainRelevant,
    dimensions,
    covered: dimensions.filter((d) => d.covered),
    missing: dimensions.filter((d) => !d.covered),
  };
}
