import logger from '@server/base/logger';
import noteService from '@server/service/noteService';
import { tool } from '@langchain/core/tools';
import z from 'zod';

// 帮我实现一个 note 的 query 工具
const NoteQueryParams = z.object({
  query: z.string().describe('Note query keyword'),
});

export const noteQueryTool = tool(
  async (params): Promise<string> => {
    const { query } = params as z.infer<typeof NoteQueryParams>;
    logger.info(`[noteQueryTool]: ${query}`);
    try {
      const result = await noteService.searchNotes(query);
      return `Note query result: ${result}`;
    } catch (error) {
      return `Note query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: 'noteQueryTool',
    description: '查询投资笔记，主要是包含公司关键词、近期行业分析、投资重点等',
    schema: NoteQueryParams,
  },
);
