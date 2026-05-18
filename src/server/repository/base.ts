/**
 * Base Repository for Integer Primary Key Tables
 *
 * 提供通用的 CRUD 操作，适用于使用自增整数主键的表
 * 支持软删除（Soft Delete）功能
 */
import { db } from '@server/lib/db';
import { eq, and, isNull, isNotNull, SQL, sql } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * 基础实体接口（整数主键）
 */
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * 轻量基础实体接口（无 updatedAt）
 */
export interface BaseLiteEntity {
  id: number;
  createdAt: Date;
}

/**
 * 支持软删除的实体接口
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: Date | null;
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
  /**
   * 是否包含已软删除的记录
   * 仅在 enableSoftDelete = true 时生效，默认 false
   */
  includeDeleted?: boolean;
}

/**
 * 整数主键基础仓库
 *
 * 软删除使用说明：
 *   子类中覆写 `protected readonly enableSoftDelete = true` 来开启软删除支持。
 *   开启后，所有查询方法默认自动过滤 deletedAt IS NOT NULL 的记录。
 *   传入 `{ includeDeleted: true }` 可绕过过滤。
 */
export abstract class BaseIntRepository<T extends BaseEntity> {
  /**
   * 是否启用软删除
   * 子类覆写为 true，查询默认排除已删除记录
   */
  protected readonly enableSoftDelete: boolean = false;

  constructor(protected table: SQLiteTable) {}

  // ─────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────

  private get deletedAtCol() {
    return (this.table as any).deletedAt;
  }

  /**
   * 构建包含软删除过滤的 where 条件
   * enableSoftDelete = false 或 includeDeleted = true 时，直接返回原始条件
   */
  private buildWhere(where?: SQL, includeDeleted = false): SQL | undefined {
    if (!this.enableSoftDelete || includeDeleted) return where;
    const notDeleted = isNull(this.deletedAtCol);
    return where ? and(where, notDeleted) : notDeleted;
  }

  private assertSoftDeleteEnabled(): void {
    if (!this.enableSoftDelete) {
      throw new Error(
        `[${this.constructor.name}] 软删除未启用，请在子类中设置 protected readonly enableSoftDelete = true`
      );
    }
  }

  // ─────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────

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
   * 默认过滤软删除记录；传入 `{ includeDeleted: true }` 可包含已删除记录
   */
  async findById(id: number, options?: { includeDeleted?: boolean }): Promise<T | null> {
    const where = this.buildWhere(
      eq((this.table as any).id, id),
      options?.includeDeleted
    );
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);

    return (results[0] as T) ?? null;
  }

  /**
   * 根据条件查找单条记录
   */
  async findOne(where: SQL, options?: { includeDeleted?: boolean }): Promise<T | null> {
    const finalWhere = this.buildWhere(where, options?.includeDeleted);
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(finalWhere)
      .limit(1);

    return (results[0] as T) ?? null;
  }

  /**
   * 根据条件查找多条记录
   */
  async findMany(where?: SQL, options?: QueryOptions): Promise<T[]> {
    const finalWhere = this.buildWhere(where, options?.includeDeleted);

    let query = (db as any).select().from(this.table);

    if (finalWhere) {
      query = query.where(finalWhere);
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
   * 启用软删除时，不会更新已软删除的记录
   */
  async update(id: number, data: UpdateData<T>): Promise<T | null> {
    const where = this.buildWhere(eq((this.table as any).id, id));

    await (db as any)
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(where);

    return this.findById(id);
  }

  /**
   * 根据条件更新记录
   */
  async updateWhere(where: SQL, data: UpdateData<T>): Promise<void> {
    const finalWhere = this.buildWhere(where);

    await (db as any)
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(finalWhere);
  }

  /**
   * 物理删除记录
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
   * 根据条件物理删除记录
   */
  async deleteWhere(where: SQL): Promise<void> {
    await (db as any).delete(this.table).where(where);
  }

  /**
   * 批量物理删除记录
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
  async count(where?: SQL, options?: { includeDeleted?: boolean }): Promise<number> {
    const finalWhere = this.buildWhere(where, options?.includeDeleted);

    let query = (db as any)
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(this.table);

    if (finalWhere) {
      query = query.where(finalWhere);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * 检查记录是否存在
   */
  async exists(where: SQL, options?: { includeDeleted?: boolean }): Promise<boolean> {
    const finalWhere = this.buildWhere(where, options?.includeDeleted);

    const result = await (db as any)
      .select({ id: (this.table as any).id })
      .from(this.table)
      .where(finalWhere)
      .limit(1);

    return result.length > 0;
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────

  /**
   * 软删除记录（设置 deletedAt 时间戳）
   * 仅对未删除的记录生效
   * 需要 enableSoftDelete = true
   */
  async softDelete(id: number): Promise<boolean> {
    this.assertSoftDeleteEnabled();

    try {
      await (db as any)
        .update(this.table)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq((this.table as any).id, id),
            isNull(this.deletedAtCol)
          )
        );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 根据条件批量软删除
   * 需要 enableSoftDelete = true
   */
  async softDeleteWhere(where: SQL): Promise<void> {
    this.assertSoftDeleteEnabled();

    await (db as any)
      .update(this.table)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(where, isNull(this.deletedAtCol)));
  }

  /**
   * 恢复软删除的记录（清除 deletedAt）
   * 仅对已删除的记录生效
   * 需要 enableSoftDelete = true
   */
  async restore(id: number): Promise<T | null> {
    this.assertSoftDeleteEnabled();

    await (db as any)
      .update(this.table)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq((this.table as any).id, id),
          isNotNull(this.deletedAtCol)
        )
      );

    return this.findById(id);
  }

  /**
   * 根据条件批量恢复软删除的记录
   * 需要 enableSoftDelete = true
   */
  async restoreWhere(where: SQL): Promise<void> {
    this.assertSoftDeleteEnabled();

    await (db as any)
      .update(this.table)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(where, isNotNull(this.deletedAtCol)));
  }

  /**
   * 查找已软删除的记录
   * 需要 enableSoftDelete = true
   */
  async findDeleted(where?: SQL, options?: Omit<QueryOptions, 'includeDeleted'>): Promise<T[]> {
    this.assertSoftDeleteEnabled();

    const deletedFilter = isNotNull(this.deletedAtCol);
    const finalWhere = where ? and(where, deletedFilter) : deletedFilter;

    let query = (db as any).select().from(this.table).where(finalWhere);

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
}

/**
 * 字符串主键基础实体接口
 */
export interface BaseStringEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * 字符串主键基础仓库
 *
 * 适用于使用 UUID/nanoid 等字符串主键的表，如 evaluation_runs、evaluation_baselines
 */
export abstract class BaseStringRepository<T extends BaseStringEntity> {
  constructor(protected table: SQLiteTable) {}

  async create(data: Omit<T, 'createdAt' | 'updatedAt'> & { id: string }): Promise<T> {
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

  async findById(id: string): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);

    return (results[0] as T) ?? null;
  }

  async findOne(where: SQL): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);

    return (results[0] as T) ?? null;
  }

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

  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.findMany(undefined, options);
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T | null> {
    await (db as any)
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq((this.table as any).id, id));

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await (db as any)
        .delete(this.table)
        .where(eq((this.table as any).id, id));
      return true;
    } catch {
      return false;
    }
  }

  async count(where?: SQL): Promise<number> {
    let query = (db as any)
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(this.table);

    if (where) {
      query = query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return !!result;
  }
}

/**
 * 轻量版整数主键基础仓库（无 updatedAt / 软删除支持）
 *
 * 适用于只有 id + createdAt 的表，如 evaluation_case_results、evaluation_scorer_results
 */
export type CreateLiteData<T extends BaseLiteEntity> = Omit<T, 'id' | 'createdAt'>;
export type UpdateLiteData<T extends BaseLiteEntity> = Partial<Omit<T, 'id' | 'createdAt'>>;

export abstract class BaseIntRepositoryLite<T extends BaseLiteEntity> {
  constructor(protected table: SQLiteTable) {}

  async create(data: CreateLiteData<T>): Promise<T> {
    const [result] = await (db as any)
      .insert(this.table)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return result as T;
  }

  async findById(id: number): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return (results[0] as T) ?? null;
  }

  async findOne(where: SQL): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);
    return (results[0] as T) ?? null;
  }

  async findMany(where?: SQL, options?: QueryOptions): Promise<T[]> {
    let query = (db as any).select().from(this.table);
    if (where) query = query.where(where);
    if (options?.orderBy) query = query.orderBy(...options.orderBy);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);
    return (await query) as T[];
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.findMany(undefined, options);
  }

  async update(id: number, data: UpdateLiteData<T>): Promise<T | null> {
    await (db as any)
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await (db as any).delete(this.table).where(eq((this.table as any).id, id));
      return true;
    } catch {
      return false;
    }
  }

  async count(where?: SQL): Promise<number> {
    let query = (db as any)
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(this.table);
    if (where) query = query.where(where);
    const result = await query;
    return result[0]?.count ?? 0;
  }

  async exists(where: SQL): Promise<boolean> {
    const result = await (db as any)
      .select({ id: (this.table as any).id })
      .from(this.table)
      .where(where)
      .limit(1);
    return result.length > 0;
  }
}

/**
 * 字符串主键轻量基础实体接口（无 updatedAt）
 */
export interface BaseStringLiteEntity {
  id: string;
  createdAt: Date;
}

/**
 * 轻量版字符串主键基础仓库（无 updatedAt）
 *
 * 适用于只有 id(string) + createdAt 的表，如 evaluation_baselines
 */
export abstract class BaseStringRepositoryLite<T extends BaseStringLiteEntity> {
  constructor(protected table: SQLiteTable) {}

  async create(data: Omit<T, 'createdAt'> & { id: string }): Promise<T> {
    const [result] = await (db as any)
      .insert(this.table)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return result as T;
  }

  async findById(id: string): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return (results[0] as T) ?? null;
  }

  async findOne(where: SQL): Promise<T | null> {
    const results = await (db as any)
      .select()
      .from(this.table)
      .where(where)
      .limit(1);
    return (results[0] as T) ?? null;
  }

  async findMany(where?: SQL, options?: QueryOptions): Promise<T[]> {
    let query = (db as any).select().from(this.table);
    if (where) query = query.where(where);
    if (options?.orderBy) query = query.orderBy(...options.orderBy);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);
    return (await query) as T[];
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.findMany(undefined, options);
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    await (db as any)
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await (db as any)
        .delete(this.table)
        .where(eq((this.table as any).id, id));
      return true;
    } catch {
      return false;
    }
  }

  async count(where?: SQL): Promise<number> {
    let query = (db as any)
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(this.table);
    if (where) query = query.where(where);
    const result = await query;
    return result[0]?.count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return !!result;
  }
}
