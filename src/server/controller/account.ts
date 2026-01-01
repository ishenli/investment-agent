import { WithRequestContext } from '@server/base/decorators';
import accountService from '@server/service/accountService';
import {
  CreateAccountRequestSchema,
  UpdateAccountRequestSchema,
  TradingAccountSchema,
  CreateTradingAccountRequestSchema,
} from '@typings/account';
import type { CreateTradingAccountRequestType } from '@typings/account';
import logger from '@server/base/logger';
import { z } from 'zod';
import { AuthService } from '@server/service/authService';
import { BaseBizController } from './base';

export class AccountBizController extends BaseBizController {
  @WithRequestContext()
  async createAccount(body: any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 参数验证
      const validationResult = CreateAccountRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      const result = await accountService.createAccount(validatedBody);

      const publicAccountData = {
        id: result.tradingAccount.id,
        username: result.userAccount.username,
        accountName: result.tradingAccount.accountName,
        balance: result.tradingAccount.balance,
        currency: result.tradingAccount.currency,
        leverage: result.tradingAccount.leverage,
        market: result.tradingAccount.market,
        riskMode: result.tradingAccount.riskMode,
        createdAt: result.tradingAccount.createdAt,
        updatedAt: result.tradingAccount.updatedAt,
        isActive: result.tradingAccount.isActive,
      };

      return this.success(publicAccountData);
    } catch (error) {
      logger.error('[AccountBizController] 创建账户失败:', error);
      return this.error('创建账户失败', 'create_account_error');
    }
  }

  @WithRequestContext()
  async getAccount(query: any) {
    try {
      const accountId = query.accountId;
      const limitParam = query.limit;
      const offsetParam = query.offset;
      const limit = limitParam ? parseInt(limitParam) : 50;
      const offset = offsetParam ? parseInt(offsetParam) : 0;

      if (!accountId) {
        // Return paginated list of accounts
        const list = await accountService.getAllTradingAccounts(limit, offset);

        // Map items through schema minimally
        const safeItems = list.items.map((a) => TradingAccountSchema.parse(a));

        return this.success({ items: safeItems, totalCount: list.totalCount });
      }

      const account = await accountService.getTradingAccount(accountId);
      if (!account) {
        return this.error('账户不存在', 'account_not_found');
      }

      // Validate the account data before returning
      const validatedAccount = TradingAccountSchema.parse(account);

      return this.success(validatedAccount);
    } catch (error) {
      logger.error('[AccountBizController] 获取账户信息失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('获取账户信息失败', 'get_account_error');
    }
  }

  @WithRequestContext()
  async updateAccount(request: { accountId?: string } & any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const accountId = request.accountId;

      if (!accountId) {
        return this.error('缺少accountId参数', 'missing_account_id');
      }

      // 2. 参数验证
      const validationResult = UpdateAccountRequestSchema.safeParse(request);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      const updatedAccount = await accountService.updateTradingAccount(accountId, validatedBody);
      if (!updatedAccount) {
        return this.error('账户不存在', 'account_not_found');
      }

      return this.success(updatedAccount);
    } catch (error) {
      logger.error('[AccountBizController] 更新账户失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('更新账户失败', 'update_account_error');
    }
  }

  @WithRequestContext()
  async createTradingAccount(body: CreateTradingAccountRequestType) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 参数验证
      const validationResult = CreateTradingAccountRequestSchema.safeParse({
        ...body,
        userId, // 自动添加当前用户ID
      });
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      const result = await accountService.createTradingAccount({
        ...validatedBody,
        userId,
      });

      // Validate the account data before returning
      const validatedAccount = TradingAccountSchema.parse(result);

      return this.success(validatedAccount);
    } catch (error) {
      logger.error('[AccountBizController] 创建交易账户失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('创建交易账户失败', 'create_trading_account_error');
    }
  }

  @WithRequestContext()
  async getTradingAccount(query: any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取账户ID（从查询参数或默认为当前用户ID）
      const accountId = query.accountId || userId;

      const account = await accountService.getTradingAccount(accountId);
      if (!account) {
        return this.error('账户不存在', 'account_not_found');
      }

      // Validate the account data before returning
      const validatedAccount = TradingAccountSchema.parse(account);

      return this.success(validatedAccount);
    } catch (error) {
      logger.error('[AccountBizController] 获取交易账户信息失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('获取交易账户信息失败', 'get_trading_account_error');
    }
  }

  @WithRequestContext()
  async updateTradingAccount(request: { accountId?: string } & any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取账户ID（从请求参数或默认为当前用户ID）
      const accountId = request.accountId || userId;

      // 3. 参数验证
      const validationResult = UpdateAccountRequestSchema.safeParse(request);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      const updatedAccount = await accountService.updateTradingAccount(accountId, validatedBody);
      if (!updatedAccount) {
        return this.error('账户不存在', 'account_not_found');
      }

      return this.success(updatedAccount);
    } catch (error) {
      logger.error('[AccountBizController] 更新交易账户失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('更新交易账户失败', 'update_trading_account_error');
    }
  }

  @WithRequestContext()
  async getSelectedAccount(query: any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取选中的账户
      const selectedAccount = await AuthService.getUserSelectedAccount(userId);

      // 3. 返回成功响应
      return this.success({ selectedAccount });
    } catch (error) {
      logger.error('[AccountBizController] 获取选中账户失败:', error);
      return this.error('获取选中账户失败', 'get_selected_account_error');
    }
  }

  @WithRequestContext()
  async setSelectedAccount(body: { accountId: string } & any) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取账户ID
      const { accountId } = body;

      if (!accountId) {
        return this.error('账户ID不能为空', 'invalid_request');
      }

      // 3. 验证用户是否有权访问该账户
      const hasAccess = await AuthService.userHasAccessToAccount(userId, accountId);
      if (!hasAccess) {
        return this.error('无权访问该账户', 'access_denied');
      }

      // 4. 设置用户选中的账户
      await AuthService.setUserSelectedAccount(userId, accountId);

      // 5. 返回成功响应
      return this.success({ message: '选中账户设置成功' });
    } catch (error) {
      logger.error('[AccountBizController] 设置选中账户失败:', error);
      return this.error('设置选中账户失败', 'set_selected_account_error');
    }
  }

  @WithRequestContext()
  async getAccountSettings(query: { accountId: string } & any) {
    try {
      // 1. 获取账户ID
      const { accountId } = query;

      if (!accountId) {
        return this.error('缺少accountId参数', 'missing_account_id');
      }

      // 2. 获取账户信息
      const account = await accountService.getTradingAccount(accountId);
      if (!account) {
        return this.error('账户不存在', 'account_not_found');
      }

      // 3. 返回成功响应
      return this.success({ riskMode: account.riskMode });
    } catch (error) {
      return this.error('获取设置失败', 'get_settings_error');
    }
  }

  @WithRequestContext()
  async updateAccountSettings(request: { accountId: string } & any) {
    try {
      // 1. 获取账户ID
      const { accountId } = request;

      if (!accountId) {
        return this.error('缺少accountId参数', 'missing_account_id');
      }

      // 2. 参数验证
      const riskModeSchema = z.object({
        riskMode: z.enum(['retail', 'advanced']),
      });

      const validationResult = riskModeSchema.safeParse(request);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 3. 更新账户的风险模式设置
      const updatedAccount = await accountService.updateTradingAccount(accountId, validatedBody);
      if (!updatedAccount) {
        return this.error('账户不存在', 'account_not_found');
      }

      // 4. 返回成功响应
      return this.success({ riskMode: updatedAccount.riskMode });
    } catch (error) {
      return this.error('更新设置失败', 'update_settings_error');
    }
  }
}