/**
 * User Selected Account Repository
 *
 * 数据访问层：负责 user_selected_accounts 表的数据库操作
 */
import { userSelectedAccounts } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * User Selected Account 实体类型
 */
export type UserSelectedAccountEntity = typeof userSelectedAccounts.$inferSelect;

/**
 * User Selected Account Repository
 * 管理用户选中账户的数据
 */
export class UserSelectedAccountRepository extends BaseIntRepository<UserSelectedAccountEntity> {
  constructor() {
    super(userSelectedAccounts);
  }

  // ============== 查询操作 ==============

  /**
   * 根据用户 ID 查询选中的账户记录
   * 按更新时间倒序返回最新的一条
   */
  async findByUserId(userId: number): Promise<UserSelectedAccountEntity | null> {
    const results = await this.findMany(eq(userSelectedAccounts.userId, userId), {
      orderBy: [desc(userSelectedAccounts.updatedAt)],
      limit: 1,
    });
    return results[0] ?? null;
  }

  /**
   * 检查用户是否有选中的账户记录
   */
  async existsByUserId(userId: number): Promise<boolean> {
    return this.exists(eq(userSelectedAccounts.userId, userId));
  }

  // ============== 更新操作 ==============

  /**
   * 创建或更新用户选中的账户
   * 如果用户已有选中账户记录，则更新；否则创建新记录
   */
  async upsert(userId: number, accountId: number): Promise<UserSelectedAccountEntity> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const updated = await this.update(existing.id, { accountId });
      return updated!;
    }

    return this.create({
      userId,
      accountId,
    });
  }
}

// 导出单例实例
export const userSelectedAccountRepository = new UserSelectedAccountRepository();