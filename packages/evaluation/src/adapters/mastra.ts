import type { EvaluationRunRecord } from '../core/types';

export interface MastraScorerRunInput {
  input?: string;
  inputMessages?: Array<{ content: string; role: string }>;
  output?: string;
  outputMessages?: Array<{ content: string; role: string }>;
  rememberedMessages?: Array<{ content: string; role: string }>;
  toolCalls?: Array<{ args: Record<string, unknown>; name: string; result?: unknown }>;
}

export interface MastraTrajectoryStep {
  args?: Record<string, unknown>;
  name: string;
  result?: unknown;
  status: 'success' | 'error';
}

export function toMastraScorerRunInput(record: EvaluationRunRecord): MastraScorerRunInput {
  const messages = record.messages.map((message) => ({
    content: message.content,
    role: message.role,
  }));

  return {
    input: typeof record.input === 'string' ? record.input : undefined,
    inputMessages: messages.filter((message) => message.role !== 'assistant'),
    output: record.output,
    outputMessages: [{ content: record.output, role: 'assistant' }],
    rememberedMessages: messages,
    toolCalls: record.toolCalls.map((tool) => ({
      args: tool.args,
      name: tool.name,
      result: tool.result,
    })),
  };
}

export function toMastraTrajectory(record: EvaluationRunRecord): MastraTrajectoryStep[] {
  return record.toolCalls.map((tool) => ({
    args: tool.args,
    name: tool.name,
    result: tool.result,
    status: tool.isError ? 'error' : 'success',
  }));
}

