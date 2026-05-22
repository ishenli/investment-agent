import crypto from 'node:crypto';
import type { BenchmarkCase, EvaluationEngine, EvaluationRunRecord, EvaluationToolCall } from './types';

function inputToText(input: BenchmarkCase['input']): string {
  return typeof input === 'string' ? input : input.map((message) => message.content).join('\n');
}

function buildToolCalls(testCase: BenchmarkCase): EvaluationToolCall[] {
  return testCase.expected.tools.map((name) => ({
    args: { query: inputToText(testCase.input).slice(0, 80) },
    durationMs: 25,
    isError: false,
    name,
    result: { ok: true, source: 'benchmark-fixture' },
  }));
}

export async function runMockCase(
  testCase: BenchmarkCase,
  engine: EvaluationEngine = 'mock',
): Promise<EvaluationRunRecord> {
  const startedAt = new Date();
  const inputText = inputToText(testCase.input);
  const keywordText = testCase.expected.keywords.join(', ');
  const output = [
    `Benchmark response for ${testCase.title}.`,
    `It addresses ${keywordText}.`,
    `The analysis references source quality and context where available.`,
    testCase.expected.requireRiskDisclosure
      ? 'Risk disclosure: investment decisions involve uncertainty, losses are possible, and this is not personalized financial advice.'
      : '',
  ].filter(Boolean).join(' ');
  const completedAt = new Date();

  return {
    agentId: 'benchmark-agent',
    caseId: testCase.id,
    completedAt: completedAt.toISOString(),
    cost: {
      inputTokens: Math.ceil(inputText.length / 4),
      latencyMs: completedAt.getTime() - startedAt.getTime(),
      model: 'mock-evaluator',
      outputTokens: Math.ceil(output.length / 4),
      totalTokens: Math.ceil((inputText.length + output.length) / 4),
    },
    engine,
    id: crypto.randomUUID(),
    input: testCase.input,
    messages: [
      ...(typeof testCase.input === 'string' ? [{ role: 'user' as const, content: testCase.input }] : testCase.input),
      { role: 'assistant', content: output },
    ],
    output,
    startedAt: startedAt.toISOString(),
    status: 'completed',
    toolCalls: buildToolCalls(testCase),
    trace: {
      metrics: [],
      spans: [],
      traceId: crypto.randomUUID(),
    },
  };
}

