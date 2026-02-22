import { WithRequestContext } from '@server/base/decorators';
import accountService from '@server/service/accountService';
import assetService from '@server/service/assetService';
import transactionService from '@server/service/transactionService';
import {
  revenueHistoryQuerySchema,
  snapshotRevenueQuerySchema,
} from '@typings/account';
import {
  TransactionRequestSchema,
  PartialTransactionRequestSchema,
  TransactionRecordSchema,
} from '@typings/transaction';
import logger from '@server/base/logger';
import { z } from 'zod';
import authService from '@server/service/authService';
import { BaseBizController } from './base';

export class AssetAccountBizController extends BaseBizController {
  @WithRequestContext()
  async updateAccountBalance(request: { balance: number } & any) {
    try {
      // 1. 获取当前用户ID
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 参数验证
      const balanceSchema = z.object({
        balance: z.number().min(0),
      });

      const validationResult = balanceSchema.safeParse(request);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 2. 获取选中的账户ID
      const account = await accountService.getUserSelectedAccount(userId);
      if (!account) {
        return this.error('账户不存在', 'account_not_found');
      }
      // 3. 更新账户余额
      const updatedAccount = await accountService.updateAccountBalance(
        account.id,
        userId,
        validatedBody.balance,
      );
      if (!updatedAccount) {
        return this.error('账户不存在', 'account_not_found');
      }

      // 4. 返回成功响应
      return this.success(updatedAccount);
    } catch (error) {
      logger.error('[AssetAccountBizController] 更新账户余额失败:', error);
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      return this.error('更新账户余额失败', 'update_balance_error');
    }
  }

  @WithRequestContext()
  async getRevenueMetrics(query: any) {
    try {
      // 1. 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = snapshotRevenueQuerySchema.safeParse({
        period: query.period || '1M',
      });

      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { period } = validationResult.data;

      // 3. 基于快照获取收益指标
      const metrics = await assetService.getRevenueMetricsFromSnapshots(accountInfo.id, period);

      // 4. 返回成功响应
      if (!metrics) {
        // 没有快照数据时返回空指标
        return this.success({
          metrics: {
            accountId: accountInfo.id,
            period,
            periodStart: null,
            periodEnd: new Date(),
            daysHeld: 0,
            currentSnapshot: {
              date: new Date(),
              totalValue: 0,
              cashBalance: 0,
              positionsValue: 0,
            },
            comparisonSnapshot: {
              date: new Date(),
              totalValue: 0,
            },
            performance: {
              profitAmount: 0,
              profitRate: 0,
              benchmarkProfitRate: 0,
              excessReturn: 0,
              annualizedReturn: 0,
            },
            positions: [],
            createdAt: new Date(),
          },
        });
      }

      return this.success({ metrics });
    } catch (error) {
      // 区分不同的错误类型
      if (error instanceof Error && error.message.startsWith('Database query failed:')) {
        logger.error('[AssetAccountBizController] 数据库查询收益指标失败:', error);
        return this.error('系统内部错误', 'database_query_error');
      }

      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetAccountBizController] 获取收益指标失败:', error);
      return this.error('获取收益指标失败', 'get_revenue_error');
    }
  }

  @WithRequestContext()
  async getRevenueHistory(query: any) {
    try {
      // 1. 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 验证查询参数
      const validationResult = revenueHistoryQuerySchema.safeParse({
        period: query.period || '1M',
      });

      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { period } = validationResult.data;

      // 3. 基于快照获取收益历史数据
      const historyData = await assetService.getRevenueHistoryFromSnapshots(
        accountInfo.id,
        period,
      );

      // 4. 返回成功响应
      return this.success(historyData);
    } catch (error) {
      // 区分不同的错误类型
      if (error instanceof Error && error.message.startsWith('Database query failed:')) {
        logger.error('[AssetAccountBizController] 数据库查询收益历史失败:', error);
        return this.error('系统内部错误', 'database_query_error');
      }

      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetAccountBizController] 获取收益历史失败:', error);
      return this.error('获取收益历史数据失败', 'get_revenue_history_error');
    }
  }

  @WithRequestContext()
  async getAssetSummary(query: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取资产概要信息
      const summary = await assetService.getAssetSummary(accountInfo.id);

      // 3. 返回成功响应
      logger.info(
        '[AssetAccountBizController] 获取用户 %s 的资产概要信息: %o',
        accountInfo.id,
        summary,
      );

      return this.success({ summary });
    } catch (error) {
      logger.error('[AssetAccountBizController] 获取资产概要信息失败:', error);
      return this.error('获取资产概要信息失败', 'get_summary_error');
    }
  }

  @WithRequestContext()
  async getTransactionHistory(query: any) {
    try {
      // 1. 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取查询参数
      const limit = parseInt(query.limit || '50');
      const offset = parseInt(query.offset || '0');

      // 3. 获取交易历史
      const result = await transactionService.getTransactionHistory(accountInfo.id, limit, offset);

      // 4. 返回成功响应
      return this.success(result);
    } catch (error) {
      logger.error('[AssetAccountBizController] 获取交易历史失败:', error);
      return this.error('获取交易历史失败', 'get_transactions_error');
    }
  }

  @WithRequestContext()
  async addTransaction(body: any) {
    try {
      // 1. 获取当前用户ID
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 参数验证
      const validationResult = TransactionRequestSchema.safeParse({
        ...body,
        accountId: userId, // 自动添加当前用户ID
      });
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 3. 添加交易记录
      const transactionData = {
        ...validatedBody,
        accountId: userId,
        tradeTime: validatedBody.tradeTime,
        createdAt: new Date(),
      };

      const result = await transactionService.addTransaction(transactionData);

      // 4. 验证返回的数据
      const validatedTransaction = TransactionRecordSchema.parse(result);

      // 5. 返回成功响应
      return this.success(validatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetAccountBizController] 添加交易记录失败:', error);
      return this.error('添加交易记录失败', 'add_transaction_error');
    }
  }

  @WithRequestContext()
  async updateTransaction(request: { id: string } & any) {
    try {
      // 1. 获取当前用户ID
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 获取交易ID
      const transactionId = request.id;
      if (!transactionId) {
        return this.error('交易ID不能为空', 'invalid_transaction_id');
      }

      // 3. 参数验证
      const validationResult = PartialTransactionRequestSchema.safeParse(request);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 4. 更新交易记录
      const result = await transactionService.updateTransaction(transactionId, validatedBody);

      // 5. 验证返回的数据
      const validatedTransaction = TransactionRecordSchema.parse(result);

      // 6. 返回成功响应
      return this.success(validatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AssetAccountBizController] 更新交易记录失败:', error);
      return this.error('更新交易记录失败', 'update_transaction_error');
    }
  }
}
