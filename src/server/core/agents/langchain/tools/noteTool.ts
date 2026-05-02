import logger from '@server/base/logger';
import { searchNotes } from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

/**
 * Note 查询参数 Schema
 */
const NoteQueryParams = z.object({
  query: z.string().describe('Note query keyword'),
});

/**
 * Note 查询核心逻辑
 */
async function executeNoteQuery(query: string): Promise<string> {
  try {
    return await searchNotes(query);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[noteQueryTool] query failed:`, error);
    return `Note query failed: ${errorMsg}`;
  }
}

/**
 * LangChain 规范的 Note 查询工具
 */
export const noteQueryTool = langchainTool(
  async (params): Promise<string> => {
    const { query } = params as z.infer<typeof NoteQueryParams>;
    return executeNoteQuery(query);
  },
  {
    name: 'noteQueryTool',
    description: '查询投资笔记，主要是包含公司关键词、近期行业分析、投资重点等',
    schema: NoteQueryParams,
  },
);

/**
 * Claude Agent SDK 规范的 Note 查询工具
 */
export const noteQueryClaudeTool = claudeTool(
  'noteQueryTool',
  '查询投资笔记，主要是包含公司关键词、近期行业分析、投资重点等',
  {
    query: z.string().describe('Note query keyword'),
  },
  async (args) => {
    try {
      const result = await executeNoteQuery(args.query);
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
      logger.error(`[noteQueryClaudeTool] failed:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Note query failed: ${errorMsg}`,
          },
        ],
        isError: true,
      };
    }
  }
);
