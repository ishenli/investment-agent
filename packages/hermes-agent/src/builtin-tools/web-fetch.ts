/**
 * web_fetch — Fetch content from a URL (HTML, JSON, plain text).
 *
 * Extracts readable text from HTML pages, returns raw content for other types.
 */

import { Type } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';

export const webFetchSchema = Type.Object({
  url: Type.String({ description: 'URL to fetch' }),
  format: Type.Optional(
    Type.String({
      description: '"text" extracts readable text from HTML, "raw" returns raw content, "json" parses JSON (default: "text")',
    }),
  ),
  max_length: Type.Optional(
    Type.Number({ description: 'Max characters to return (default: 10000)' }),
  ),
});

const MAX_CONTENT = 50_000;

export async function webFetchHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const url = String(args.url ?? '');
  const format = String(args.format ?? 'text');
  const maxLength = Math.min(MAX_CONTENT, Math.max(100, Number(args.max_length ?? 10000)));

  if (!url) {
    return { content: [{ type: 'text', text: 'Error: url is required' }], isError: true };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return { content: [{ type: 'text', text: `Error: invalid URL: ${url}` }], isError: true };
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HermesAgent/1.0)',
        'Accept': 'text/html,application/json,text/plain,*/*',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    let body = await response.text();

    if (format === 'json' || contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        body = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw if JSON parsing fails
      }
    } else if (format === 'text' && contentType.includes('text/html')) {
      body = extractTextFromHtml(body);
    }

    // Truncate
    if (body.length > maxLength) {
      body = body.slice(0, maxLength) + `\n\n...[truncated at ${maxLength} chars]`;
    }

    const header = `URL: ${url}\nContent-Type: ${contentType}\n---\n`;
    return { content: [{ type: 'text', text: header + body }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Fetch error: ${msg}` }], isError: true };
  }
}

/**
 * Simple HTML to text extraction (no external dependencies).
 * Removes scripts, styles, tags, collapses whitespace.
 */
function extractTextFromHtml(html: string): string {
  let text = html;
  // Remove script and style blocks
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Convert block elements to newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
