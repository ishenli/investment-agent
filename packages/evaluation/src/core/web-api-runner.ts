import crypto from 'node:crypto';
import { EvaluationEventCollector } from '../adapters/event-collector';
import type {
  BenchmarkCase,
  EvaluationEngine,
  EvaluationMessage,
  EvaluationRunRecord,
} from './types';

export interface WebApiRunOptions {
  authToken?: string;
  baseUrl: string;
  cookie?: string;
  maxIterations: number;
  model: string;
  provider: string;
  timeoutMs: number;
}

interface StreamTokens {
  costUsd?: number;
  input?: number;
  output?: number;
  total?: number;
}

interface TraceMetrics {
  apiCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls?: number;
  totalLatencyMs?: number;
  totalTokens?: number;
}

interface TraceCost {
  totalCost?: number;
}

interface StreamState {
  finalContent?: string;
  sawText: boolean;
  tokens: StreamTokens;
  traceCost?: TraceCost;
  traceMetrics?: TraceMetrics;
}

interface StreamEvent {
  arguments?: unknown;
  code?: string;
  content?: unknown;
  cost?: TraceCost;
  delta?: string;
  durationMs?: number;
  message?: string;
  metrics?: TraceMetrics;
  name?: string;
  status?: 'ok' | 'error';
  tokens?: StreamTokens;
  toolName?: string;
  type?: string;
}

function inputToMessages(input: BenchmarkCase['input']): Array<Pick<EvaluationMessage, 'content' | 'role'>> {
  if (typeof input === 'string') {
    return [{ content: input, role: 'user' }];
  }

  return input
    .filter((message) => message.role !== 'tool')
    .map((message) => ({
      content: message.content,
      role: message.role,
    }));
}

function endpointForEngine(engine: Exclude<EvaluationEngine, 'mock'>): string {
  if (engine === 'hermes') return '/api/chat/hermes';
  if (engine === 'claude') return '/api/chat/claude';
  return '/api/chat/agent';
}

function buildRequestBody(
  testCase: BenchmarkCase,
  engine: Exclude<EvaluationEngine, 'mock'>,
  options: WebApiRunOptions,
): Record<string, unknown> {
  const sessionId = `evaluation-${testCase.id}-${crypto.randomUUID()}`;
  const messages = inputToMessages(testCase.input);

  if (engine === 'hermes') {
    return {
      enableTools: true,
      maxIterations: options.maxIterations,
      messages,
      model: options.model,
      provider: options.provider,
      sessionId,
      systemPrompt:
        'You are an investment analysis agent under evaluation. Be concise, factual, cite uncertainty, and include risk disclosure when giving investment-related guidance.',
      topicId: `evaluation-${testCase.category}`,
    };
  }

  if (engine === 'claude') {
    return {
      messages,
      mode: 'code',
      model: options.model,
      sessionId,
      stream: true,
      toolTimeout: Math.ceil(options.timeoutMs / 1000),
    };
  }

  return {
    agentId: 'investment_advisor',
    messages,
    model: options.model,
    sessionId,
  };
}

function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item && 'text' in item && typeof item.text === 'string') {
          return item.text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

function normalizeArgs(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function splitSseEvents(buffer: string): { pending: string; parts: string[] } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const pending = parts.pop() ?? '';
  return { pending, parts };
}

function parseSsePayload(part: string): StreamEvent | undefined {
  const payload = part
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!payload || payload === '[DONE]') return undefined;

  try {
    return JSON.parse(payload) as StreamEvent;
  } catch {
    return undefined;
  }
}

function applyStreamEvent(
  collector: EvaluationEventCollector,
  event: StreamEvent,
  state: StreamState,
): boolean {
  if (event.type === 'text' && typeof event.delta === 'string') {
    state.sawText = true;
    collector.addAssistantDelta(event.delta);
    return false;
  }

  if (event.type === 'result') {
    const content = extractContent(event.content);
    if (content) state.finalContent = content;
    if (event.tokens) state.tokens = { ...state.tokens, ...event.tokens };
    return false;
  }

  if (event.type === 'tool_use') {
    collector.addToolCall({
      args: normalizeArgs(event.arguments),
      isError: false,
      name: event.toolName ?? 'unknown_tool',
    });
    return false;
  }

  if (event.type === 'span_end' && event.name === 'tool_call') {
    collector.addToolCall({
      args: {},
      durationMs: event.durationMs,
      isError: event.status === 'error',
      name: event.toolName ?? 'tool_call',
    });
    return false;
  }

  if (event.type === 'trace_end') {
    state.traceMetrics = event.metrics;
    state.traceCost = event.cost;
    if (event.status === 'error' && event.message) {
      collector.fail(event.message, 'trace_error');
    }
    return false;
  }

  if (event.type === 'error') {
    collector.fail(event.message ?? 'Unknown stream error', event.code);
    return false;
  }

  return event.type === 'done';
}

export async function runWebApiCase(
  testCase: BenchmarkCase,
  engine: Exclude<EvaluationEngine, 'mock'>,
  options: WebApiRunOptions,
): Promise<EvaluationRunRecord> {
  const collector = new EvaluationEventCollector({
    agentId: 'investment_advisor',
    caseId: testCase.id,
    engine,
    input: testCase.input,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
  };

  if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;
  if (options.cookie) headers.Cookie = options.cookie;

  try {
    const response = await fetch(new URL(endpointForEngine(engine), options.baseUrl), {
      body: JSON.stringify(buildRequestBody(testCase, engine, options)),
      headers,
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      collector.fail(await response.text(), `http_${response.status}`);
      return collector.toRecord();
    }

    if (!response.body) {
      collector.fail('Chat API returned an empty response body', 'empty_stream');
      return collector.toRecord();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const state: StreamState = { sawText: false, tokens: {} };
    let pending = '';

    for (;;) {
      const read = await reader.read();
      if (read.done) break;

      const split = splitSseEvents(pending + decoder.decode(read.value, { stream: true }));
      pending = split.pending;

      for (const part of split.parts) {
        const event = parseSsePayload(part);
        if (event && applyStreamEvent(collector, event, state)) {
          await reader.cancel();
          break;
        }
      }
    }

    const trailingEvent = parseSsePayload(pending);
    if (trailingEvent) applyStreamEvent(collector, trailingEvent, state);

    const record = collector.toRecord();
    const output = record.output || state.finalContent || '';
    return {
      ...record,
      cost: {
        ...record.cost,
        costUsd: state.tokens.costUsd ?? state.traceCost?.totalCost,
        inputTokens: state.tokens.input ?? state.traceMetrics?.inputTokens,
        model: options.model,
        outputTokens: state.tokens.output ?? state.traceMetrics?.outputTokens,
        totalTokens: state.tokens.total ?? state.traceMetrics?.totalTokens,
      },
      messages: output ? [...record.messages.filter((message) => message.role !== 'assistant'), { content: output, role: 'assistant' }] : record.messages,
      output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown chat API error';
    collector.fail(message, error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'web_api_error');
    return collector.toRecord();
  } finally {
    clearTimeout(timeout);
  }
}
