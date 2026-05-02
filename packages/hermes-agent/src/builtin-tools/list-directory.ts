/**
 * list_directory — List files and directories in a tree-like structure.
 *
 * Similar to Claude Code's directory listing with depth control.
 */

import { Type } from '@sinclair/typebox';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TextContent } from '@mariozechner/pi-ai';

export const listDirectorySchema = Type.Object({
  path: Type.String({ description: 'Directory path to list (absolute or relative)' }),
  depth: Type.Optional(
    Type.Number({ description: 'Max depth to traverse (default: 2, max: 5)' }),
  ),
  show_hidden: Type.Optional(
    Type.Boolean({ description: 'Show hidden files/directories (default: false)' }),
  ),
});

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', '.turbo',
  '.cache', '__pycache__', '.venv', 'coverage',
]);

export async function listDirectoryHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const dirPath = String(args.path ?? '.');
  const maxDepth = Math.min(5, Math.max(1, Number(args.depth ?? 2)));
  const showHidden = Boolean(args.show_hidden ?? false);

  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved)) {
    return { content: [{ type: 'text', text: `Error: path does not exist: ${resolved}` }], isError: true };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { content: [{ type: 'text', text: `Error: not a directory: ${resolved}` }], isError: true };
  }

  const lines: string[] = [];
  let fileCount = 0;
  let dirCount = 0;
  const MAX_ENTRIES = 500;

  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth || fileCount + dirCount > MAX_ENTRIES) return;

    let entries: string[];
    try {
      entries = fs.readdirSync(dir).sort();
    } catch {
      return;
    }

    if (!showHidden) {
      entries = entries.filter((e) => !e.startsWith('.'));
    }
    entries = entries.filter((e) => !IGNORED_DIRS.has(e));

    for (let i = 0; i < entries.length; i++) {
      if (fileCount + dirCount > MAX_ENTRIES) {
        lines.push(`${prefix}... (truncated at ${MAX_ENTRIES} entries)`);
        return;
      }

      const name = entries[i];
      const fullPath = path.join(dir, name);
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      let isDir = false;
      try {
        isDir = fs.statSync(fullPath).isDirectory();
      } catch {
        continue;
      }

      if (isDir) {
        dirCount++;
        lines.push(`${prefix}${connector}${name}/`);
        walk(fullPath, prefix + childPrefix, depth + 1);
      } else {
        fileCount++;
        lines.push(`${prefix}${connector}${name}`);
      }
    }
  }

  lines.push(`${resolved}/`);
  walk(resolved, '', 1);
  lines.push(`\n${dirCount} directories, ${fileCount} files`);

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}
