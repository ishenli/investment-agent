/**
 * Note Repository
 *
 * 数据访问层：负责 notes 表的数据库操作
 * 支持软删除
 */
import { db } from '@server/lib/db';
import { notes } from '@/drizzle/schema';
import { eq, and, like, or, inArray, desc, asc, SQL, sql, isNull } from 'drizzle-orm';
import { BaseIntRepository } from './base';

// Entity types derived from schema
export type NoteEntity = typeof notes.$inferSelect;
export type CreateNoteData = Omit<NoteEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateNoteData = Partial<Omit<NoteEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;

export class NoteRepository extends BaseIntRepository<NoteEntity> {
  // Enable soft delete support
  protected readonly enableSoftDelete = true;

  constructor() {
    super(notes);
  }

  // ============== Query Operations ==============

  /**
   * 根据ID和用户ID查找笔记
   */
  async findByIdAndUserId(noteId: number, userId: number): Promise<NoteEntity | null> {
    return this.findOne(and(eq(notes.id, noteId), eq(notes.userId, userId))!);
  }

  /**
   * 根据用户ID查找笔记（分页、搜索、标签过滤、排序）
   */
  async findByUserId(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'title';
      sortOrder?: 'asc' | 'desc';
      search?: string;
      tag?: string;
    },
  ): Promise<{ items: NoteEntity[]; totalCount: number }> {
    const conditions = [eq(notes.userId, userId)];

    if (options?.search) {
      conditions.push(or(like(notes.title, `%${options.search}%`), like(notes.content, `%${options.search}%`))!);
    }

    if (options?.tag) {
      conditions.push(like(notes.tags, `%${options.tag}%`)!);
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalCount = await this.count(whereClause!);

    // Build order by
    let orderBy: SQL[];
    const orderFn = options?.sortOrder === 'asc' ? asc : desc;

    switch (options?.sortBy) {
      case 'title':
        orderBy = [orderFn(notes.title)];
        break;
      case 'updatedAt':
        orderBy = [orderFn(notes.updatedAt)];
        break;
      default:
        orderBy = [orderFn(notes.createdAt)];
    }

    // Get paginated items
    const items = await this.findMany(whereClause, {
      orderBy,
      limit: options?.limit,
      offset: options?.offset,
    });

    return { items, totalCount };
  }

  /**
   * 获取用户的所有标签（去重）
   */
  async findUserTags(userId: number): Promise<string[]> {
    const result = await db
      .select({ tags: notes.tags })
      .from(notes)
      .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));

    const allTags = result.flatMap((note) => note.tags as string[]);
    return [...new Set(allTags)];
  }

  /**
   * 搜索用户的笔记内容
   */
  async searchByUserIdAndContent(userId: number, query: string): Promise<NoteEntity[]> {
    return this.findMany(
      and(eq(notes.userId, userId), like(notes.content, `%${query}%`)),
    );
  }

  // ============== Update Operations ==============

  /**
   * 根据ID和用户ID更新笔记
   */
  async updateByIdAndUserId(noteId: number, userId: number, data: UpdateNoteData): Promise<NoteEntity | null> {
    await (db as any)
      .update(notes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)));

    return this.findById(noteId);
  }

  // ============== Delete Operations ==============

  /**
   * 根据ID和用户ID软删除笔记
   */
  async deleteByIdAndUserId(noteId: number, userId: number): Promise<boolean> {
    try {
      await (db as any)
        .update(notes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 批量软删除用户的笔记
   */
  async deleteByUserIdAndIds(userId: number, noteIds: number[]): Promise<boolean> {
    try {
      await (db as any)
        .update(notes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(notes.userId, userId), inArray(notes.id, noteIds)));
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const noteRepository = new NoteRepository();