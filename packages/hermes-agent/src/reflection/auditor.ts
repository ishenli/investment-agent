/**
 * ReflectionAuditor — loads framework, detects domain relevance, and runs LLM audit.
 */

import * as fs from 'node:fs';
import { complete, type Model, type Api } from '@mariozechner/pi-ai';
import type {
  FrameworkConfig,
  Dimension,
  AuditResult,
  DimensionAudit,
} from './types';
import { buildAuditPrompt } from './prompts';

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
