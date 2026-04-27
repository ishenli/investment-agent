/**
 * write_file — Write content to a file (creates dirs if needed).
 *
 * Ported from Python hermes-agent's tools/file_tools.py WRITE_FILE_SCHEMA.
 */

import { Type } from '@sinclair/typebox';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TextContent } from '@mariozechner/pi-ai';

export const writeFileSchema = Type.Object({
  path: Type.String({ description: 'File path to write' }),
  content: Type.String({ description: 'Complete file content to write' }),
});

export async function writeFileHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const filePath = String(args.path ?? '');
  const content = String(args.content ?? '');

  if (!filePath) {
    return { content: [{ type: 'text', text: 'Error: path is required' }], isError: true };
  }

  const resolved = path.resolve(filePath);

  try {
    // Create parent directories
    const dir = path.dirname(resolved);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(resolved, content, 'utf-8');
    const bytes = Buffer.byteLength(content, 'utf-8');
    const lines = content.split('\n').length;

    return {
      content: [{
        type: 'text',
        text: `Successfully wrote ${bytes.toLocaleString()} bytes (${lines} lines) to ${resolved}`,
      }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error writing file: ${msg}` }], isError: true };
  }
}
