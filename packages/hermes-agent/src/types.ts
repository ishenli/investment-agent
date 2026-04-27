/**
 * Core type definitions for Hermes Agent.
 *
 * Uses @mariozechner/pi-ai types as the foundation.
 */

import type {
  Context,
  Message,
  AssistantMessage,
  UserMessage,
  ToolResultMessage,
  Tool,
  ToolCall,
  TextContent,
  ThinkingContent,
  ImageContent,
  Api,
  Model,
} from '@mariozechner/pi-ai';

// Re-export pi-ai types for convenience
export type {
  Context,
  Message,
  AssistantMessage,
  UserMessage,
  ToolResultMessage,
  Tool,
  ToolCall,
  TextContent,
  ThinkingContent,
  ImageContent,
  Api,
  Model,
};

// ============== Agent Input / Output ==============

export interface HermesAgentInput {
  /** User message text or a full Message object */
  message: string | UserMessage;
  /** Previous conversation context (optional, for multi-turn) */
  context?: Context;
}

export interface HermesAgentResult {
  /** The full conversation context after execution */
  context: Context;
  /** Whether the agent completed normally */
  completed: boolean;
  /** Number of LLM API calls made */
  apiCalls: number;
  /** Final text response extracted from the last assistant message */
  finalResponse: string;
  /** Error message if completed is false */
  error?: string;
}

// ============== Tool Definitions ==============

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  isError: boolean;
  durationMs?: number;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
  toolCallId: string,
) => Promise<ToolCallResult>;

// ============== Agent Configuration ==============

export interface AgentCallbacks {
  onToolStart?: (name: string, args: Record<string, unknown>) => void;
  onToolEnd?: (result: ToolCallResult) => void;
  onError?: (error: Error) => void;
  onStep?: (iteration: number, toolNames: string[]) => void;
  onTextDelta?: (delta: string) => void;
}

export interface AgentConfig {
  /** Agent name for logging/identification */
  name?: string;
  /** pi-ai Model instance (from getModel) */
  model: Model<Api>;
  /** System prompt */
  systemPrompt?: string;
  /** Tools available to the agent */
  tools?: Tool[];
  /** Custom tool executor */
  toolExecutor?: ToolExecutor;
  /** Maximum tool-calling iterations (default: 90) */
  maxIterations?: number;
  /** Event callbacks */
  callbacks?: AgentCallbacks;
  /** Whether to use streaming (default: true) */
  streaming?: boolean;
}
