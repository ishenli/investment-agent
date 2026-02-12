import {
  UserAccountType,
  TradingAccountType,
  CreateAccountRequestType,
  UpdateAccountRequestType,
} from '@/types';
import { db } from '@server/lib/db';
import { users, accounts, accountFunds, transactions, userSelectedAccounts } from '@/drizzle/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import logger from '@server/base/logger';
import { validateWithFormat } from '@/shared';
import {
  AccountType,
  CreateAccountRequestSchema,
  CreateTradingAccountDoSchema,
  CreateTradingAccountDoType,
  UpdateAccountRequestSchema,
} from '@typings/account';
import authService, { AuthService } from './authService';

export class AccountService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * Get trading account by ID
   * @param accountId Account ID
   * @returns Trading account
   */
  async getTradingAccount(accountId: string, userId?: string): Promise<TradingAccountType | null> {
    try {
      if (!userId) {
        userId = await authService.getDefaultUserId();
      };
      // First, get the account row
      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, parseInt(accountId)), eq(accounts.userId, parseInt(userId))),
      });

      if (!account) return null;

      // Get latest account funds for this account
      const accountFund = await db.query.accountFunds.findFirst({
        where: eq(accountFunds.accountId, account.id),
      });

      // Get user for display name
      const userAccount = await db.query.users.findFirst({
        where: eq(users.id, account.userId),
      });

      return {
        id: account.id.toString(),
        userId: account.userId.toString(),
        accountName: account.accountName || `${userAccount?.username || '用户'}的账户`,
        balance: accountFund ? accountFund.amountCents / 100 : 0,
        currency: accountFund ? accountFund.currency : account.currency,
        leverage: account.leverage,
        market: account.market,
        riskMode: account.riskMode || 'retail',
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to read trading account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * Update trading account settings
   * @param accountId Account ID
   * @param request Update request data
   * @returns Updated trading account
   */
  async updateTradingAccount(
    accountId: string,
    userId: string,
    request: UpdateAccountRequestType,
  ): Promise<TradingAccountType | null> {
    // Validate request
    const validationResult = validateWithFormat(UpdateAccountRequestSchema, request);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const validatedRequest = validationResult.data;

    try {
      // Get existing account
      const account = await this.getTradingAccount(accountId, userId);
      if (!account) {
        return null;
      }

      // Update accounts row if request contains editable fields
      await db
        .update(accounts)
        .set({
          market: validatedRequest.market,
          leverage: validatedRequest.leverage ?? undefined,
          riskMode: validatedRequest.riskMode ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, parseInt(accountId)));

      // Update account funds record's updatedAt and read back
      const [updatedAccountFund] = await db
        .update(accountFunds)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(accountFunds.accountId, parseInt(accountId)))
        .returning();

      logger.info(`Trading account ${accountId} updated successfully`);

      return {
        ...account,
        balance: updatedAccountFund.amountCents / 100,
        currency: updatedAccountFund.currency,
        updatedAt: updatedAccountFund.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to update trading account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * Create a new trading account
   * @param request Create account request data
   * @returns Created trading account
   */
  async createTradingAccount(request: CreateTradingAccountDoType): Promise<TradingAccountType> {
    // Validate request
    const validationResult = validateWithFormat(CreateTradingAccountDoSchema, request);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const validatedRequest = validationResult.data;

    // Check if user exists
    const userAccount = await db.query.users.findFirst({
      where: eq(users.id, parseInt(validatedRequest.userId)),
    });

    if (!userAccount) {
      throw new Error('User not found');
    }

    // Create a new account row
    const [newAccount] = await db
      .insert(accounts)
      .values({
        userId: parseInt(validatedRequest.userId),
        accountName: validatedRequest.accountName,
        market: validatedRequest.market,
        currency:
          validatedRequest.market === 'US'
            ? 'USD'
            : validatedRequest.market === 'CN'
              ? 'CNY'
              : 'HKD',
        leverage: validatedRequest.leverage,
        riskMode: 'retail',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create account funds record (store cents)
    const amountCents = Math.round((validatedRequest.initialDeposit || 0) * 100);
    const [accountFundResult] = await db
      .insert(accountFunds)
      .values({
        accountId: newAccount.id,
        amountCents,
        currency: newAccount.currency,
        leverage: newAccount.leverage,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create initial deposit transaction (in cents)
    if (amountCents > 0) {
      await db.insert(transactions).values({
        accountId: newAccount.id,
        type: 'deposit',
        symbol: '',
        quantity: 0,
        priceCents: 0,
        totalAmountCents: amountCents,
        feeCents: 0,
        createdAt: new Date(),
      });
    }

    logger.info(`Trading account created successfully for user ${validatedRequest.userId}`);

    return {
      id: newAccount.id.toString(),
      userId: validatedRequest.userId,
      accountName:
        newAccount.accountName || `${userAccount.username}的${validatedRequest.market}账户`,
      balance: accountFundResult.amountCents / 100,
      currency: accountFundResult.currency,
      leverage: newAccount.leverage,
      market: newAccount.market,
      riskMode: newAccount.riskMode || 'retail',
      createdAt: newAccount.createdAt,
      updatedAt: newAccount.updatedAt,
    };
  }

  /**
   * Get paginated list of trading accounts
   * @param userId User ID
   * @param limit number of items
   * @param offset offset
   */
  async getAllTradingAccounts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: TradingAccountType[]; totalCount: number }> {
    try {
      const userIdNum = parseInt(userId);

      // 并行查询：统计总数 + 获取分页数据
      const [[totalCountResult], accountRows, currentUser] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(accounts)
          .where(eq(accounts.userId, userIdNum)),
        db.query.accounts.findMany({
          where: eq(accounts.userId, userIdNum),
          orderBy: [desc(accounts.createdAt)],
          limit,
          offset,
        }),
        db.query.users.findFirst({ where: eq(users.id, userIdNum) }),
      ]);

      // 并行获取所有账户的资金信息
      const funds = await Promise.all(
        accountRows.map((acc) =>
          db.query.accountFunds.findFirst({
            where: eq(accountFunds.accountId, acc.id),
          }),
        ),
      );

      const items: TradingAccountType[] = accountRows.map((acc, index) => {
        const fund = funds[index];
        return {
          id: acc.id.toString(),
          userId: acc.userId.toString(),
          accountName: acc.accountName || `${currentUser?.username || '用户'}的账户`,
          balance: fund ? fund.amountCents / 100 : 0,
          currency: fund ? fund.currency : acc.currency,
          leverage: acc.leverage,
          market: acc.market,
          riskMode: acc.riskMode || 'retail',
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt,
          isActive: true,
        };
      });

      return { items, totalCount: totalCountResult?.count || 0 };
    } catch (error) {
      logger.error(`Failed to list accounts: ${error}`);
      return { items: [], totalCount: 0 };
    }
  }

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
    const validationResult = validateWithFormat(CreateAccountRequestSchema, request);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const validatedRequest = validationResult.data;

    // Hash password (in a real implementation, use a proper hashing library)
    const passwordHash = this.hashPassword(validatedRequest.password);

    // Create user, account and funds in a transaction
    const result = await db.transaction(async (tx) => {
      const [userAccountResult] = await tx
        .insert(users)
        .values({
          username: validatedRequest.username,
          email: validatedRequest.email,
          passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // create accounts row
      const [accountResult] = await tx
        .insert(accounts)
        .values({
          userId: userAccountResult.id,
          accountName: undefined,
          market: validatedRequest.market,
          currency: validatedRequest.market === 'CN' ? 'CNY' : 'USD',
          leverage: validatedRequest.leverage ?? 1,
          riskMode: 'retail',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // create account funds
      const amountCents = Math.round((validatedRequest.initialDeposit || 0) * 100);
      const [accountFundResult] = await tx
        .insert(accountFunds)
        .values({
          accountId: accountResult.id,
          amountCents,
          currency: accountResult.currency,
          leverage: accountResult.leverage,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // initial deposit transaction
      if (amountCents > 0) {
        await tx.insert(transactions).values({
          accountId: accountResult.id,
          type: 'deposit',
          symbol: '',
          quantity: 0,
          priceCents: 0,
          totalAmountCents: amountCents,
          feeCents: 0,
          createdAt: new Date(),
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
          id: accountResult.id.toString(),
          userId: userAccountResult.id.toString(),
          balance: accountFundResult.amountCents / 100,
          currency: accountFundResult.currency,
          leverage: accountFundResult.leverage,
          market: accountResult.market,
          riskMode: accountResult.riskMode || 'retail',
          createdAt: accountFundResult.createdAt,
          updatedAt: accountFundResult.updatedAt,
          isActive: true,
        },
      };
    });

    logger.info(`Account created successfully for user ${validatedRequest.username}`);

    return result;
  }

  /**
   * Get user account by ID
   * @param userId User ID
   * @returns User account
   */
  async getUserAccount(userId: string): Promise<UserAccountType | null> {
    try {
      const userAccount = await db.query.users.findFirst({
        where: eq(users.id, parseInt(userId)),
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
    } catch (error) {
      logger.error(`Failed to read user account ${userId}: ${error}`);
      return null;
    }
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

  /**
   * 获取所有用户账户
   * @returns 所有用户账户
   */
  async getAllAccounts(): Promise<{ id: string }[]> {
    try {
      const allAccounts = await db.query.accounts.findMany();
      return allAccounts.map((account) => ({
        id: account.id.toString(),
      }));
    } catch (error) {
      logger.error(`Failed to get all accounts: ${error}`);
      return [];
    }
  }

  /**
   * Update account cash balance
   * @param accountId Account ID
   * @param newBalance New cash balance
   * @returns Updated trading account
   */
  async updateAccountBalance(
    accountId: string,
    userId: string,
    newBalance: number,
  ): Promise<TradingAccountType | null> {
    try {
      // Get existing account
      const account = await this.getTradingAccount(accountId, userId);
      if (!account) {
        return null;
      }

      // Calculate the difference between new and old balance
      const oldBalance = account.balance;
      const balanceDifference = newBalance - oldBalance;

      // Convert to cents for database storage
      const newAmountCents = Math.round(newBalance * 100);

      // Update account funds record with new balance
      const [updatedAccountFund] = await db
        .update(accountFunds)
        .set({
          amountCents: newAmountCents,
          updatedAt: new Date(),
        })
        .where(eq(accountFunds.accountId, parseInt(accountId)))
        .returning();

      // If there's a balance difference, create a transaction record
      if (balanceDifference !== 0) {
        const transactionType = balanceDifference > 0 ? 'deposit' : 'withdrawal';
        const amountCents = Math.round(Math.abs(balanceDifference) * 100);

        await db.insert(transactions).values({
          accountId: parseInt(accountId),
          type: transactionType,
          symbol: '',
          quantity: 0,
          priceCents: 0,
          totalAmountCents: amountCents,
          feeCents: 0,
          description: `现金余额调整: ${oldBalance.toFixed(2)} -> ${newBalance.toFixed(2)}`,
          createdAt: new Date(),
        });
      }

      logger.info(
        `Account balance updated for account ${accountId}: ${oldBalance} -> ${newBalance}`,
      );

      return {
        ...account,
        balance: updatedAccountFund.amountCents / 100,
        currency: updatedAccountFund.currency,
        updatedAt: updatedAccountFund.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to update account balance for account ${accountId}: ${error}`);
      return null;
    }
  }


    /**
     * 获取用户选择的账户
     * @param userId 用户ID
     * @returns 用户选择的账户ID或null
     */
    async getUserSelectedAccount(userId: string): Promise<AccountType | null> {
      try {
        const selectedAccountId = await db.query.userSelectedAccounts.findFirst({
          where: eq(userSelectedAccounts.userId, parseInt(userId)),
          orderBy: (userSelectedAccounts, { desc }) => [desc(userSelectedAccounts.updatedAt)],
        });
  
        if (!selectedAccountId) {
          return null;
        }
  
        const selectedAccount = await db.query.accounts.findFirst({
          where: eq(accounts.id, selectedAccountId.accountId),
        });
  
        return selectedAccount ? (selectedAccount as unknown as AccountType) : null;
      } catch (error) {
        console.error('Error getting user selected account:', error);
        return null;
      }
    }
  
    /**
     * 设置用户选择的账户
     * @param userId 用户ID
     * @param accountId 账户ID
     */
    async setUserSelectedAccount(userId: string, accountId: string): Promise<void> {
      try {
        // 检查账户是否属于该用户
        const account = await db.query.accounts.findFirst({
          where: and(eq(accounts.id, parseInt(accountId)), eq(accounts.userId, parseInt(userId))),
        });
  
        if (!account) {
          throw new Error('Account does not belong to user');
        }
  
        // 检查是否已存在该用户的选中账户记录
        const existing = await db.query.userSelectedAccounts.findFirst({
          where: eq(userSelectedAccounts.userId, parseInt(userId)),
        });
  
        if (existing) {
          // 更新现有记录
          await db
            .update(userSelectedAccounts)
            .set({
              accountId: parseInt(accountId),
              updatedAt: new Date(),
            })
            .where(eq(userSelectedAccounts.userId, parseInt(userId)));
        } else {
          // 插入新记录
          await db.insert(userSelectedAccounts).values({
            userId: parseInt(userId),
            accountId: parseInt(accountId),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        logger.error('Error setting user selected account:', error);
        throw error;
      }
    }
}

const accountService = new AccountService();

export default accountService;
