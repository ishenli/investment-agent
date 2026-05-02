/**
 * web_search — Search the web using a search engine.
 *
 * Uses Tavily API if available, falls back to DuckDuckGo HTML scraping.
 */

import { Type } from '@sinclair/typebox';
import type { TextContent } from '@mariozechner/pi-ai';

export const webSearchSchema = Type.Object({
  query: Type.String({ description: 'Search query' }),
  num_results: Type.Optional(
    Type.Number({ description: 'Number of results to return (default: 5, max: 10)' }),
  ),
});

export async function webSearchHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const query = String(args.query ?? '');
  const numResults = Math.min(10, Math.max(1, Number(args.num_results ?? 5)));

  if (!query) {
    return { content: [{ type: 'text', text: 'Error: query is required' }], isError: true };
  }

  // Try Tavily API first
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    return tavilySearch(query, numResults, tavilyKey);
  }

  // Fallback to DuckDuckGo lite
  return duckDuckGoSearch(query, numResults);
}

async function tavilySearch(
  query: string,
  numResults: number,
  apiKey: string,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: numResults,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json() as {
      answer?: string;
      results: Array<{ title: string; url: string; content: string }>;
    };

    const lines: string[] = [];
    if (data.answer) {
      lines.push(`**Answer:** ${data.answer}\n`);
    }
    lines.push(`**Results for "${query}":**\n`);

    for (const result of data.results) {
      lines.push(`- [${result.title}](${result.url})`);
      lines.push(`  ${result.content.slice(0, 200)}`);
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Search error: ${msg}` }], isError: true };
  }
}

async function duckDuckGoSearch(
  query: string,
  numResults: number,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encoded}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HermesAgent/1.0)',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo error: ${response.status}`);
    }

    const html = await response.text();

    // Simple HTML parsing for result snippets
    const results: string[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < numResults) {
      const url = match[1];
      const title = match[2].trim();
      const snippet = match[3].replace(/<[^>]*>/g, '').trim();
      results.push(`- [${title}](${url})\n  ${snippet}`);
    }

    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No results found for "${query}"` }] };
    }

    const text = `**Results for "${query}":**\n\n${results.join('\n\n')}`;
    return { content: [{ type: 'text', text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Search error: ${msg}` }], isError: true };
  }
}
