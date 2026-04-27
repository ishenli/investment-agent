import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { BuiltinMemoryProvider } from '../builtin-tools/builtin-memory-provider';

describe('BuiltinMemoryProvider', () => {
  let tmpDir: string;
  let provider: BuiltinMemoryProvider;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-test-'));
    provider = new BuiltinMemoryProvider({ dir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "builtin"', () => {
    expect(provider.name).toBe('builtin');
  });

  it('isAvailable always returns true', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('exposes memory tool schema', () => {
    const schemas = provider.getToolSchemas();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].name).toBe('memory');
  });

  describe('handleToolCall', () => {
    it('reads empty memory', () => {
      const result = JSON.parse(provider.handleToolCall('memory', { action: 'read' }));
      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
      expect(result.entry_count).toBe(0);
    });

    it('adds entry', () => {
      const result = JSON.parse(
        provider.handleToolCall('memory', { action: 'add', content: 'test fact' }),
      );
      expect(result.success).toBe(true);
      expect(result.entries).toContain('test fact');
      expect(result.entry_count).toBe(1);
    });

    it('replaces entry', () => {
      provider.handleToolCall('memory', { action: 'add', content: 'old fact' });
      const result = JSON.parse(
        provider.handleToolCall('memory', {
          action: 'replace',
          old_text: 'old fact',
          content: 'new fact',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.entries).toContain('new fact');
      expect(result.entries).not.toContain('old fact');
    });

    it('removes entry', () => {
      provider.handleToolCall('memory', { action: 'add', content: 'temp fact' });
      const result = JSON.parse(
        provider.handleToolCall('memory', { action: 'remove', old_text: 'temp fact' }),
      );
      expect(result.success).toBe(true);
      expect(result.entry_count).toBe(0);
    });

    it('returns error for add without content', () => {
      const result = JSON.parse(provider.handleToolCall('memory', { action: 'add' }));
      expect(result.success).toBe(false);
    });

    it('returns error for unknown action', () => {
      const result = JSON.parse(provider.handleToolCall('memory', { action: 'invalid' }));
      expect(result.success).toBe(false);
    });

    it('supports user target', () => {
      const result = JSON.parse(
        provider.handleToolCall('memory', {
          action: 'add',
          target: 'user',
          content: 'user preference',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.target).toBe('user');
    });
  });

  describe('systemPromptBlock', () => {
    it('returns empty for no entries', () => {
      provider.initialize('session-1');
      expect(provider.systemPromptBlock()).toBe('');
    });

    it('returns snapshot after initialize', () => {
      provider.handleToolCall('memory', { action: 'add', content: 'fact 1' });
      provider.initialize('session-1');
      const block = provider.systemPromptBlock();
      expect(block).toContain('Agent Memory');
      expect(block).toContain('fact 1');
    });

    it('snapshot is frozen after initialize', () => {
      provider.handleToolCall('memory', { action: 'add', content: 'before init' });
      provider.initialize('session-1');

      // Add more entries after init
      provider.handleToolCall('memory', { action: 'add', content: 'after init' });

      // Snapshot should NOT contain the new entry
      const block = provider.systemPromptBlock();
      expect(block).toContain('before init');
      expect(block).not.toContain('after init');
    });
  });

  it('getStore provides access to underlying store', () => {
    expect(provider.getStore()).toBeDefined();
  });
});
