# 迁移到数据库指南

本文档说明如何将当前基于文件系统的账户服务迁移到使用 SQLite 数据库。

## 当前实现

当前的账户服务实现在 `src/server/service/accountService.ts`
文件中，使用文件系统存储数据：

- 用户账户存储在 `data/accounts/users/` 目录中
- 交易账户存储在 `data/accounts/trading/` 目录中
- 交易记录存储在 `data/accounts/transactions/` 目录中
- 持仓信息存储在 `data/accounts/positions/` 目录中
- 收益指标存储在 `data/accounts/metrics/` 目录中

## 数据库表结构

数据库表结构已在 `drizzle/schema.ts` 文件中定义：

- `userAccounts`: 用户账户表
- `accountFunds`: 账户资金表
- `stockPositions`: 股票持仓表
- `transactions`: 交易记录表

## 迁移步骤

### 1. 更新 AccountService 类

将 `src/server/service/accountService.ts` 文件中的实现替换为基于数据库的实现：

```typescript
import {
  UserAccountType,
  TradingAccountType,
  TransactionRecordType,
  PositionType,
  revenueMetricType,
  CreateAccountRequestType,
  UpdateAccountRequestType,
} from '@/types';
import { db } from '@/lib/db';
import {
  userAccounts,
  accountFunds,
  stockPositions,
  transactions,
} from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import logger from '@/server/base/logger';
import { validateWithFormat } from '@/shared';
import {
  CreateAccountRequestSchema,
  UpdateAccountRequestSchema,
} from '@/types/account';

export class AccountService {
  /**
   * Create a new user account with trading account
   * @param request Create account request data
   * @returns Created user account and trading account
   */
  async createAccount(request: CreateAccountRequestType): Promise<{
    userAccount: UserAccountType;
    tradingAccount: TradingAccountType;
  }> {
    // Validate request
    const validationResult = validateWithFormat(
      CreateAccountRequestSchema,
      request,
    );
    if (!validationResult.success) {
      throw new Error(
        `Validation failed: ${validationResult.errors.join(', ')}`,
      );
    }

    const validatedRequest = validationResult.data;

    // Hash password (in a real implementation, use a proper hashing library)
    const passwordHash = this.hashPassword(validatedRequest.password);

    // Create user account and trading account in a transaction
    const result = await db.transaction(async (tx) => {
      // Create user account
      const [userAccountResult] = await tx
        .insert(userAccounts)
        .values({
          username: validatedRequest.username,
          email: validatedRequest.email,
          passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create trading account (as account funds record)
      const [accountFundResult] = await tx
        .insert(accountFunds)
        .values({
          accountId: userAccountResult.id,
          amount: validatedRequest.initialDeposit,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create initial deposit transaction if needed
      if (validatedRequest.initialDeposit > 0) {
        await tx.insert(transactions).values({
          accountId: userAccountResult.id,
          type: 'deposit',
          symbol: '',
          quantity: validatedRequest.initialDeposit,
          price: 1,
          totalAmount: validatedRequest.initialDeposit,
          timestamp: new Date(),
        });
      }

      return {
        userAccount: {
          id: userAccountResult.id.toString(),
          username: userAccountResult.username,
          email: userAccountResult.email,
          passwordHash: userAccountResult.passwordHash,
          createdAt: userAccountResult.createdAt,
          updatedAt: userAccountResult.updatedAt,
          isActive: true,
        },
        tradingAccount: {
          id: accountFundResult.id.toString(),
          userId: userAccountResult.id.toString(),
          balance: accountFundResult.amount,
          currency: accountFundResult.currency,
          leverage: validatedRequest.leverage,
          market: validatedRequest.market,
          createdAt: accountFundResult.createdAt,
          updatedAt: accountFundResult.updatedAt,
          isActive: true,
        },
      };
    });

    logger.info(
      `Account created successfully for user ${validatedRequest.username}`,
    );

    return result;
  }

  /**
   * Get user account by ID
   * @param userId User ID
   * @returns User account
   */
  async getUserAccount(userId: string): Promise<UserAccountType | null> {
    const userAccount = await db.query.userAccounts.findFirst({
      where: eq(userAccounts.id, parseInt(userId)),
    });

    if (!userAccount) {
      return null;
    }

    return {
      id: userAccount.id.toString(),
      username: userAccount.username,
      email: userAccount.email,
      passwordHash: userAccount.passwordHash,
      createdAt: userAccount.createdAt,
      updatedAt: userAccount.updatedAt,
      isActive: true,
    };
  }

  /**
   * Get trading account by ID
   * @param accountId Account ID
   * @returns Trading account
   */
  async getTradingAccount(
    accountId: string,
  ): Promise<TradingAccountType | null> {
    const accountFund = await db.query.accountFunds.findFirst({
      where: eq(accountFunds.id, parseInt(accountId)),
    });

    if (!accountFund) {
      return null;
    }

    // Get user account for additional info
    const userAccount = await db.query.userAccounts.findFirst({
      where: eq(userAccounts.id, accountFund.accountId),
    });

    return {
      id: accountFund.id.toString(),
      userId: accountFund.accountId.toString(),
      balance: accountFund.amount,
      currency: accountFund.currency,
      leverage: 1, // This would need to be stored separately or derived
      market: 'USD', // This would need to be stored separately or derived
      createdAt: accountFund.createdAt,
      updatedAt: accountFund.updatedAt,
      isActive: true,
    };
  }

  /**
   * Update trading account settings
   * @param accountId Account ID
   * @param request Update request data
   * @returns Updated trading account
   */
  async updateTradingAccount(
    accountId: string,
    request: UpdateAccountRequestType,
  ): Promise<TradingAccountType | null> {
    // Validate request
    const validationResult = validateWithFormat(
      UpdateAccountRequestSchema,
      request,
    );
    if (!validationResult.success) {
      throw new Error(
        `Validation failed: ${validationResult.errors.join(', ')}`,
      );
    }

    const validatedRequest = validationResult.data;

    // Get existing account
    const account = await this.getTradingAccount(accountId);
    if (!account) {
      return null;
    }

    // Update account funds record
    const [updatedAccountFund] = await db
      .update(accountFunds)
      .set({
        amount:
          validatedRequest.balance !== undefined
            ? validatedRequest.balance
            : account.balance,
        currency: validatedRequest.currency || account.currency,
        updatedAt: new Date(),
      })
      .where(eq(accountFunds.id, parseInt(accountId)))
      .returning();

    logger.info(`Trading account ${accountId} updated successfully`);

    return {
      ...account,
      balance: updatedAccountFund.amount,
      currency: updatedAccountFund.currency,
      updatedAt: updatedAccountFund.updatedAt,
    };
  }

  /**
   * Get account balance
   * @param accountId Account ID
   * @returns Account balance
   */
  async getAccountBalance(accountId: string): Promise<number | null> {
    const accountFund = await db.query.accountFunds.findFirst({
      where: eq(accountFunds.id, parseInt(accountId)),
    });

    return accountFund ? accountFund.amount : null;
  }

  /**
   * Get transaction history
   * @param accountId Account ID
   * @param limit Number of transactions to return (default: 50)
   * @param offset Number of transactions to skip (default: 0)
   * @returns Transaction history
   */
  async getTransactionHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: TransactionRecordType[]; totalCount: number }> {
    const [totalCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.accountId, parseInt(accountId)));

    const transactionRecords = await db.query.transactions.findMany({
      where: eq(transactions.accountId, parseInt(accountId)),
      orderBy: [desc(transactions.timestamp)],
      limit,
      offset,
    });

    const transactionsResult = transactionRecords.map((record) => ({
      id: record.id.toString(),
      accountId: record.accountId.toString(),
      type: record.type as 'buy' | 'sell' | 'deposit',
      amount: record.totalAmount,
      balanceAfter: 0, // This would need to be calculated
      description: `${record.type} ${record.symbol}`,
      createdAt: record.timestamp,
    }));

    return {
      transactions: transactionsResult,
      totalCount: totalCountResult?.count || 0,
    };
  }

  /**
   * Hash password (simplified - use proper library in production)
   * @param password Plain text password
   * @returns Hashed password
   */
  private hashPassword(password: string): string {
    // In a real implementation, use bcrypt or similar
    return `hashed_${password}`;
  }
}

const accountService = new AccountService();
export default accountService;
```

### 2. 更新 API 路由

API 路由不需要更改，因为它们通过 accountService 访问数据。

### 3. 数据迁移

要将现有数据迁移到数据库中，需要编写一个迁移脚本：

```typescript
// scripts/migrate-data.ts
import fs from 'fs-extra';
import path from 'path';
import { getProjectDir } from '@/server/base/env';
import { db } from '@/lib/db';
import { userAccounts, accountFunds, transactions } from '@/drizzle/schema';

async function migrateData() {
  const dataDir = path.join(getProjectDir(), 'data', 'accounts');

  // Migrate user accounts
  const usersDir = path.join(dataDir, 'users');
  if (fs.existsSync(usersDir)) {
    const userFiles = fs.readdirSync(usersDir);
    for (const file of userFiles) {
      if (file.endsWith('.json')) {
        const userData = await fs.readJson(path.join(usersDir, file));
        await db.insert(userAccounts).values({
          username: userData.username,
          email: userData.email,
          passwordHash: userData.passwordHash,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt),
        });
      }
    }
  }

  // Migrate trading accounts
  const tradingDir = path.join(dataDir, 'trading');
  if (fs.existsSync(tradingDir)) {
    const tradingFiles = fs.readdirSync(tradingDir);
    for (const file of tradingFiles) {
      if (file.endsWith('.json')) {
        const tradingData = await fs.readJson(path.join(tradingDir, file));
        await db.insert(accountFunds).values({
          accountId: parseInt(tradingData.userId),
          amount: tradingData.balance,
          currency: tradingData.currency,
          createdAt: new Date(tradingData.createdAt),
          updatedAt: new Date(tradingData.updatedAt),
        });
      }
    }
  }

  console.log('Data migration completed');
}

migrateData().catch(console.error);
```

## 注意事项

1. 迁移过程中需要确保数据一致性
2. 在生产环境中执行迁移前，请务必备份现有数据
3. 可以逐步迁移，先实现新功能使用数据库，再迁移现有功能
4. 需要处理数据类型转换和验证
5. 考虑添加适当的索引以提高查询性能
