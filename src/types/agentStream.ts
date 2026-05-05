export type AgentStreamEvent =
  | {
      type: 'status';
      id?: string;
      level?: 'info' | 'debug' | 'warning' | 'error';
      message: string;
      step?: string;
      progress?: number;
    }
  | {
      type: 'text';
      id: string;
      delta: string;
      isFinal?: boolean;
    }
  | {
      /** 模型思考链 / reasoning tokens */
      type: 'reasoning';
      id: string;
      delta: string;
    }
  | {
      /** 搜索基底 / grounding citations */
      type: 'grounding';
      citations: unknown[];
      searchQueries?: string[];
    }
  | {
      /** 相关建议问题 */
      type: 'related';
      items: string[];
    }
  | {
      type: 'tool_use';
      id: string;
      toolName: string;
      arguments: unknown;
    }
  | {
      type: 'result';
      id: string;
      content: unknown;
      tokens?: {
        input?: number;
        output?: number;
        total?: number;
        costUsd?: number;
      };
    }
  | {
      type: 'error';
      message: string;
      code?: string;
      details?: unknown;
    }
  | {
      type: 'permission_request';
      permissionRequestId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
      suggestions?: Array<{
        destination?: string;
        behavior?: string;
        rules?: Array<{ toolName: string; ruleContent?: string }>;
      }>;
      decisionReason?: string;
      blockedPath?: string;
      toolUseId: string;
      description?: string;
    }
  | {
      type: 'done';
    }
  | {
      type: 'trace_start';
      traceId: string;
      agentName: string;
      startTime: number;
      sessionId?: string;
      topicId?: string;
    }
  | {
      type: 'span_start';
      traceId: string;
      spanId: string;
      parentSpanId?: string;
      name: 'llm_call' | 'tool_call' | 'context_compression';
      kind: 'client' | 'internal';
      startTime: number;
      attributes?: Record<string, unknown>;
    }
  | {
      type: 'span_end';
      traceId: string;
      spanId: string;
      name: 'llm_call' | 'tool_call' | 'context_compression';
      status: 'ok' | 'error';
      startTime: number;
      endTime: number;
      durationMs: number;
      attributes?: Record<string, unknown>;
      tokenInput?: number;
      tokenOutput?: number;
      cost?: number;
    }
  | {
      type: 'trace_end';
      traceId: string;
      agentName: string;
      startTime: number;
      endTime: number;
      durationMs: number;
      status: 'running' | 'completed' | 'error';
      metrics: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        apiCalls: number;
        toolCalls: number;
        totalLatencyMs: number;
      };
      cost: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
      };
      error?: string;
    }
  | {
      type: 'metric';
      traceId: string;
      metric: {
        name: string;
        value: number;
        timestamp: number;
        labels?: Record<string, string>;
      };
    };
