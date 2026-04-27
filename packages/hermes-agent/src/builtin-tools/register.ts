/**
 * Register all built-in tools with a ToolRegistry.
 *
 * Usage:
 *   const registry = ToolRegistry.create();
 *   registerBuiltinTools(registry, { memoryDir: '~/.hermes' });
 */

import type { ToolRegistry } from '../tools';
import { readFileSchema, readFileHandler } from './read-file';
import { writeFileSchema, writeFileHandler } from './write-file';
import { patchSchema, patchHandler } from './patch';
import { searchFilesSchema, searchFilesHandler } from './search-files';
import { terminalSchema, terminalHandler } from './terminal';
import { memorySchema, createMemoryHandler, MemoryStore } from './memory';

export interface BuiltinToolsConfig {
  /** Directory for memory store (MEMORY.md, USER.md). If not set, memory tool is skipped. */
  memoryDir?: string;
  /** Which tools to enable (default: all) */
  enable?: ('read_file' | 'write_file' | 'patch' | 'search_files' | 'terminal' | 'memory')[];
}

export function registerBuiltinTools(
  registry: ToolRegistry,
  config: BuiltinToolsConfig = {},
): void {
  const enabled = config.enable
    ? new Set(config.enable)
    : new Set(['read_file', 'write_file', 'patch', 'search_files', 'terminal', 'memory']);

  if (enabled.has('read_file')) {
    registry.register(
      'read_file',
      'Read file content with optional line pagination. Supports offset and limit for large files.',
      readFileSchema,
      readFileHandler,
    );
  }

  if (enabled.has('write_file')) {
    registry.register(
      'write_file',
      'Write content to a file. Creates parent directories if needed. Overwrites existing file.',
      writeFileSchema,
      writeFileHandler,
    );
  }

  if (enabled.has('patch')) {
    registry.register(
      'patch',
      'Make targeted text replacements in a file. Finds old_string and replaces with new_string.',
      patchSchema,
      patchHandler,
    );
  }

  if (enabled.has('search_files')) {
    registry.register(
      'search_files',
      'Search for text patterns (regex) in file contents, or find files by name glob.',
      searchFilesSchema,
      searchFilesHandler,
    );
  }

  if (enabled.has('terminal')) {
    registry.register(
      'terminal',
      'Execute a shell command and return stdout/stderr with exit code.',
      terminalSchema,
      terminalHandler,
    );
  }

  if (enabled.has('memory') && config.memoryDir) {
    const store = new MemoryStore({ dir: config.memoryDir });
    registry.register(
      'memory',
      'Read, add, replace, or remove entries in persistent agent memory (MEMORY.md) or user profile (USER.md).',
      memorySchema,
      createMemoryHandler(store),
    );
  }
}
