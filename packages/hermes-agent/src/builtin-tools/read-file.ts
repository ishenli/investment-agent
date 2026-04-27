/**
 * read_file — Read file content with optional line pagination.
 *
 * Ported from Python hermes-agent's tools/file_tools.py READ_FILE_SCHEMA.
 */

import { Type } from '@sinclair/typebox';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TextContent } from '@mariozechner/pi-ai';

export const readFileSchema = Type.Object({
  path: Type.String({ description: 'Absolute or relative file path to read' }),
  offset: Type.Optional(
    Type.Number({ description: 'Start line number (1-based, default: 1)' }),
  ),
  limit: Type.Optional(
    Type.Number({ description: 'Max lines to read (default: 500)' }),
  ),
});

export async function readFileHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const filePath = String(args.path ?? '');
  const offset = Math.max(1, Number(args.offset ?? 1));
  const limit = Math.min(2000, Math.max(1, Number(args.limit ?? 500)));

  if (!filePath) {
    return { content: [{ type: 'text', text: 'Error: path is required' }], isError: true };
  }

  const resolved = path.resolve(filePath);

  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(resolved);
      return {
        content: [{
          type: 'text',
          text: `Directory listing (${entries.length} entries):\n${entries.join('\n')}`,
        }],
      };
    }

    const raw = fs.readFileSync(resolved, 'utf-8');
    const allLines = raw.split('\n');
    const totalLines = allLines.length;
    const startIdx = offset - 1;
    const endIdx = Math.min(startIdx + limit, totalLines);
    const selectedLines = allLines.slice(startIdx, endIdx);

    // Add line numbers (cat -n style)
    const numbered = selectedLines
      .map((line, i) => `${startIdx + i + 1}\t${line}`)
      .join('\n');

    const truncated = endIdx < totalLines;
    let result = numbered;
    if (truncated) {
      result += `\n\n[Showing lines ${offset}-${endIdx} of ${totalLines}. Use offset=${endIdx + 1} to continue.]`;
    }

    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error reading file: ${msg}` }], isError: true };
  }
}
