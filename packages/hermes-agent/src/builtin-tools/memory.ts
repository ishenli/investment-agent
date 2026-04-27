/**
 * memory — Persistent curated memory (MEMORY.md / USER.md).
 *
 * Ported from Python hermes-agent's tools/memory_tool.py.
 * Provides add/replace/remove operations on a markdown-based memory store.
 */

import { Type } from '@sinclair/typebox';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TextContent } from '@mariozechner/pi-ai';

const ENTRY_DELIMITER = '§';
const DEFAULT_MAX_CHARS = 2200;

export const memorySchema = Type.Object({
  action: Type.Union([
    Type.Literal('add'),
    Type.Literal('replace'),
    Type.Literal('remove'),
    Type.Literal('read'),
  ], { description: 'Action to perform on memory' }),
  target: Type.Optional(
    Type.Union([Type.Literal('memory'), Type.Literal('user')], {
      description: 'Target store: "memory" (default) or "user"',
    }),
  ),
  content: Type.Optional(
    Type.String({ description: 'Content to add or replace with (for add/replace)' }),
  ),
  old_text: Type.Optional(
    Type.String({ description: 'Substring to find for replace/remove' }),
  ),
});

export interface MemoryStoreConfig {
  /** Directory to store MEMORY.md and USER.md */
  dir: string;
  /** Max chars per store (default: 2200) */
  maxChars?: number;
}

/**
 * Simple file-backed memory store.
 */
export class MemoryStore {
  private readonly memoryPath: string;
  private readonly userPath: string;
  private readonly maxChars: number;

  constructor(config: MemoryStoreConfig) {
    fs.mkdirSync(config.dir, { recursive: true });
    this.memoryPath = path.join(config.dir, 'MEMORY.md');
    this.userPath = path.join(config.dir, 'USER.md');
    this.maxChars = config.maxChars ?? DEFAULT_MAX_CHARS;
  }

  private getPath(target: string): string {
    return target === 'user' ? this.userPath : this.memoryPath;
  }

  read(target: string): string[] {
    const filePath = this.getPath(target);
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return [];
    return content.split(ENTRY_DELIMITER).map((e) => e.trim()).filter(Boolean);
  }

  add(target: string, content: string): { success: boolean; message: string } {
    const entries = this.read(target);

    // Dedup check
    if (entries.some((e) => e === content)) {
      return { success: false, message: 'Duplicate entry — already exists' };
    }

    // Size check
    const totalSize = entries.join(ENTRY_DELIMITER).length + content.length + 1;
    if (totalSize > this.maxChars) {
      return {
        success: false,
        message: `Memory full (${totalSize}/${this.maxChars} chars). Remove entries first.`,
      };
    }

    entries.push(content);
    this.write(target, entries);
    return { success: true, message: `Added entry (${entries.length} total)` };
  }

  replace(
    target: string,
    oldText: string,
    newContent: string,
  ): { success: boolean; message: string } {
    const entries = this.read(target);
    const idx = entries.findIndex((e) => e.includes(oldText));
    if (idx === -1) {
      return { success: false, message: `No entry matching "${oldText.slice(0, 50)}"` };
    }
    entries[idx] = newContent;
    this.write(target, entries);
    return { success: true, message: 'Entry replaced' };
  }

  remove(target: string, oldText: string): { success: boolean; message: string } {
    const entries = this.read(target);
    const idx = entries.findIndex((e) => e.includes(oldText));
    if (idx === -1) {
      return { success: false, message: `No entry matching "${oldText.slice(0, 50)}"` };
    }
    entries.splice(idx, 1);
    this.write(target, entries);
    return { success: true, message: `Entry removed (${entries.length} remaining)` };
  }

  formatForSystemPrompt(target: string): string {
    const entries = this.read(target);
    if (entries.length === 0) return '';
    const label = target === 'user' ? 'User Profile' : 'Agent Memory';
    return `[${label}]\n${entries.join('\n')}`;
  }

  private write(target: string, entries: string[]): void {
    const filePath = this.getPath(target);
    fs.writeFileSync(filePath, entries.join(ENTRY_DELIMITER + '\n'), 'utf-8');
  }
}

/**
 * Create a memory tool handler bound to a MemoryStore instance.
 */
export function createMemoryHandler(store: MemoryStore) {
  return async (
    _toolCallId: string,
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[]; isError?: boolean }> => {
    const action = String(args.action ?? 'read');
    const target = String(args.target ?? 'memory');
    const content = args.content ? String(args.content) : undefined;
    const oldText = args.old_text ? String(args.old_text) : undefined;

    if (action === 'read') {
      const entries = store.read(target);
      if (entries.length === 0) {
        return { content: [{ type: 'text', text: `No ${target} entries yet.` }] };
      }
      return {
        content: [{
          type: 'text',
          text: `${target} entries (${entries.length}):\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
        }],
      };
    }

    if (action === 'add') {
      if (!content) {
        return { content: [{ type: 'text', text: 'Error: content is required for add' }], isError: true };
      }
      const result = store.add(target, content);
      return { content: [{ type: 'text', text: result.message }], isError: !result.success };
    }

    if (action === 'replace') {
      if (!oldText || !content) {
        return {
          content: [{ type: 'text', text: 'Error: old_text and content are required for replace' }],
          isError: true,
        };
      }
      const result = store.replace(target, oldText, content);
      return { content: [{ type: 'text', text: result.message }], isError: !result.success };
    }

    if (action === 'remove') {
      if (!oldText) {
        return { content: [{ type: 'text', text: 'Error: old_text is required for remove' }], isError: true };
      }
      const result = store.remove(target, oldText);
      return { content: [{ type: 'text', text: result.message }], isError: !result.success };
    }

    return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  };
}
