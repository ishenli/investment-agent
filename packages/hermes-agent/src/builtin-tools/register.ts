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
import { listDirectorySchema, listDirectoryHandler } from './list-directory';
import { terminalSchema, terminalHandler } from './terminal';
import { webSearchSchema, webSearchHandler } from './web-search';
import { webFetchSchema, webFetchHandler } from './web-fetch';
import { thinkSchema, thinkHandler } from './think';
import { memorySchema, createMemoryHandler, MemoryStore } from './memory';

export type BuiltinToolName =
  | 'read_file'
  | 'write_file'
  | 'patch'
  | 'search_files'
  | 'list_directory'
  | 'terminal'
  | 'web_search'
  | 'web_fetch'
  | 'think'
  | 'memory';

export interface BuiltinToolsConfig {
  /** Directory for memory store (MEMORY.md, USER.md). If not set, memory tool is skipped. */
  memoryDir?: string;
  /** Which tools to enable (default: all) */
  enable?: BuiltinToolName[];
}

export function registerBuiltinTools(
  registry: ToolRegistry,
  config: BuiltinToolsConfig = {},
): void {
  const enabled = config.enable
    ? new Set(config.enable)
    : new Set<BuiltinToolName>([
        'read_file', 'write_file', 'patch', 'search_files', 'list_directory',
        'terminal', 'web_search', 'web_fetch', 'think', 'memory',
      ]);

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

  if (enabled.has('list_directory')) {
    registry.register(
      'list_directory',
      'List files and directories in a tree structure with depth control. Ignores node_modules/.git.',
      listDirectorySchema,
      listDirectoryHandler,
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

  if (enabled.has('web_search')) {
    registry.register(
      'web_search',
      'Search the web for information. Uses Tavily API if TAVILY_API_KEY is set, otherwise DuckDuckGo.',
      webSearchSchema,
      webSearchHandler,
    );
  }

  if (enabled.has('web_fetch')) {
    registry.register(
      'web_fetch',
      'Fetch content from a URL. Extracts readable text from HTML, returns raw content for JSON/text.',
      webFetchSchema,
      webFetchHandler,
    );
  }

  if (enabled.has('think')) {
    registry.register(
      'think',
      'Internal reasoning scratchpad. Use to think through complex problems step by step before acting. No side effects.',
      thinkSchema,
      thinkHandler,
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
