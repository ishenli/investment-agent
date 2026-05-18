import type { EvaluationEngine, EvaluationRunRecord } from '../core/types';

export interface EngineAdapter {
  engine: EvaluationEngine;
  toRunRecord(rawOutput: unknown, caseId: string): EvaluationRunRecord;
}

export function getAdapter(engine: EvaluationEngine): EngineAdapter {
  switch (engine) {
    case 'hermes':
      return new HermesAdapter();
    case 'deepagents':
      return new DeepAgentsAdapter();
    case 'claude':
      return new ClaudeAdapter();
    default:
      throw new Error(`No adapter available for engine "${engine}".`);
  }
}

export class HermesAdapter implements EngineAdapter {
  engine = 'hermes' as const;

  toRunRecord(rawOutput: unknown, caseId: string): EvaluationRunRecord {
    const result = rawOutput as {
      completed?: boolean;
      context?: { messages?: Array<{ content: unknown; role: string }> };
      finalResponse?: string;
      observability?: { cost?: number; tokens?: { input?: number; output?: number; total?: number } };
    };

    const finalResponse = this.extractFinalResponse(result);
    const messages = Array.isArray(result.context?.messages) ? result.context.messages : [];
    const now = new Date().toISOString();

    return {
      agentId: 'investment_advisor',
      caseId,
      completedAt: now,
      cost: {
        costUsd: result.observability?.cost,
        inputTokens: result.observability?.tokens?.input,
        outputTokens: result.observability?.tokens?.output,
        totalTokens: result.observability?.tokens?.total,
      },
      engine: this.engine,
      id: `run-${caseId}-${Date.now()}`,
      input: '',
      messages: messages.map((m) => ({
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
      })),
      output: finalResponse,
      startedAt: now,
      status: result.completed ? 'completed' : 'failed',
      toolCalls: [],
      trace: { metrics: [], spans: [] },
    };
  }

  private extractFinalResponse(result: any): string {
    if (typeof result.finalResponse === 'string' && result.finalResponse.trim()) {
      return result.finalResponse;
    }

    const messages = Array.isArray(result.context?.messages) ? result.context.messages : [];
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const content = lastAssistant?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((block) => {
          if (typeof block === 'string') return block;
          if (typeof block?.text === 'string') return block.text;
          return '';
        })
        .filter(Boolean)
        .join('');
    }
    return '';
  }
}

export class DeepAgentsAdapter implements EngineAdapter {
  engine = 'deepagents' as const;

  toRunRecord(_rawOutput: unknown, _caseId: string): EvaluationRunRecord {
    throw new Error('DeepAgents adapter is not yet implemented. Use --engine hermes or --engine mock.');
  }
}

export class ClaudeAdapter implements EngineAdapter {
  engine = 'claude' as const;

  toRunRecord(_rawOutput: unknown, _caseId: string): EvaluationRunRecord {
    throw new Error('Claude adapter is not yet implemented. Use --engine hermes or --engine mock.');
  }
}
