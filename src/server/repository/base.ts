/**
 * Base Repository for Integer Primary Key Tables
 *
 * 提供通用的 CRUD 操作，适用于使用自增整数主键的表
 */
import { db } from '@server/lib/db';
import { eq, and, SQL } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * 基础实体接口（整数主键）
 */
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建数据接口（排除自动生成字段）
 */
export type CreateData<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新数据接口（可选字段，排除自动管理字段）
 */
export type UpdateData<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 查询条件接口
 */
export interface QueryOptions {
  orderBy?: SQL[];
  limit?: number;
  offset?: number;
}

/**
 * 整数主键基础仓库
 */
export abstract class BaseIntRepository<T extends BaseEntity> {
  constructor(protected table: SQLiteTable) {}

  /**
   * 创建新记录
   */
  async create(data: CreateData<T>): Promise<T> {
    const now = new Date();

    const [result] = await (db as any)
      .insert(this.table)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result as T;
  }

  /**
   * 根据 ID 查找记录
   */
  async findById(id: number): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);

    return (results[0] as T) ?? null;
  }

  /**
   * 根据条件查找单条记录
   */
  async findOne(where: SQL): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);

    return (results[0] as T) ?? null;
  }

  /**
   * 根据条件查找多条记录
   */
  async findMany(where?: SQL, options?: QueryOptions): Promise<T[]> {
    let query = (db as any).select().from(this.table);

    if (where) {
      query = query.where(where);
    }

    if (options?.orderBy) {
      query = query.orderBy(...options.orderBy);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return (await query) as T[];
  }

  /**
   * 查询所有记录
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.findMany(undefined, options);
  }

  /**
   * 更新记录
   */
  async update(id: number, data: UpdateData<T>): Promise<T | null> {
    await (db as any)
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq((this.table as any).id, id));

    return this.findById(id);
  }

  /**
   * 根据条件更新记录
   */
  async updateWhere(where: SQL, data: UpdateData<T>): Promise<void> {
    await (db as any)
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(where);
  }

  /**
   * 删除记录
   */
  async delete(id: number): Promise<boolean> {
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
   * 根据条件删除记录
   */
  async deleteWhere(where: SQL): Promise<void> {
    await (db as any).delete(this.table).where(where);
  }

  /**
   * 批量删除记录
   */
  async deleteMany(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await (db as any)
      .delete(this.table)
      .where((this.table as any).id.in(ids));
  }

  /**
   * 统计记录数量
   */
  async count(where?: SQL): Promise<number> {
    const query = (db as any).select({ count: (db as any).count() }).from(this.table);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * 检查记录是否存在
   */
  async exists(where: SQL): Promise<boolean> {
    const result = await (db as any)
      .select({ id: (this.table as any).id })
      .from(this.table)
      .where(where)
      .limit(1);

    return result.length > 0;
  }
}
