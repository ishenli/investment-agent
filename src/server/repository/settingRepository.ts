/**
 * Setting Repository
 *
 * 数据访问层：负责 settings 表的数据库操作
 */
import { db } from '@server/lib/db';
import { settings } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Setting 实体接口
 */
export interface Setting {
  id: number;
  userId: number;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Setting Repository
 * 管理用户设置数据
 */
export class SettingRepository extends BaseIntRepository<Setting> {
  constructor() {
    super(settings);
  }

  /**
   * 根据用户 ID 查找所有设置
   */
  async findByUserId(userId: number): Promise<Setting[]> {
    return this.findMany(eq(settings.userId, userId));
  }

  /**
   * 根据用户 ID 和 key 查找设置
   */
  async findByUserIdAndKey(userId: number, key: string): Promise<Setting | null> {
    return this.findOne(and(eq(settings.userId, userId), eq(settings.key, key))!);
  }

  /**
   * 检查设置是否存在
   */
  async existsByUserIdAndKey(userId: number, key: string): Promise<boolean> {
    return this.exists(and(eq(settings.userId, userId), eq(settings.key, key))!);
  }

  /**
   * 创建或更新设置（Upsert）
   * @param userId 用户 ID
   * @param key 设置键
   * @param value 设置值
   * @returns 创建或更新的设置
   */
  async upsert(userId: number, key: string, value: string): Promise<Setting> {
    const existing = await this.findByUserIdAndKey(userId, key);

    if (existing) {
      // 更新现有设置
      return (await this.update(existing.id, { value }))!;
    } else {
      // 创建新设置
      return this.create({
        userId,
        key,
        value,
      });
    }
  }

  /**
   * 根据用户 ID 和 key 删除设置
   */
  async deleteByUserIdAndKey(userId: number, key: string): Promise<boolean> {
    const setting = await this.findByUserIdAndKey(userId, key);
    if (!setting) {
      return false;
    }
    return this.delete(setting.id);
  }

  /**
   * 删除用户的所有设置
   */
  async deleteByUserId(userId: number): Promise<void> {
    await this.deleteWhere(eq(settings.userId, userId));
  }

  /**
   * 批量获取多个 key 的设置
   * @returns Map<key, value>
   */
  async findMapByUserIdAndKeys(userId: number, keys: string[]): Promise<Map<string, string>> {
    const results = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId))!);

    const filtered = results.filter((s) => keys.includes(s.key));
    return new Map(filtered.map((s) => [s.key, s.value]));
  }
}

// 导出单例实例
export const settingRepository = new SettingRepository();