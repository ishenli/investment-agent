/**
 * Skill Repository
 *
 * 数据访问层：负责 skills 表的数据库操作
 */
import { db } from '@server/lib/db';
import { skills } from '@/drizzle/schema';
import { eq, and, like, sql, SQL } from 'drizzle-orm';
import { BaseIntRepository } from './base';
import type { Skill } from '@typings/skill';

export type SkillEntity = typeof skills.$inferSelect;

/**
 * 创建技能数据类型
 */
export type CreateSkillData = {
  slug: string;
  name: string;
  description: string;
  category: string;
  source: string;
  isEnabled?: boolean;
  icon?: string | null;
  config?: Record<string, unknown> | null;
  userId: number;
};

/**
 * 更新技能数据类型
 */
export type UpdateSkillData = Partial<Omit<SkillEntity, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>;

/**
 * 查询选项
 */
export interface SkillQueryOptions {
  search?: string;
  category?: string;
  source?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}

/**
 * Skill Repository
 *管技能数据
 */
export class SkillRepository {
  constructor() {
    // 初始化
  }

  /**
   *根据用户ID查找技能
   * @param userId 用户ID
   * @param options 查询选项
   * @returns技能列表
   */
  async findByUserId(userId: number, options: SkillQueryOptions = {}): Promise<SkillEntity[]> {
    const { search, category, source, limit, offset } = options;
    
    const conditions = [eq(skills.userId, userId)];
    
    if (search) {
      const searchConditions = [
        like(skills.name, `%${search}%`),
        like(skills.description, `%${search}%`),
        like(skills.slug, `%${search}%`)
      ].filter(condition => condition !== undefined) as SQL<unknown>[];
      
      if (searchConditions.length > 0) {
        const searchCondition = and(...searchConditions);
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
    }
    
    if (category) {
      conditions.push(eq(skills.category, category));
    }
    
    if (source) {
      conditions.push(eq(skills.source, source));
    }
    
    const whereCondition = and(...conditions);
    return db.query.skills.findMany({
      where: whereCondition,
      orderBy: (skills, { desc }) => [desc(skills.updatedAt)],
      limit,
      offset,
    });
  }

  /**
   *根据用户ID和slug查找技能
   * @param userId 用户ID
   * @param slug技slug
   * @returns技能或null
   */
  async findByUserIdAndSlug(userId: number, slug: string): Promise<SkillEntity | null> {
    const result = await db.query.skills.findFirst({
      where: and(eq(skills.userId, userId), eq(skills.slug, slug)),
    });
    return result || null;
  }

  /**
   * 根据用户ID和ID查找技能
   * @param userId 用户ID
   * @param id技能ID
   * @returns技能或null
   */
  async findByUserIdAndId(userId: number, id: number): Promise<SkillEntity | null> {
    const result = await db.query.skills.findFirst({
      where: and(eq(skills.userId, userId), eq(skills.id, id)),
    });
    return result || null;
  }

  /**
   *检查slug是否已存在（同一用户）
   * @param userId 用户ID
   * @param slug技能slug
   * @param excludeId排的技能ID（用于更新时检查）
   * @returns 是否存在
   */
  async isSlugExists(userId: number, slug: string, excludeId?: number): Promise<boolean> {
    const conditions = [eq(skills.userId, userId), eq(skills.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${skills.id} != ${excludeId}`);
    }
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(skills)
      .where(and(...conditions));
    
    return result[0].count > 0;
  }

  /**
   *统计用户技能数量
   * @param userId 用户ID
   * @param options 查询选项
   * @returns技能数量
   */
  async countByUserId(userId: number, options: SkillQueryOptions = {}): Promise<number> {
    const { search, category, source } = options;
    
    const conditions = [eq(skills.userId, userId)];
    
    if (search) {
      const searchCondition = and(
        like(skills.name, `%${search}%`),
        like(skills.description, `%${search}%`),
        like(skills.slug, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    if (category) {
      conditions.push(eq(skills.category, category));
    }
    
    if (source) {
      conditions.push(eq(skills.source, source));
    }
    
    const whereCondition = and(...conditions);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(skills)
      .where(whereCondition);
    
    return result[0].count;
  }

  /**
   * 创建技能
   * @param data技能数据
   * @returns 创建的技能
   */
  async create(data: CreateSkillData): Promise<SkillEntity> {
    const [skill] = await db.insert(skills)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return skill;
  }

  /**
   * 更新技能
   * @param userId 用户ID
   * @param id技ID
   * @param data 更新数据
   * @returns 更新的技能或null
   */
  async update(userId: number, id: number, data: UpdateSkillData): Promise<SkillEntity | null> {
    const [skill] = await db.update(skills)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(skills.userId, userId), eq(skills.id, id)))
      .returning();
    
    return skill || null;
  }

  /**
   * 删除技能
   * @param userId 用户ID
   * @param id技能ID
   * @returns 是否删除成功
   */
  async delete(userId: number, id: number): Promise<boolean> {
    const result = await db.delete(skills)
      .where(and(eq(skills.userId, userId), eq(skills.id, id)));
    
    return result.rowsAffected > 0;
  }
}

export const skillRepository = new SkillRepository();