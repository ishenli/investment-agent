/**
 * BuiltinMemoryProvider — wraps MemoryStore as a MemoryProvider.
 *
 * Always registered as the first provider in MemoryManager.
 * Bridges the existing file-backed MemoryStore with the provider abstraction.
 */

import { MemoryProvider, type ToolSchema, type InitializeOptions } from '../memory-provider';
import { MemoryStore, type MemoryStoreConfig } from './memory';
import { LearningRecorder } from '../reflection/learning-recorder';
import type { LearningRecord } from '../reflection/types';

export class BuiltinMemoryProvider extends MemoryProvider {
  readonly name = 'builtin';
  private store: MemoryStore;
  private _systemPromptSnapshot: { memory: string; user: string } | null = null;

  constructor(config: MemoryStoreConfig) {
    super();
    this.store = new MemoryStore(config);
  }

  isAvailable(): boolean {
    return true; // always available
  }

  initialize(_sessionId: string, _options?: InitializeOptions): void {
    // Freeze snapshot at session start for prefix cache stability
    this._systemPromptSnapshot = {
      memory: this.store.formatForSystemPrompt('memory'),
      user: this.store.formatForSystemPrompt('user'),
    };
  }

  /**
   * Return frozen memory snapshot for system prompt.
   * Uses snapshot from initialize() time to keep prefix cache stable.
   */
  systemPromptBlock(): string {
    const snapshot = this._systemPromptSnapshot ?? {
      memory: this.store.formatForSystemPrompt('memory'),
      user: this.store.formatForSystemPrompt('user'),
    };
    const parts: string[] = [];
    if (snapshot.memory) parts.push(snapshot.memory);
    if (snapshot.user) parts.push(snapshot.user);
    return parts.join('\n\n');
  }

  getToolSchemas(): ToolSchema[] {
    return [
      {
        name: 'memory',
        description:
          'Read, add, replace, or remove entries in persistent agent memory (MEMORY.md) or user profile (USER.md).',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['read', 'add', 'replace', 'remove'],
              description: 'Action to perform on memory',
            },
            target: {
              type: 'string',
              enum: ['memory', 'user'],
              description: 'Target store: "memory" (default) or "user"',
            },
            content: {
              type: 'string',
              description: 'Content to add or replace with (for add/replace)',
            },
            old_text: {
              type: 'string',
              description: 'Substring to find for replace/remove',
            },
          },
          required: ['action'],
        },
      },
    ];
  }

  handleToolCall(_toolName: string, args: Record<string, unknown>): string {
    const action = String(args.action ?? 'read');
    const target = String(args.target ?? 'memory');
    const content = args.content ? String(args.content) : undefined;
    const oldText = args.old_text ? String(args.old_text) : undefined;

    if (action === 'read') {
      const entries = this.store.read(target);
      const totalChars = entries.join('§').length;
      return JSON.stringify({
        success: true,
        target,
        entries,
        entry_count: entries.length,
        usage: `${totalChars} chars`,
      });
    }

    if (action === 'add') {
      if (!content) return JSON.stringify({ success: false, message: 'content is required for add' });
      const result = this.store.add(target, content);
      const entries = this.store.read(target);
      return JSON.stringify({
        ...result,
        target,
        entries,
        entry_count: entries.length,
      });
    }

    if (action === 'replace') {
      if (!oldText || !content) {
        return JSON.stringify({ success: false, message: 'old_text and content are required for replace' });
      }
      const result = this.store.replace(target, oldText, content);
      const entries = this.store.read(target);
      return JSON.stringify({
        ...result,
        target,
        entries,
        entry_count: entries.length,
      });
    }

    if (action === 'remove') {
      if (!oldText) {
        return JSON.stringify({ success: false, message: 'old_text is required for remove' });
      }
      const result = this.store.remove(target, oldText);
      const entries = this.store.read(target);
      return JSON.stringify({
        ...result,
        target,
        entries,
        entry_count: entries.length,
      });
    }

    return JSON.stringify({ success: false, message: `Unknown action: ${action}` });
  }

  /**
   * Append learning records to MEMORY.md under a single LEARNINGS section.
   */
  onTurnEnd(
    _result: import('../types').HermesAgentResult,
    learnings?: LearningRecord[],
  ): void {
    if (!learnings || learnings.length === 0) return;

    const recorder = new LearningRecorder();
    const bodyParts: string[] = [];

    for (const record of learnings) {
      bodyParts.push(recorder.formatForMemory(record));
    }

    if (bodyParts.length === 0) return;

    const content = `### LEARNINGS\n\n${bodyParts.join('\n\n')}`;
    try {
      this.store.add('memory', content);
    } catch (e) {
      console.warn('[BuiltinMemoryProvider] Failed to append learning:', e);
    }
  }

  /** Direct access to the underlying store (for tests or advanced usage). */
  getStore(): MemoryStore {
    return this.store;
  }
}
