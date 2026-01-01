import accountService from '@server/service/accountService';
import type { TradingAccountType } from '@typings/account';
import logger from '@server/base/logger';
import positionService from '@server/service/positionService';
import { PositionType } from '@typings/position';

// 投资组合摘要类型
interface PortfolioSummary {
  totalMarketValue: number;
  totalUnrealizedPnL: number;
  positionCount: number;
  cashBalance: number;
  currency: string;
  totalAssetsValue: number;
  positions: {
    symbol: string;
    quantity: number;
    averageCost: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLRatio: number;
  }[];
}

// 现金资产类型
interface CashAsset {
  type: 'cash';
  amount: number;
  currency: string;
  available: number;
}

/**
 * 用户上下文数据读取器
 * 用于获取用户的持仓信息、账户信息等上下文数据
 */
export class UserContextReader {
  /**
   * 获取用户持仓信息
   * @param accountId 账户ID
   * @returns 用户持仓信息
   */
  static async getUserPositions(accountId: string): Promise<PositionType[]> {
    try {
      const positions = await positionService.getCurrentPositions(accountId);
      logger.info(
        `[UserContextReader] 获取到用户 ${accountId} 的持仓信息，共 ${positions.length} 个`,
      );
      return positions;
    } catch (error) {
      logger.error(`[UserContextReader] 获取用户 ${accountId} 持仓信息失败:`, error);
      return [];
    }
  }

  /**
   * 获取用户账户信息
   * @param accountId 账户ID
   * @returns 用户账户信息
   */
  static async getUserAccount(accountId: string): Promise<TradingAccountType | null> {
    try {
      const account = await accountService.getTradingAccount(accountId);
      logger.info(`[UserContextReader] 获取到用户账户信息: ${accountId}`);
      return account;
    } catch (error) {
      logger.error(`[UserContextReader] 获取用户 ${accountId} 账户信息失败:`, error);
      return null;
    }
  }

  /**
   * 获取用户现金余额
   * @param accountId 账户ID
   * @returns 现金余额信息
   */
  static async getCashBalance(accountId: string): Promise<number> {
    try {
      const account = await accountService.getTradingAccount(accountId);
      return account ? account.balance : 0;
    } catch (error) {
      logger.error(`[UserContextReader] 获取用户 ${accountId} 现金余额失败:`, error);
      return 0;
    }
  }

  /**
   * 获取用户现金资产
   * @param accountId 账户ID
   * @returns 现金资产信息
   */
  static async getCashAsset(accountId: string): Promise<CashAsset> {
    try {
      const account = await accountService.getTradingAccount(accountId);
      const balance = account ? account.balance : 0;

      return {
        type: 'cash',
        amount: balance,
        currency: account?.currency || 'USD',
        available: balance, // 目前假设全部可用，后续可添加冻结资金逻辑
      };
    } catch (error) {
      logger.error(`[UserContextReader] 获取用户 ${accountId} 现金资产失败:`, error);
      return {
        type: 'cash',
        amount: 0,
        currency: 'USD',
        available: 0,
      };
    }
  }

  /**
   * 获取用户投资组合摘要
   * @param accountId 账户ID
   * @returns 投资组合摘要
   */
  static async getPortfolioSummary(accountId: string): Promise<PortfolioSummary> {
    try {
      // 获取持仓信息
      const positions = await this.getUserPositions(accountId);

      // 获取现金余额
      const cashBalance = await this.getCashBalance(accountId);
      const account = await this.getUserAccount(accountId);
      const currency = account?.currency || 'USD';

      // 计算投资组合总市值
      const totalMarketValue = positions.reduce((sum, position) => sum + position.marketValue, 0);

      // 计算未实现盈亏
      const totalUnrealizedPnL = positions.reduce(
        (sum, position) => sum + position.unrealizedPnL,
        0,
      );

      // 计算持仓数量
      const positionCount = positions.length;

      // 计算总资产价值 = 股票市值 + 现金余额
      const totalAssetsValue = totalMarketValue + cashBalance;

      const summary = {
        totalMarketValue,
        totalUnrealizedPnL,
        positionCount,
        cashBalance,
        currency,
        totalAssetsValue,
        positions: positions.map((position) => ({
          symbol: position.symbol,
          quantity: position.quantity,
          averageCost: position.averageCost,
          currentPrice: position.currentPrice,
          marketValue: position.marketValue,
          unrealizedPnL: position.unrealizedPnL,
          unrealizedPnLRatio:
            position.averageCost > 0
              ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
              : 0,
        })),
      };

      logger.info(`[UserContextReader] 生成用户 ${accountId} 投资组合摘要`);
      return summary;
    } catch (error) {
      logger.error(`[UserContextReader] 生成用户 ${accountId} 投资组合摘要失败:`, error);
      return {
        totalMarketValue: 0,
        totalUnrealizedPnL: 0,
        positionCount: 0,
        cashBalance: 0,
        currency: 'USD',
        totalAssetsValue: 0,
        positions: [],
      };
    }
  }
}
