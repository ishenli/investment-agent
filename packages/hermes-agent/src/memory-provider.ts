/**
 * Abstract base class for pluggable memory providers.
 *
 * Ported from Python hermes-agent's agent/memory_provider.py.
 *
 * Memory providers give the agent persistent recall across sessions. One
 * external provider is active at a time alongside the always-on built-in
 * memory (MEMORY.md / USER.md). The MemoryManager enforces this limit.
 *
 * Lifecycle (called by MemoryManager):
 *   initialize()           — connect, create resources, warm up
 *   systemPromptBlock()    — static text for the system prompt
 *   prefetch(query)        — background recall before each turn
 *   syncTurn(user, asst)   — async write after each turn
 *   getToolSchemas()       — tool schemas to expose to the model
 *   handleToolCall()       — dispatch a tool call
 *   shutdown()             — clean exit
 *
 * Optional hooks (override to opt in):
 *   onTurnStart(turn, message, opts)           — per-turn tick
 *   onSessionEnd(messages)                     — end-of-session extraction
 *   onPreCompress(messages)                    — extract before context compression
 *   onMemoryWrite(action, target, content, metadata)  — mirror built-in writes
 *   onDelegation(task, result, opts)           — subagent completion observation
 */

import type { Message } from '@mariozechner/pi-ai';

// ============== Types ==============

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ConfigField {
  key: string;
  description?: string;
  secret?: boolean;
  required?: boolean;
  default?: unknown;
  choices?: string[];
  url?: string;
  envVar?: string;
}

export interface MemoryWriteMetadata {
  writeOrigin?: string;
  executionContext?: string;
  sessionId?: string;
  parentSessionId?: string;
  platform?: string;
  toolName?: string;
  [key: string]: unknown;
}

export interface TurnStartOptions {
  remainingTokens?: number;
  model?: string;
  platform?: string;
  toolCount?: number;
  [key: string]: unknown;
}

export interface InitializeOptions {
  platform?: string;
  agentContext?: 'primary' | 'subagent' | 'cron' | 'flush';
  agentIdentity?: string;
  agentWorkspace?: string;
  parentSessionId?: string;
  userId?: string;
  hermesHome?: string;
  [key: string]: unknown;
}

export interface DelegationOptions {
  childSessionId?: string;
  [key: string]: unknown;
}

// ============== Abstract Base Class ==============

export abstract class MemoryProvider {
  /**
   * Short identifier for this provider (e.g. 'builtin', 'honcho').
   */
  abstract readonly name: string;

  // -- Core lifecycle (implement these) ------------------------------------

  /**
   * Return true if this provider is configured, has credentials, and is ready.
   * Should not make network calls — just check config and installed deps.
   */
  abstract isAvailable(): boolean;

  /**
   * Initialize for a session. Called once at agent startup.
   * May create resources, establish connections, etc.
   */
  abstract initialize(sessionId: string, options?: InitializeOptions): void | Promise<void>;

  /**
   * Return tool schemas this provider exposes.
   * Each schema follows the format: { name, description, parameters }.
   * Return empty array if this provider has no tools (context-only).
   */
  abstract getToolSchemas(): ToolSchema[];

  // -- Optional lifecycle methods (override to opt in) ----------------------

  /**
   * Return text to include in the system prompt.
   * For STATIC provider info. Prefetched recall context is injected separately.
   */
  systemPromptBlock(): string {
    return '';
  }

  /**
   * Recall relevant context for the upcoming turn.
   * Called before each API call. Return formatted text to inject as context.
   */
  prefetch(_query: string, _sessionId?: string): string | Promise<string> {
    return '';
  }

  /**
   * Queue a background recall for the NEXT turn.
   * Called after each turn completes. The result will be consumed by prefetch() next turn.
   */
  queuePrefetch(_query: string, _sessionId?: string): void {
    // no-op by default
  }

  /**
   * Persist a completed turn to the backend.
   * Should be non-blocking — queue for background processing if needed.
   */
  syncTurn(
    _userContent: string,
    _assistantContent: string,
    _sessionId?: string,
  ): void | Promise<void> {
    // no-op by default
  }

  /**
   * Handle a tool call for one of this provider's tools.
   * Must return a JSON string (the tool result).
   */
  handleToolCall(
    toolName: string,
    _args: Record<string, unknown>,
  ): string | Promise<string> {
    throw new Error(`Provider ${this.name} does not handle tool ${toolName}`);
  }

  /**
   * Clean shutdown — flush queues, close connections.
   */
  shutdown(): void | Promise<void> {
    // no-op by default
  }

  // -- Optional hooks -------------------------------------------------------

  /**
   * Called at the start of each turn with the user message.
   */
  onTurnStart(
    _turnNumber: number,
    _message: string,
    _options?: TurnStartOptions,
  ): void {
    // no-op by default
  }

  /**
   * Called when a session ends (explicit exit or timeout).
   */
  onSessionEnd(_messages: Message[]): void {
    // no-op by default
  }

  /**
   * Called before context compression discards old messages.
   * Return text to include in the compression summary prompt.
   */
  onPreCompress(_messages: Message[]): string {
    return '';
  }

  /**
   * Called when the built-in memory tool writes an entry.
   * Use to mirror built-in memory writes to your backend.
   */
  onMemoryWrite(
    _action: string,
    _target: string,
    _content: string,
    _metadata?: MemoryWriteMetadata,
  ): void {
    // no-op by default
  }

  /**
   * Called on the PARENT agent when a subagent completes.
   */
  onDelegation(
    _task: string,
    _result: string,
    _options?: DelegationOptions,
  ): void {
    // no-op by default
  }

  // -- Config schema (for setup wizard) ------------------------------------

  /**
   * Return config fields this provider needs for setup.
   * Used by setup wizards to walk the user through configuration.
   */
  getConfigSchema(): ConfigField[] {
    return [];
  }

  /**
   * Write non-secret config to the provider's native location.
   */
  saveConfig(_values: Record<string, unknown>, _hermesHome: string): void {
    // no-op by default
  }
}
