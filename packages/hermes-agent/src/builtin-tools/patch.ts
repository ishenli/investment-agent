/**
 * patch — Targeted text replacement in files.
 *
 * Ported from Python hermes-agent's tools/file_tools.py PATCH_SCHEMA.
 * Supports "replace" mode (find old_string → replace with new_string).
 */

import { Type } from '@sinclair/typebox';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TextContent } from '@mariozechner/pi-ai';

export const patchSchema = Type.Object({
  path: Type.String({ description: 'File path to patch' }),
  old_string: Type.String({ description: 'Exact text to find and replace' }),
  new_string: Type.String({ description: 'Replacement text' }),
  replace_all: Type.Optional(
    Type.Boolean({ description: 'Replace all occurrences (default: false)' }),
  ),
});

export async function patchHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const filePath = String(args.path ?? '');
  const oldString = String(args.old_string ?? '');
  const newString = String(args.new_string ?? '');
  const replaceAll = Boolean(args.replace_all ?? false);

  if (!filePath || !oldString) {
    return {
      content: [{ type: 'text', text: 'Error: path and old_string are required' }],
      isError: true,
    };
  }

  const resolved = path.resolve(filePath);

  try {
    const content = fs.readFileSync(resolved, 'utf-8');

    if (!content.includes(oldString)) {
      // Fuzzy hint: show nearby lines
      const lines = content.split('\n');
      const searchTrimmed = oldString.trim();
      const nearMatches = lines
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter((l) => l.line.includes(searchTrimmed.split('\n')[0].trim()))
        .slice(0, 3);

      let hint = 'old_string not found in file.';
      if (nearMatches.length > 0) {
        hint += ' Near matches:\n' +
          nearMatches.map((m) => `  Line ${m.num}: ${m.line.slice(0, 100)}`).join('\n');
      }
      return { content: [{ type: 'text', text: hint }], isError: true };
    }

    // Check uniqueness if not replace_all
    if (!replaceAll) {
      const occurrences = content.split(oldString).length - 1;
      if (occurrences > 1) {
        return {
          content: [{
            type: 'text',
            text: `old_string found ${occurrences} times. Use replace_all=true or provide more context to make it unique.`,
          }],
          isError: true,
        };
      }
    }

    const updated = replaceAll
      ? content.replaceAll(oldString, newString)
      : content.replace(oldString, newString);

    fs.writeFileSync(resolved, updated, 'utf-8');

    const linesChanged = oldString.split('\n').length;
    return {
      content: [{
        type: 'text',
        text: `Patched ${resolved}: replaced ${linesChanged} line(s)${replaceAll ? ' (all occurrences)' : ''}.`,
      }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error patching file: ${msg}` }], isError: true };
  }
}
