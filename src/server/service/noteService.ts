import { db } from '@server/lib/db';
import { notes } from '@/drizzle/schema';
import { eq, like, and, desc, asc, or, inArray, count } from 'drizzle-orm';
import logger from '@server/base/logger';
import { AuthService } from './authService';

// 定义笔记类型
export type NoteType = {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

// 定义创建笔记请求类型
export type CreateNoteRequestType = {
  userId: string;
  title: string;
  content: string;
  tags: string[];
};

// 定义更新笔记请求类型
export type UpdateNoteRequestType = {
  title?: string;
  content?: string;
  tags?: string[];
};

export class NoteService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 创建新笔记
   * @param request 创建笔记请求数据
   * @returns 创建的笔记
   */
  async createNote(request: CreateNoteRequestType): Promise<NoteType> {
    try {
      const [newNote] = await db
        .insert(notes)
        .values({
          userId: parseInt(request.userId),
          title: request.title,
          content: request.content,
          tags: request.tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Note created successfully for user ${request.userId}`);

      return {
        id: newNote.id.toString(),
        userId: newNote.userId.toString(),
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags as string[],
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to create note: ${error}`);
      throw new Error(`Failed to create note: ${error}`);
    }
  }

  /**
   * 获取用户的笔记列表
   * @param userId 用户ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @param sortBy 排序字段
   * @param sortOrder 排序顺序
   * @returns 笔记列表和总数
   */
  async getUserNotes(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string,
    tag?: string,
  ): Promise<{ items: NoteType[]; totalCount: number }> {
    try {
      // 构建查询条件
      const conditions = [eq(notes.userId, parseInt(userId))];
      
      // 添加搜索条件
      if (search) {
        conditions.push(
          or(
            like(notes.title, `%${search}%`),
            like(notes.content, `%${search}%`)
          )!
        );
      }
      
      // 添加标签筛选条件
      if (tag) {
        conditions.push(like(notes.tags, `%${tag}%`)!);
      }

      // 获取总数
      const [totalCountResult] = await db
        .select({ count: count() })
        .from(notes)
        .where(and(...conditions));

      // 构建排序
      let orderByClause;
      switch (sortBy) {
        case 'title':
          orderByClause = sortOrder === 'asc' ? asc(notes.title) : desc(notes.title);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'asc' ? asc(notes.updatedAt) : desc(notes.updatedAt);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(notes.createdAt) : desc(notes.createdAt);
      }

      // 获取笔记列表
      const noteRows = await db.query.notes.findMany({
        where: and(...conditions),
        orderBy: [orderByClause],
        limit,
        offset,
      });

      const items: NoteType[] = noteRows.map((note) => ({
        id: note.id.toString(),
        userId: note.userId.toString(),
        title: note.title,
        content: note.content,
        tags: note.tags as string[],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));

      return { items, totalCount: totalCountResult?.count || 0 };
    } catch (error) {
      logger.error(`Failed to list notes for user ${userId}: ${error}`);
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * 获取笔记详情
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @returns 笔记详情
   */
  async getNote(noteId: string, userId: string): Promise<NoteType | null> {
    try {
      const note = await db.query.notes.findFirst({
        where: and(eq(notes.id, parseInt(noteId)), eq(notes.userId, parseInt(userId))),
      });

      if (!note) {
        return null;
      }

      return {
        id: note.id.toString(),
        userId: note.userId.toString(),
        title: note.title,
        content: note.content,
        tags: note.tags as string[],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to read note ${noteId}: ${error}`);
      return null;
    }
  }

  /**
   * 更新笔记
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @param request 更新请求数据
   * @returns 更新后的笔记
   */
  async updateNote(
    noteId: string,
    userId: string,
    request: UpdateNoteRequestType,
  ): Promise<NoteType | null> {
    try {
      await db
        .update(notes)
        .set({
          title: request.title,
          content: request.content,
          tags: request.tags,
          updatedAt: new Date(),
        })
        .where(and(eq(notes.id, parseInt(noteId)), eq(notes.userId, parseInt(userId))));

      // 更新后重新获取完整的笔记数据
      const updatedNote = await this.getNote(noteId, userId);
      
      if (!updatedNote) {
        return null;
      }

      logger.info(`Note ${noteId} updated successfully`);

      return updatedNote;
    } catch (error) {
      logger.error(`Failed to update note ${noteId}: ${error}`);
      return null;
    }
  }

  /**
   * 删除笔记
   * @param noteId 笔记ID
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async deleteNote(noteId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(notes)
        .where(and(eq(notes.id, parseInt(noteId)), eq(notes.userId, parseInt(userId))))  ;
      if (!result) {
        return false;
      }
      logger.info(`Note ${noteId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete note ${noteId}: ${error}`);
      return false;
    }
  }

  /**
   * 批量删除笔记
   * @param noteIds 笔记ID数组
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async deleteNotes(noteIds: string[], userId: string): Promise<boolean> {
    try {
      const ids = noteIds.map((id) => parseInt(id));
      await db
        .delete(notes)
        .where(and(eq(notes.userId, parseInt(userId)), inArray(notes.id, ids)));

      logger.info(`Notes ${noteIds.join(', ')} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete notes: ${error}`);
      return false;
    }
  }

  /**
   * 获取用户的所有标签
   * @param userId 用户ID
   * @returns 标签列表
   */
  async getUserTags(userId: string): Promise<string[]> {
    try {
      const result = await db.query.notes.findMany({
        where: eq(notes.userId, parseInt(userId)),
        columns: {
          tags: true,
        },
      });

      // 提取所有标签并去重
      const allTags = result.flatMap((note) => note.tags as string[]);
      const uniqueTags = [...new Set(allTags)];

      return uniqueTags;
    } catch (error) {
      logger.error(`Failed to get tags for user ${userId}: ${error}`);
      return [];
    }
  }

  /**
   * 搜索笔记
   * @param query 搜索内容
   * @returns 笔记列表
   */
  async searchNotes(query: string): Promise<NoteType[]> {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) return [];
    try {
      const result = await db.query.notes.findMany({
        where: and(eq(notes.userId, parseInt(userId)), like(notes.content, `%${query}%`)),
        columns: {
          id: true,
          title: true,
          content: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return result.map((note) => ({
        id: note.id.toString(),
        userId: userId,
        title: note.title,
        content: note.content,
        tags: note.tags as string[],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));
    } catch (error) {
      logger.error(`Failed to search notes for user ${userId}: ${error}`);
      return [];
    }
  }
}

const noteService = new NoteService();

export default noteService;