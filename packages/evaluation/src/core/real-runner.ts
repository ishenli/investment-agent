import { EvaluationEventCollector } from '../adapters/event-collector';
import { HermesAdapter } from '../adapters/engine-adapter';
import type { BenchmarkCase, EvaluationEngine, EvaluationRunRecord } from './types';

export interface RealRunOptions {
  model: string;
  provider: string;
  timeoutMs: number;
  userId: number;
}

async function dynamicImport(specifier: string): Promise<any> {
  const mod = specifier;
  return import(/* @vite-ignore */ mod);
}

function inputToMessages(input: BenchmarkCase['input']): Array<{ content: string; role: 'assistant' | 'system' | 'user' }> {
  if (typeof input === 'string') {
    return [{ content: input, role: 'user' }];
  }

  return input.map((message) => ({
    content: message.content,
    role: message.role === 'tool' ? 'assistant' : message.role,
  }));
}

const hermesAdapter = new HermesAdapter();

function extractFinalResponse(result: any): string {
  const record = hermesAdapter.toRunRecord(result, '');
  return record.output;
}

export async function runRealCase(
  testCase: BenchmarkCase,
  engine: Exclude<EvaluationEngine, 'mock'>,
  options: RealRunOptions,
): Promise<EvaluationRunRecord> {
  if (engine !== 'hermes') {
    throw new Error(`Real engine "${engine}" is not wired yet. Use --engine hermes or --engine mock.`);
  }

  const collector = new EvaluationEventCollector({
    agentId: 'investment_advisor',
    caseId: testCase.id,
    engine,
    input: testCase.input,
  });

  const hermes = await dynamicImport('@investment-agent/hermes-agent');
  const model = hermes.getModel(options.provider, options.model);
  if (!model) {
    throw new Error(`Unsupported Hermes model: ${options.provider}/${options.model}`);
  }

  const agent = new hermes.HermesAgent({
    callbacks: {
      onError: (error: Error) => collector.fail(error.message, 'hermes_error'),
      onTextDelta: (delta: string) => collector.addAssistantDelta(delta),
      onToolEnd: (result: any) => collector.addToolCall({
        args: {},
        durationMs: result.durationMs,
        error: result.isError ? 'tool_failed' : undefined,
        isError: Boolean(result.isError),
        name: result.toolName,
        result: result.content,
      }),
      onToolStart: (name: string, args: Record<string, unknown>) => collector.addToolCall({
        args,
        isError: false,
        name,
      }),
    },
    loadContextFiles: false,
    maxIterations: 15,
    model,
    name: `eval-${engine}`,
    platform: 'evaluation',
    streaming: true,
    streamOptions: {
      signal: new AbortController().signal,
      timeoutMs: options.timeoutMs,
    },
    systemPrompt: 'You are an investment analysis agent under evaluation. Be concise, factual, cite uncertainty, and include risk disclosure when giving investment-related guidance.',
    toolRegistry: undefined,
  });

  const messages = inputToMessages(testCase.input);
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const result = await agent.run({
    context: {
      messages: messages.slice(0, -1).map((message) => (
        message.role === 'assistant'
          ? { content: [{ text: message.content, type: 'text' }], role: 'assistant', timestamp: Date.now() }
          : { content: message.content, role: 'user', timestamp: Date.now() }
      )),
      systemPrompt: agent.getSystemPrompt(),
    },
    message: lastUserMessage?.content ?? '',
  });

  const record = collector.toRecord();
  const finalResponse = extractFinalResponse(result);
  return {
    ...record,
    cost: {
      ...record.cost,
      costUsd: result.observability?.cost,
      inputTokens: result.observability?.tokens.input,
      model: options.model,
      outputTokens: result.observability?.tokens.output,
      totalTokens: result.observability?.tokens.total,
    },
    output: record.output || finalResponse,
    status: result.completed ? record.status : 'failed',
  };
}
