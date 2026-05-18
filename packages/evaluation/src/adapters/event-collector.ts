import type { EvaluationEngine, EvaluationMessage, EvaluationRunRecord, EvaluationToolCall } from '../core/types';

export interface EventCollectorOptions {
  agentId: string;
  caseId: string;
  engine: EvaluationEngine;
  input: string | EvaluationMessage[];
}

export class EvaluationEventCollector {
  private readonly startedAt = new Date();
  private readonly messages: EvaluationMessage[] = [];
  private readonly toolCalls: EvaluationToolCall[] = [];
  private output = '';
  private error: EvaluationRunRecord['error'];

  constructor(private readonly options: EventCollectorOptions) {
    if (typeof options.input === 'string') {
      this.messages.push({ content: options.input, role: 'user' });
    } else {
      this.messages.push(...options.input);
    }
  }

  addAssistantDelta(delta: string): void {
    this.output += delta;
  }

  addToolCall(toolCall: EvaluationToolCall): void {
    this.toolCalls.push(toolCall);
  }

  fail(message: string, code?: string): void {
    this.error = { code, message, recoverable: false };
  }

  toRecord(): EvaluationRunRecord {
    const completedAt = new Date();
    const status = this.error ? 'failed' : 'completed';
    const output = this.output.trim();

    return {
      agentId: this.options.agentId,
      caseId: this.options.caseId,
      completedAt: completedAt.toISOString(),
      cost: {
        latencyMs: completedAt.getTime() - this.startedAt.getTime(),
      },
      engine: this.options.engine,
      error: this.error,
      id: `${this.options.caseId}-${this.startedAt.getTime()}`,
      input: this.options.input,
      messages: [...this.messages, ...(output ? [{ content: output, role: 'assistant' as const }] : [])],
      output,
      startedAt: this.startedAt.toISOString(),
      status,
      toolCalls: this.toolCalls,
      trace: { metrics: [], spans: [] },
    };
  }
}

