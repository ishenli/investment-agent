import type { CaseEvaluationResult, EvaluationReport } from '../core/types';
import type { EvaluationSuggestion } from './types';

interface LlmJudgeOptions {
  baseUrl?: string;
  model?: string;
  provider?: string;
}

function buildPrompt(failedResults: CaseEvaluationResult[]): string {
  const caseSummaries = failedResults.slice(0, 10).map((r) => {
    const failedScorers = r.scorers
      .filter((s) => !s.passed)
      .map((s) => `  - [${s.dimension}] ${s.name}: ${s.reason}`)
      .join('\n');

    const inputPreview = typeof r.case.input === 'string'
      ? r.case.input.substring(0, 200)
      : r.case.input.map((m) => `[${m.role}] ${m.content.substring(0, 100)}`).join('\n    ');

    return `Case: ${r.case.id} (${r.case.title})
  Score: ${r.score.toFixed(3)}
  Category: ${r.case.category}
  Input: ${inputPreview}
  Output: ${(r.record.output || '(empty)').substring(0, 300)}
  Failed scorers:
${failedScorers}`;
  });

  return `You are an expert evaluator for an AI investment analysis agent. Analyze the following failed evaluation cases and generate actionable improvement suggestions.

## Failed Cases

${caseSummaries.join('\n\n')}

## Instructions

Based on the failure patterns above, generate 3-5 specific, actionable improvement suggestions. For each suggestion, output a JSON object with these fields:

- "dimension": one of "mission", "action", "context", "execution", "ethics"
- "category": one of "system-prompt", "tool-config", "timeout", "knowledge", "architecture"
- "title": concise title (under 30 chars)
- "description": detailed actionable description (2-3 sentences)
- "priority": "high", "medium", or "low"
- "effort": "small", "medium", or "large"
- "affectedCases": array of case IDs this suggestion addresses

Output ONLY a JSON array of suggestions, no other text.`;
}

function parseLlmResponse(response: string, startIdx: number): EvaluationSuggestion[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
    return parsed.map((item, i) => ({
      affectedCases: Array.isArray(item.affectedCases) ? item.affectedCases as string[] : [],
      category: (item.category as EvaluationSuggestion['category']) || 'system-prompt',
      description: String(item.description || ''),
      dimension: (item.dimension as EvaluationSuggestion['dimension']) || 'execution',
      effort: (item.effort as EvaluationSuggestion['effort']) || 'medium',
      id: `llm-${(startIdx + i).toString().padStart(3, '0')}`,
      priority: (item.priority as EvaluationSuggestion['priority']) || 'medium',
      source: 'llm' as const,
      title: String(item.title || ''),
    }));
  } catch {
    return [];
  }
}

export async function generateLlmSuggestions(
  report: EvaluationReport,
  options: LlmJudgeOptions = {},
): Promise<EvaluationSuggestion[]> {
  const failedResults = report.results.filter((r) => !r.passed);
  if (failedResults.length === 0) return [];

  const baseUrl = options.baseUrl || 'http://localhost:3000';
  const model = options.model || 'gpt-4o-mini';
  const prompt = buildPrompt(failedResults);

  try {
    const response = await fetch(`${baseUrl}/api/chat/hermes`, {
      body: JSON.stringify({
        enableTools: false,
        maxIterations: 1,
        messages: [{ content: prompt, role: 'user' }],
        model,
        provider: options.provider || 'openai',
        sessionId: `eval-judge-${Date.now()}`,
        systemPrompt: 'You are an evaluation expert. Output only valid JSON.',
        topicId: 'evaluation-judge',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok || !response.body) return [];

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text' && event.delta) {
            fullText += event.delta;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }

    const existingRuleCount = report.suggestions?.length ?? 0;
    return parseLlmResponse(fullText, existingRuleCount);
  } catch (error) {
    console.warn('[LLM-Judge] Failed to generate suggestions:', error instanceof Error ? error.message : error);
    return [];
  }
}
