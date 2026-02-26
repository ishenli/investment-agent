/**
 * Account Repository
 *
 * 数据访问层：负责 accounts 表的数据库操作
 */
import { accounts } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Account 实体类型
 */
export type AccountEntity = typeof accounts.$inferSelect;

/**
 * Account Repository
 * 管理账户数据
 */
export class AccountRepository extends BaseIntRepository<AccountEntity> {
  constructor() {
    super(accounts);
  }

  /**
   * 根据用户 ID 查找所有账户
   */
  async findByUserId(userId: number): Promise<AccountEntity[]> {
    return this.findMany(eq(accounts.userId, userId));
  }

  /**
   * 验证账户是否存在
   */
  async existsById(accountId: number): Promise<boolean> {
    return this.exists(eq(accounts.id, accountId));
  }
}

// 导出单例实例
export const accountRepository = new AccountRepository();
