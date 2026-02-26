/**
 * Account Fund Repository
 *
 * 数据访问层：负责 account_funds 表的数据库操作
 */
import { accountFunds } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Account Fund 实体类型
 */
export type AccountFundEntity = typeof accountFunds.$inferSelect;

/**
 * 创建账户资金数据类型
 */
export type CreateAccountFundData = Omit<AccountFundEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Account Fund Repository
 * 管理账户资金数据
 */
export class AccountFundRepository extends BaseIntRepository<AccountFundEntity> {
  constructor() {
    super(accountFunds);
  }

  /**
   * 根据账户 ID 查找资金记录
   */
  async findByAccountId(accountId: number): Promise<AccountFundEntity | null> {
    return this.findOne(eq(accountFunds.accountId, accountId));
  }

  /**
   * 更新账户余额
   */
  async updateBalance(accountId: number, newAmountCents: number): Promise<AccountFundEntity | null> {
    const fund = await this.findByAccountId(accountId);
    if (!fund) {
      return null;
    }
    return this.update(fund.id, { amountCents: newAmountCents });
  }

  /**
   * 检查账户资金记录是否存在
   */
  async existsByAccountId(accountId: number): Promise<boolean> {
    return this.exists(eq(accountFunds.accountId, accountId));
  }

  /**
   * 创建账户资金记录
   */
  async createAccountFund(data: CreateAccountFundData): Promise<AccountFundEntity> {
    return this.create(data);
  }
}

// 导出单例实例
export const accountFundRepository = new AccountFundRepository();
