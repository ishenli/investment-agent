import logger from '@server/base/logger';
import { tavilySearch } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeTavilySearch(query: string): Promise<string> {
  try {
    return await tavilySearch(query);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TavilySearchTool] search failed:`, error);
    return `TavilySearchTool query failed: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const TravilySearchClaudeTool = claudeTool(
  'TravilySearchTool',
  '通过 Tavily 搜索互联网信息，能够快速搜索到最新的互联网信息',
  {
    query: z.string().describe('Search query keyword'),
  },
  async (args) => {
    try {
      const result = await executeTavilySearch(args.query);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[TravilySearchClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `TavilySearchTool query failed: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapter ==============

const tavilySearchSchema: TObject = Type.Object({
  query: Type.String({ description: '搜索关键词' }),
});

export const tavilySearchHermesConfig: HermesToolConfig = {
  name: 'tavily_search',
  description: '搜索互联网最新信息（新闻、文章、数据等）',
  schema: tavilySearchSchema,
  handler: async (_id, args) => {
    try {
      const result = await executeTavilySearch(String(args.query));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};