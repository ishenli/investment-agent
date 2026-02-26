/**
 * Base Repository for Chat Storage
 *
 * 提供通用的 CRUD 操作，类似于 Dexie 的 BaseModel 模式
 * 但使用 Drizzle ORM 操作 SQLite 数据库
 */
import { db } from '@server/lib/db';
import { eq, and, desc, asc, SQL, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

export abstract class BaseRepository<T extends { id: string; createdAt: Date; updatedAt: Date }> {
  constructor(
    protected table: SQLiteTable,
    protected idGenerator: () => string = nanoid
  ) {}

  /**
   * 创建新记录
   */
  protected async _create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ id: string }> {
    const id = this.idGenerator();
    const now = new Date();

    await (db as any).insert(this.table).values({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  }

  /**
   * 根据 ID 查找记录 (protected)
   */
  protected async _findById(id: string): Promise<T | undefined> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);

    return results[0] as T | undefined;
  }

  /**
   * 更新记录
   */
  protected async _update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    try {
      await (db as any)
        .update(this.table)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq((this.table as any).id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除记录
   */
  protected async _delete(id: string): Promise<boolean> {
    try {
      await (db as any)
        .delete(this.table)
        .where(eq((this.table as any).id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 批量删除记录
   */
  protected async _deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await (db as any)
      .delete(this.table)
      .where((this.table as any).id.in(ids));
  }

  /**
   * 查找所有记录
   */
  protected async _findAll(options?: {
    where?: SQL;
    orderBy?: 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let query = (db as any).select().from(this.table);

    if (options?.where) {
      query = query.where(options.where);
    }

    if (options?.orderBy) {
      const column = (this.table as any)[options.orderBy];
      query = query.orderBy(options.order === 'desc' ? desc(column) : asc(column));
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query as T[];
  }

  /**
   * 计数
   */
  protected async _count(where?: SQL): Promise<number> {
    const query = (db as any)
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(this.table);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * 检查记录是否存在
   */
  protected async _exists(id: string): Promise<boolean> {
    const result = await this._findById(id);
    return !!result;
  }
}