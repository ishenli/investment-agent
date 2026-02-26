/**
 * Transaction Repository
 *
 * 数据访问层：负责 transactions 表的数据库操作
 */
import { db } from '@server/lib/db';
import { transactions } from '@/drizzle/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * 现金流类型
 */
export type CashFlow = {
  type: 'deposit' | 'withdrawal';
  amountCents: number;
  date: Date;
};

export type TransactionEntity = typeof transactions.$inferSelect;

/**
 * 创建交易数据类型
 */
export type CreateTransactionData = {
  accountId: number;
  type: string;
  symbol?: string;
  quantity?: number;
  priceCents?: number;
  totalAmountCents: number;
  market?: 'US' | 'CN' | 'HK';
  description?: string;
  feeCents?: number;
  tradeTime?: Date;
};

/**
 * 更新交易数据类型
 */
export type UpdateTransactionData = Partial<Omit<TransactionEntity, 'id' | 'createdAt' | 'updatedAt'>>;


/**
 * Transaction Repository
 * 管理交易记录数据
 */
export class TransactionRepository extends BaseIntRepository<TransactionEntity> {
  constructor() {
    super(transactions);
  }

  /**
   * 创建交易记录
   */
  async createTransaction(data: CreateTransactionData): Promise<TransactionEntity> {
    const now = new Date();
    const [result] = await (db as any)
      .insert(transactions)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result as TransactionEntity;
  }

  /**
   * 更新交易记录
   */
  async updateTransaction(id: number, data: UpdateTransactionData): Promise<TransactionEntity | null> {
    return this.update(id, data);
  }

  /**
   * 根据账户 ID 查找所有交易记录
   */
  async findByAccountId(
    accountId: number,
    limit?: number,
    offset?: number,
  ): Promise<any[]> {
    return this.findMany(eq(transactions.accountId, accountId), {
      orderBy: [desc(transactions.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * 统计账户的交易记录数量
   */
  async countByAccountId(accountId: number): Promise<number> {
    return this.count(eq(transactions.accountId, accountId));
  }

  /**
   * 获取指定时间范围内的现金流（入金和出金）
   */
  async getCashFlows(
    accountId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlow[]> {
    const cashFlowRecords = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, accountId),
        sql`${transactions.type} IN ('deposit', 'withdrawal')`,
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate),
      ),
      orderBy: [transactions.createdAt],
    });

    return cashFlowRecords.map((record) => ({
      type: record.type as 'deposit' | 'withdrawal',
      amountCents: record.totalAmountCents ?? 0,
      date: record.createdAt,
    }));
  }

  /**
   * 获取指定时间范围内的所有交易记录
   */
  async findByAccountIdAndDateRange(
    accountId: number,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number,
  ): Promise<any[]> {
    return this.findMany(
      and(
        eq(transactions.accountId, accountId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate),
      )!,
      {
        orderBy: [desc(transactions.createdAt)],
        limit,
        offset,
      },
    );
  }

  /**
   * 获取账户在指定时间点之前的所有交易
   */
  async findBeforeTransactionId(
    accountId: number,
    beforeTransactionId: number,
  ): Promise<any[]> {
    // 先获取指定交易的时间
    const transaction = await this.findById(beforeTransactionId);
    
    if (!transaction || !transaction.createdAt) {
      return [];
    }

    return this.findMany(
      and(
        eq(transactions.accountId, accountId),
        lte(transactions.createdAt, transaction.createdAt),
      )!,
      {
        orderBy: [desc(transactions.createdAt)],
      },
    );
  }

  /**
   * 统计指定时间范围内的出入金总额
   */
  async getTotalDepositsAndWithdrawals(
    accountId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalDepositCents: number; totalWithdrawalCents: number }> {
    const cashFlows = await this.getCashFlows(accountId, startDate, endDate);

    const totalDepositCents = cashFlows
      .filter((cf) => cf.type === 'deposit')
      .reduce((sum, cf) => sum + cf.amountCents, 0);

    const totalWithdrawalCents = cashFlows
      .filter((cf) => cf.type === 'withdrawal')
      .reduce((sum, cf) => sum + cf.amountCents, 0);

    return { totalDepositCents, totalWithdrawalCents };
  }
}

// 导出单例实例
export const transactionRepository = new TransactionRepository();
