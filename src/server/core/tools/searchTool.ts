import logger from '@/server/base/logger';
import settingService from '@/server/service/settingService';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';
import * as TavilyCore from '@tavily/core';

/**
 * Tavily 搜索参数 Schema
 */
const SearchQueryParams = z.object({
  query: z.string().describe('Search query keyword'),
});

/**
 * Tavily 搜索核心逻辑
 */
async function executeTavilySearch(query: string): Promise<string> {
  logger.info(`[TravilySearchTool]: ${query}`);
  
  try {
    const tavilyApiKey = await settingService.getConfigValueByKey('TAVILY_API_KEY');
    const tavilyClient = TavilyCore.tavily({ apiKey: tavilyApiKey });
    const result = await tavilyClient.search(query);

    logger.info(`[TravilySearchTool] search result count: ${result?.results.length}`);
    return `TravilySearchTool query result: ${JSON.stringify(result)}`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TravilySearchTool] search failed:`, error);
    return `TravilySearchTool query failed: ${errorMsg}`;
  }
}

/**
 * LangChain 规范的 Tavily 搜索工具
 */
export const TravilySearchTool = langchainTool(
  async (params): Promise<string> => {
    const { query } = params as z.infer<typeof SearchQueryParams>;
    return executeTavilySearch(query);
  },
  {
    name: 'TravilySearchTool',
    description: '通过 Tavily 搜索互联网信息，能够快速搜索到最新的互联网信息',
    schema: SearchQueryParams,
  },
);

/**
 * Claude Agent SDK 规范的 Tavily 搜索工具
 */
export const TravilySearchClaudeTool = claudeTool(
  'TravilySearchTool',
  '通过 Tavily 搜索互联网信息，能够快速搜索到最新的互联网信息',
  {
    query: z.string().describe('Search query keyword'),
  },
  async (args) => {
    try {
      const result = await executeTavilySearch(args.query);
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[TravilySearchClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `TravilySearchTool query failed: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
