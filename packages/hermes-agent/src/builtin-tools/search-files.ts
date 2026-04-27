/**
 * search_files — Content search (regex) or filename search (glob).
 *
 * Ported from Python hermes-agent's tools/file_tools.py SEARCH_FILES_SCHEMA.
 */

import { Type } from '@sinclair/typebox';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { TextContent } from '@mariozechner/pi-ai';

export const searchFilesSchema = Type.Object({
  pattern: Type.String({ description: 'Regex pattern (content search) or glob (file search)' }),
  path: Type.Optional(
    Type.String({ description: 'Directory to search in (default: ".")' }),
  ),
  target: Type.Optional(
    Type.String({
      description: '"content" for text search, "file" for filename search (default: "content")',
    }),
  ),
  file_glob: Type.Optional(
    Type.String({ description: 'File glob filter, e.g. "*.ts" (content search only)' }),
  ),
  limit: Type.Optional(
    Type.Number({ description: 'Max results to return (default: 50)' }),
  ),
});

export async function searchFilesHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const pattern = String(args.pattern ?? '');
  const searchPath = path.resolve(String(args.path ?? '.'));
  const target = String(args.target ?? 'content');
  const fileGlob = args.file_glob ? String(args.file_glob) : undefined;
  const limit = Math.min(200, Math.max(1, Number(args.limit ?? 50)));

  if (!pattern) {
    return { content: [{ type: 'text', text: 'Error: pattern is required' }], isError: true };
  }

  try {
    if (target === 'file') {
      return searchFileNames(searchPath, pattern, limit);
    }
    return searchContent(searchPath, pattern, fileGlob, limit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Search error: ${msg}` }], isError: true };
  }
}

function searchContent(
  searchPath: string,
  pattern: string,
  fileGlob: string | undefined,
  limit: number,
): { content: TextContent[]; isError?: boolean } {
  // Try ripgrep first, fall back to grep
  const globArg = fileGlob ? `--glob '${fileGlob}'` : '';
  const cmd = `rg --no-heading --line-number --max-count=${limit} ${globArg} -- ${escapeShellArg(pattern)} ${escapeShellArg(searchPath)} 2>/dev/null || grep -rn --include='${fileGlob ?? '*'}' -m ${limit} -- ${escapeShellArg(pattern)} ${escapeShellArg(searchPath)} 2>/dev/null`;

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    }).trim();

    if (!output) {
      return { content: [{ type: 'text', text: `No matches found for pattern "${pattern}"` }] };
    }

    const lines = output.split('\n');
    const truncated = lines.length >= limit;
    const shown = lines.slice(0, limit).join('\n');

    let result = shown;
    if (truncated) {
      result += `\n\n[Results limited to ${limit} matches]`;
    }

    return { content: [{ type: 'text', text: result }] };
  } catch {
    // grep returns exit code 1 for no matches
    return { content: [{ type: 'text', text: `No matches found for pattern "${pattern}"` }] };
  }
}

function searchFileNames(
  searchPath: string,
  pattern: string,
  limit: number,
): { content: TextContent[]; isError?: boolean } {
  const cmd = `find ${escapeShellArg(searchPath)} -name ${escapeShellArg(pattern)} -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -n ${limit}`;

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    }).trim();

    if (!output) {
      return { content: [{ type: 'text', text: `No files matching "${pattern}"` }] };
    }

    const files = output.split('\n');
    return {
      content: [{
        type: 'text',
        text: `Found ${files.length} file(s):\n${files.join('\n')}`,
      }],
    };
  } catch {
    return { content: [{ type: 'text', text: `No files matching "${pattern}"` }] };
  }
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
