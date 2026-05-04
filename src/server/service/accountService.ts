import {
  UserAccountType,
  TradingAccountType,
  CreateAccountRequestType,
  UpdateAccountRequestType,
} from '@/types';
import { db } from '@server/lib/db';
import { transactions, users, accounts, accountFunds } from '@/drizzle/schema';
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
import { userRepository, type UserEntity } from '@server/repository/userRepository';
import { accountRepository, type AccountEntity, type CreateAccountData, type UpdateAccountData } from '@server/repository/accountRepository';
import { accountFundRepository, type AccountFundEntity, type CreateAccountFundData } from '@server/repository/accountFundRepository';
import { userSelectedAccountRepository } from '@server/repository/userSelectedAccountRepository';
import { accountCombinedRepository, type TradingAccountDetail } from '@server/repository/accountCombinedRepository';

// ============== DTO 转换函数 ==============

/**
 * 将实体转换为交易账户响应 DTO
 */
function toTradingAccountResponse(
  detail: TradingAccountDetail
): TradingAccountType {
  const { account, fund, user } = detail;
  return {
    id: account.id.toString(),
    userId: account.userId.toString(),
    accountName: account.accountName || `${user?.username || '用户'}的账户`,
    balance: fund ? fund.amountCents / 100 : 0,
    currency: fund ? fund.currency : account.currency,
    leverage: account.leverage,
    market: account.market,
    riskMode: account.riskMode || 'retail',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

/**
 * 将实体转换为用户账户响应 DTO
 */
function toUserAccountResponse(user: UserEntity): UserAccountType {
  return {
    id: user.id.toString(),
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: true,
  };
}

export class AccountService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  // ============== 查询操作 ==============

  /**
   * Get trading account by ID
   * @param accountId Account ID
   * @returns Trading account
   */
  async getTradingAccount(accountId: string, userId?: string): Promise<TradingAccountType | null> {
    try {
      if (!userId) {
        userId = await authService.getDefaultUserId();
      }

      const detail = await accountCombinedRepository.findTradingAccountById(
        parseInt(accountId),
        parseInt(userId)
      );

      if (!detail) {
        return null;
      }

      return toTradingAccountResponse(detail);
    } catch (error) {
      logger.error(`Failed to read trading account ${accountId}: ${error}`);
      return null;
    }
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
      const result = await accountCombinedRepository.findTradingAccountsByUserId(
        userIdNum,
        limit,
        offset
      );

      return {
        items: result.items.map(toTradingAccountResponse),
        totalCount: result.totalCount,
      };
    } catch (error) {
      logger.error(`Failed to list accounts: ${error}`);
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * Get user account by ID
   * @param userId User ID
   * @returns User account
   */
  async getUserAccount(userId: string): Promise<UserAccountType | null> {
    try {
      const user = await userRepository.findById(parseInt(userId));

      if (!user) {
        return null;
      }

      return toUserAccountResponse(user);
    } catch (error) {
      logger.error(`Failed to read user account ${userId}: ${error}`);
      return null;
    }
  }

  /**
   * 获取所有用户账户
   * @returns 所有用户账户
   */
  async getAllAccounts(): Promise<{ id: string }[]> {
    try {
      const allAccounts = await accountRepository.findAll();
      return allAccounts.map((account) => ({
        id: account.id.toString(),
      }));
    } catch (error) {
      logger.error(`Failed to get all accounts: ${error}`);
      return [];
    }
  }

  /**
   * 获取用户选择的账户
   * @param userId 用户ID
   * @returns 用户选择的账户ID或null
   */
  async getUserSelectedAccount(userId: string): Promise<AccountType | null> {
    try {
      const selectedAccount = await userSelectedAccountRepository.findByUserId(parseInt(userId));

      if (!selectedAccount) {
        return null;
      }

      const account = await accountRepository.findById(selectedAccount.accountId);
      return account ? (account as unknown as AccountType) : null;
    } catch (error) {
      logger.error(`Failed to get user selected account for user ${userId}: ${error}`);
      return null;
    }
  }

  // ============== 更新操作 ==============

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

      // Update accounts table
      const updateData: UpdateAccountData = {
        market: validatedRequest.market,
        leverage: validatedRequest.leverage ?? undefined,
        riskMode: validatedRequest.riskMode ?? undefined,
      };
      await accountRepository.updateAccount(parseInt(accountId), updateData);

      // Update account funds record's updatedAt
      const fund = await accountFundRepository.findByAccountId(parseInt(accountId));
      if (fund) {
        await accountFundRepository.update(fund.id, {});
      }

      logger.info(`Trading account ${accountId} updated successfully`);

      return this.getTradingAccount(accountId, userId);
    } catch (error) {
      logger.error(`Failed to update trading account ${accountId}: ${error}`);
      return null;
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
      await accountFundRepository.updateBalance(parseInt(accountId), newAmountCents);

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
          updatedAt: new Date(),
        });
      }

      logger.info(
        `Account balance updated for account ${accountId}: ${oldBalance} -> ${newBalance}`,
      );

      return this.getTradingAccount(accountId, userId);
    } catch (error) {
      logger.error(`Failed to update account balance for account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * 设置用户选择的账户
   * @param userId 用户ID
   * @param accountId 账户ID
   */

  /**
   * 删除交易账户（软删除）
   * @param accountId 账户ID
   * @param userId 用户ID
   * @returns 删除是否成功
   */
  /**
   * 删除交易账户（软删除）
   * @param accountId 账户ID
   * @param userId 用户ID
   * @returns 删除是否成功
   */
  async deleteTradingAccount(accountId: string, userId: string): Promise<boolean> {
    try {
      // 验证账户归属
      const hasOwnership = await accountRepository.verifyOwnership(
        parseInt(accountId),
        parseInt(userId)
      );

      if (!hasOwnership) {
        logger.warn(`User ${userId} attempted to delete account ${accountId} without ownership`);
        return false;
      }

      // 执行软删除
      const success = await accountRepository.softDelete(parseInt(accountId));

      if (success) {
        // 清理用户选中的账户（如果删除的是当前选中的账户）
        const selectedAccount = await userSelectedAccountRepository.findByUserId(parseInt(userId));
        if (selectedAccount && selectedAccount.accountId === parseInt(accountId)) {
          await userSelectedAccountRepository.deleteByUserId(parseInt(userId));
          logger.info(`Cleared selected account for user ${userId} after account ${accountId} deletion`);
        }

        logger.info(`Trading account ${accountId} deleted (soft) by user ${userId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Failed to delete trading account ${accountId}: ${error}`);
      return false;
    }
  }

  async setUserSelectedAccount(userId: string, accountId: string): Promise<void> {
    try {
      // 检查账户是否属于该用户
      const hasOwnership = await accountRepository.verifyOwnership(
        parseInt(accountId),
        parseInt(userId)
      );

      if (!hasOwnership) {
        throw new Error('Account does not belong to user');
      }

      // 创建或更新用户选择的账户
      await userSelectedAccountRepository.upsert(parseInt(userId), parseInt(accountId));

      logger.info(`User ${userId} selected account ${accountId}`);
    } catch (error) {
      logger.error(`Failed to set user selected account: ${error}`);
      throw error;
    }
  }

  // ============== 创建操作 ==============

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
    const userAccount = await userRepository.findById(parseInt(validatedRequest.userId));

    if (!userAccount) {
      throw new Error('User not found');
    }

    // Create a new account row
    const accountData: CreateAccountData = {
      userId: parseInt(validatedRequest.userId),
      accountName: validatedRequest.accountName || null,
      market: validatedRequest.market,
      currency:
        validatedRequest.market === 'US'
          ? 'USD'
          : validatedRequest.market === 'CN'
            ? 'CNY'
            : 'HKD',
      leverage: validatedRequest.leverage,
      riskMode: 'retail',
    };
    const newAccount = await accountRepository.createAccount(accountData);

    // Create account funds record (store cents)
    const amountCents = Math.round((validatedRequest.initialDeposit || 0) * 100);
    const accountFundData: CreateAccountFundData = {
      accountId: newAccount.id,
      amountCents,
      currency: newAccount.currency,
      leverage: newAccount.leverage,
    };
    const accountFundResult = await accountFundRepository.createAccountFund(accountFundData);

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
        updatedAt: new Date(),
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
    const result = await (db as any).transaction(async (tx: any) => {
      // Create user
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
          updatedAt: new Date(),
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

  // ============== 私有方法 ==============

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