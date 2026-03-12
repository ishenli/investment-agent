/**
 * Skill Repository
 *
 * 数据访问层：负责 skills 表的数据库操作
 *
 * 说明：skills 表仅存储用户偏好（slug, source, isEnabled, icon）。
 * 内容字段（name, description, category, prompt）由 SKILL.md 文件管理。
 */
import { db } from '@server/lib/db';
import { skills } from '@/drizzle/schema';
import { eq, and, like, sql, SQL } from 'drizzle-orm';
import type { Skill } from '@typings/skill';

export type SkillEntity = typeof skills.$inferSelect;

/**
 * 创建技能数据类型
 */
export type CreateSkillData = {
  slug: string;
  source: string;
  isEnabled?: boolean;
  icon?: string | null;
  userId: number;
};

/**
 * 更新技能数据类型
 */
export type UpdateSkillData = Partial<Omit<SkillEntity, 'id' | 'updatedAt' | 'userId'>>;

/**
 * 查询选项
 */
export interface SkillQueryOptions {
  source?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}

/**
 * Skill Repository
 * 管理技能偏好数据
 */
export class SkillRepository {
  constructor() {
    // 初始化
  }

  /**
   * 根据用户ID查找技能偏好
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 技能偏好列表
   */
  async findByUserId(userId: number, options: SkillQueryOptions = {}): Promise<SkillEntity[]> {
    const { source, limit, offset } = options;

    const conditions = [eq(skills.userId, userId)];

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
   * 根据用户ID和slug查找技能偏好
   * @param userId 用户ID
   * @param slug 技能slug
   * @returns 技能偏好或null
   */
  async findByUserIdAndSlug(userId: number, slug: string): Promise<SkillEntity | null> {
    const result = await db.query.skills.findFirst({
      where: and(eq(skills.userId, userId), eq(skills.slug, slug)),
    });
    return result || null;
  }

  /**
   * 根据用户ID和ID查找技能偏好
   * @param userId 用户ID
   * @param id 技能ID
   * @returns 技能偏好或null
   */
  async findByUserIdAndId(userId: number, id: number): Promise<SkillEntity | null> {
    const result = await db.query.skills.findFirst({
      where: and(eq(skills.userId, userId), eq(skills.id, id)),
    });
    return result || null;
  }

  /**
   * 检查slug是否已存在（同一用户）
   * @param userId 用户ID
   * @param slug 技能slug
   * @param excludeId 排除的技能ID（用于更新时检查）
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
   * 统计用户技能数量
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 技能数量
   */
  async countByUserId(userId: number, options: SkillQueryOptions = {}): Promise<number> {
    const { source } = options;

    const conditions = [eq(skills.userId, userId)];

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
   * 创建技能偏好
   * @param data 技能数据
   * @returns 创建的技能偏好
   */
  async create(data: CreateSkillData): Promise<SkillEntity> {
    const [skill] = await db.insert(skills)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return skill;
  }

  /**
   * 更新技能偏好
   * @param userId 用户ID
   * @param id 技能ID
   * @param data 更新数据
   * @returns 更新的技能偏好或null
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
   * 根据slug更新技能偏好
   * @param userId 用户ID
   * @param slug 技能slug
   * @param data 更新数据
   * @returns 更新的技能偏好或null
   */
  async updateBySlug(userId: number, slug: string, data: UpdateSkillData): Promise<SkillEntity | null> {
    const [skill] = await db.update(skills)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(skills.userId, userId), eq(skills.slug, slug)))
      .returning();

    return skill || null;
  }

  /**
   * 删除技能偏好
   * @param userId 用户ID
   * @param id 技能ID
   * @returns 是否删除成功
   */
  async delete(userId: number, id: number): Promise<boolean> {
    const result = await db.delete(skills)
      .where(and(eq(skills.userId, userId), eq(skills.id, id)));

    return result.rowsAffected > 0;
  }

  /**
   * 根据slug删除技能偏好
   * @param userId 用户ID
   * @param slug 技能slug
   * @returns 是否删除成功
   */
  async deleteBySlug(userId: number, slug: string): Promise<boolean> {
    const result = await db.delete(skills)
      .where(and(eq(skills.userId, userId), eq(skills.slug, slug)));

    return result.rowsAffected > 0;
  }
}

export const skillRepository = new SkillRepository();