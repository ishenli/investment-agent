import logger from '@server/base/logger';
import { searchNotes, createNote, listNotes, getNote, updateNote, deleteNote } from '@server/core/business';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import { Type, type TObject } from '@sinclair/typebox';
import z from 'zod';

import type { HermesToolConfig } from './types';

// ============== Core Logic ==============

async function executeNoteQuery(query: string): Promise<string> {
  try {
    return await searchNotes(query);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[NoteQueryTool] query failed:`, error);
    return `Note query failed: ${errorMsg}`;
  }
}

// ============== Claude Agent SDK Adapter ==============

export const noteQueryClaudeTool = claudeTool(
  'noteQueryTool',
  '查询投资笔记，主要是包含公司关键词、近期行业分析、投资重点等',
  {
    query: z.string().describe('Note query keyword'),
  },
  async (args) => {
    try {
      const result = await executeNoteQuery(args.query);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[noteQueryClaudeTool] failed:`, error);
      return { content: [{ type: 'text', text: `Note query failed: ${errorMsg}` }], isError: true };
    }
  },
);

// ============== Hermes Adapters ==============

const noteQuerySchema: TObject = Type.Object({
  query: Type.String({ description: '笔记搜索关键词' }),
});

export const noteQueryHermesConfig: HermesToolConfig = {
  name: 'note_query',
  description: '查询投资笔记（公司分析、行业研究、投资重点等）',
  schema: noteQuerySchema,
  handler: async (_id, args) => {
    try {
      const result = await executeNoteQuery(String(args.query));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const noteCreateSchema: TObject = Type.Object({
  title: Type.String({ description: '笔记标题' }),
  content: Type.String({ description: '笔记内容' }),
  tags: Type.Optional(Type.Array(Type.String(), { description: '标签列表' })),
});

export const noteCreateHermesConfig: HermesToolConfig = {
  name: 'note_create',
  description: '创建新的投资笔记',
  schema: noteCreateSchema,
  handler: async (_id, args) => {
    try {
      const result = await createNote(String(args.title), String(args.content), (args.tags as string[]) ?? undefined);
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};

const noteListSchema: TObject = Type.Object({
  limit: Type.Optional(Type.Number({ description: '每页数量，默认20' })),
  offset: Type.Optional(Type.Number({ description: '偏移量，默认0' })),
  search: Type.Optional(Type.String({ description: '搜索关键词（标题或内容）' })),
  tag: Type.Optional(Type.String({ description: '按标签过滤' })),
  sort_by: Type.Optional(Type.String({ description: '排序字段: createdAt | updatedAt | title，默认 createdAt' })),
  sort_order: Type.Optional(Type.String({ description: '排序方向: asc | desc，默认 desc' })),
});

export const noteListHermesConfig: HermesToolConfig = {
  name: 'note_list',
  description: '列出当前用户的投资笔记（支持分页、搜索、标签过滤）',
  schema: noteListSchema,
  handler: async (_id, args) => {
    try {
      const result = await listNotes(
        args.limit ? Number(args.limit) : undefined,
        args.offset ? Number(args.offset) : undefined,
        args.search ? String(args.search) : undefined,
        args.tag ? String(args.tag) : undefined,
        args.sort_by ? String(args.sort_by) as 'createdAt' | 'updatedAt' | 'title' : undefined,
        args.sort_order ? String(args.sort_order) as 'asc' | 'desc' : undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const noteGetSchema: TObject = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
});

export const noteGetHermesConfig: HermesToolConfig = {
  name: 'note_get',
  description: '获取单条投资笔记的完整内容',
  schema: noteGetSchema,
  handler: async (_id, args) => {
    try {
      const result = await getNote(String(args.note_id));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const noteUpdateSchema: TObject = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
  title: Type.Optional(Type.String({ description: '新标题' })),
  content: Type.Optional(Type.String({ description: '新内容' })),
  tags: Type.Optional(Type.Array(Type.String(), { description: '新标签列表' })),
});

export const noteUpdateHermesConfig: HermesToolConfig = {
  name: 'note_update',
  description: '更新投资笔记的标题、内容或标签',
  schema: noteUpdateSchema,
  handler: async (_id, args) => {
    try {
      const result = await updateNote(
        String(args.note_id),
        args.title !== undefined ? String(args.title) : undefined,
        args.content !== undefined ? String(args.content) : undefined,
        args.tags !== undefined ? (args.tags as string[]) : undefined,
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};

const noteDeleteSchema: TObject = Type.Object({
  note_id: Type.String({ description: '笔记ID' }),
});

export const noteDeleteHermesConfig: HermesToolConfig = {
  name: 'note_delete',
  description: '删除投资笔记',
  schema: noteDeleteSchema,
  handler: async (_id, args) => {
    try {
      const result = await deleteNote(String(args.note_id));
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'system',
};