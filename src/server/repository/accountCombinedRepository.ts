/**
 * Account Combined Repository
 *
 * 数据访问层：负责 accounts、account_funds、users 表的联合查询操作
 * 用于处理多表 JOIN 查询，避免 N+1 问题
 */
import { db } from '@server/lib/db';
import { accounts, accountFunds, users, userSelectedAccounts } from '@/drizzle/schema';
import { eq, and, desc, sql, isNull, inArray } from 'drizzle-orm';
import type { AccountEntity } from './accountRepository';
import type { AccountFundEntity } from './accountFundRepository';
import type { UserEntity } from './userRepository';

/**
 * 交易账户详情（包含关联的用户和资金信息）
 */
export interface TradingAccountDetail {
  account: AccountEntity;
  fund: AccountFundEntity | null;
  user: { username: string } | null;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
}

/**
 * Account Combined Repository
 * 处理涉及 accounts、accountFunds、users 的多表查询
 */
export class AccountCombinedRepository {
  // ============== 查询操作 ==============

  /**
   * 获取交易账户详情（包含关联的用户和资金信息）
   * 合并了 accounts + accountFunds + users 的查询
   */
  async findTradingAccountById(
    accountId: number,
    userId: number
  ): Promise<TradingAccountDetail | null> {
    // 查询账户（验证归属）
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId),
        isNull(accounts.deletedAt)
      ),
    });

    if (!account) {
      return null;
    }

    // 并行查询资金和用户信息
    const [fund, user] = await Promise.all([
      db.query.accountFunds.findFirst({
        where: eq(accountFunds.accountId, account.id),
      }),
      db.query.users.findFirst({
        where: eq(users.id, account.userId),
      }),
    ]);

    return {
      account: account as AccountEntity,
      fund: fund as AccountFundEntity | null,
      user: user ? { username: user.username } : null,
    };
  }

  /**
   * 分页获取用户的交易账户列表（包含关联的资金和用户信息）
   */
  async findTradingAccountsByUserId(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<TradingAccountDetail>> {
    // 并行查询：总数 + 分页账户数据 + 用户信息
    const [[totalCountResult], accountRows, user] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt))),
      db.query.accounts.findMany({
        where: and(eq(accounts.userId, userId), isNull(accounts.deletedAt)),
        orderBy: [desc(accounts.createdAt)],
        limit,
        offset,
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
      }),
    ]);

    // 批量获取资金信息
    const accountIds = accountRows.map((acc: typeof accounts.$inferSelect) => acc.id);
    const funds = await db.query.accountFunds.findMany({
      where: inArray(accountFunds.accountId, accountIds),
    });

    // 构建资金 Map
    const fundMap = new Map<number, typeof accountFunds.$inferSelect>();
    for (const fund of funds) {
      fundMap.set(fund.accountId, fund);
    }

    // 组装结果
    const items: TradingAccountDetail[] = accountRows.map((acc: typeof accounts.$inferSelect) => ({
      account: acc as AccountEntity,
      fund: (fundMap.get(acc.id) as AccountFundEntity) ?? null,
      user: user ? { username: user.username } : null,
    }));

    return {
      items,
      totalCount: totalCountResult?.count ?? 0,
    };
  }

  /**
   * 验证账户归属权
   */
  async verifyAccountOwnership(accountId: number, userId: number): Promise<boolean> {
    const result = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId),
        isNull(accounts.deletedAt)
      ))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 获取用户选中的账户详情
   */
  async findSelectedAccountByUserId(userId: number): Promise<TradingAccountDetail | null> {
    // 查询用户选中的账户
    const selected = await db.query.userSelectedAccounts.findFirst({
      where: eq(userSelectedAccounts.userId, userId),
      orderBy: [desc(userSelectedAccounts.updatedAt)],
    });

    if (!selected) {
      return null;
    }

    // 获取账户详情
    return this.findTradingAccountById(selected.accountId, userId);
  }
}

// 导出单例实例
export const accountCombinedRepository = new AccountCombinedRepository();