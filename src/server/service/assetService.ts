import { revenueMetricType } from '@/types';
import { db } from '@server/lib/db';
import { accountFunds, transactions } from '@/drizzle/schema';
import { eq, and, sql, or, asc } from 'drizzle-orm';
import logger from '@server/base/logger';
import accountService from './accountService';
import positionService from './positionService';
import Decimal from 'decimal.js';
import { AssetSummaryType } from '@typings/asset';

export class AssetService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 获取账户余额
   * @param accountId 账户ID
   * @returns 账户余额和货币类型
   */
  async getAccountBalance(
    accountId: string,
  ): Promise<{ balance: number; currency: string } | null> {
    try {
      const accountFund = await db.query.accountFunds.findFirst({
        where: eq(accountFunds.id, parseInt(accountId)),
      });

      return accountFund
        ? { balance: accountFund.amountCents / 100, currency: accountFund.currency }
        : null;
    } catch (error) {
      logger.error(`Failed to get account balance for account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * 获取收益指标
   * @param accountId 账户ID
   * @param period 时间周期字符串 (7d, 30d, 90d, 1y, all) - 用于筛选交易记录的时间范围
   * @returns 收益指标
   */
  async getRevenueMetrics(
    accountId: string,
    period: string = '30d',
  ): Promise<revenueMetricType | null> {
    try {
      // 计算周期日期用于筛选交易记录
      const now = new Date();
      let periodStart = new Date();

      switch (period) {
        case '7d':
          periodStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          periodStart.setDate(now.getDate() - 30);
          break;
        case '90d':
          periodStart.setDate(now.getDate() - 90);
          break;
        case '1y':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          // 对于全部时间，使用账户创建日期
          const account = await accountService.getTradingAccount(accountId);
          if (account) {
            periodStart = account.createdAt;
          } else {
            periodStart.setDate(now.getDate() - 365); // 如果未找到账户，默认为1年
          }
          break;
        default:
          periodStart.setDate(now.getDate() - 30); // 默认为30天
      }

      const periodEnd = now;

      // 计算收益指标和交易统计数据
      const {
        realizedProfitAmount,
        realizedProfitRate,
        unrealizedProfitAmount,
        unrealizedProfitRate,
        totalTrades,
        profitableTrades,
      } = await this.calculateTotalReturnAndTradeStats(accountId, periodStart, periodEnd);

      // 计算胜率
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

      return {
        accountId,
        periodStart,
        periodEnd,
        realizedProfitAmount,
        realizedProfitRate,
        unrealizedProfitAmount,
        unrealizedProfitRate,
        winRate,
        totalTrades,
        profitableTrades,
        createdAt: new Date(),
      };
    } catch (error) {
      // 查询异常时记录详细错误信息，但仍返回 null
      logger.error(`Failed to get revenue metrics for account ${accountId}: ${error}`);
      // 可以考虑抛出特定的异常来区分查询异常和数据不存在的情况
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * 根据交易记录计算已实现和未实现收益，以及交易统计数据
   * @param accountId 账户ID
   * @param periodStart 周期开始日期
   * @param periodEnd 周期结束日期
   * @returns 包含已实现和未实现的收益金额和收益率，以及交易统计数据
   */
  private async calculateTotalReturnAndTradeStats(
    accountId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    realizedProfitAmount: number; // 已实现收益金额
    realizedProfitRate: number; // 已实现收益率(%)
    unrealizedProfitAmount: number; // 未实现收益金额
    unrealizedProfitRate: number; // 未实现收益率(%)
    totalTrades: number; // 总交易数
    profitableTrades: number; // 盈利交易数
  }> {
    // 获取指定时间段内的所有买卖交易记录
    const transactionRecords = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, parseInt(accountId)),
        or(eq(transactions.type, 'buy'), eq(transactions.type, 'sell')),
        sql`created_at >= ${periodStart.toISOString()} AND created_at <= ${periodEnd.toISOString()}`,
      ),
      orderBy: [asc(transactions.createdAt)],
    });

    logger.info(
      `[AssetService#calculateTotalReturnAndTradeStats] Found ${transactionRecords.length} transactions for account ${accountId} between ${periodStart.toISOString()} and ${periodEnd.toISOString()}`,
    );

    if (transactionRecords.length === 0) {
      return {
        realizedProfitAmount: 0,
        realizedProfitRate: 0,
        unrealizedProfitAmount: 0,
        unrealizedProfitRate: 0,
        totalTrades: 0,
        profitableTrades: 0,
      }; // 没有交易记录，返回0收益和0交易统计
    }

    // 按股票代码分组处理交易（用于收益计算）
    const stockTransactionsForReturns: Record<
      string,
      {
        buys: { quantity: number; totalCost: number }[];
        sells: { quantity: number; totalRevenue: number }[];
        totalBuyQuantity: number;
        totalBuyCost: number;
        totalSellQuantity: number;
        totalSellRevenue: number;
      }
    > = {};

    // 按股票代码分组处理交易（用于交易统计）
    const stockTransactionsForStats: Record<
      string,
      {
        buys: { quantity: number; totalCost: number; price: number }[];
        sells: { quantity: number; totalRevenue: number; price: number }[];
      }
    > = {};

    // 初始化交易记录
    for (const transaction of transactionRecords) {
      const symbol = transaction.symbol || '';
      if (!symbol) continue;

      // 用于收益计算的分组
      if (!stockTransactionsForReturns[symbol]) {
        stockTransactionsForReturns[symbol] = {
          buys: [],
          sells: [],
          totalBuyQuantity: 0,
          totalBuyCost: 0,
          totalSellQuantity: 0,
          totalSellRevenue: 0,
        };
      }

      const amount = (transaction.totalAmountCents ?? 0) / 100;
      const quantity = transaction.quantity || 0;

      if (transaction.type === 'buy') {
        stockTransactionsForReturns[symbol].buys.push({
          quantity,
          totalCost: amount,
        });
        stockTransactionsForReturns[symbol].totalBuyQuantity += quantity;
        stockTransactionsForReturns[symbol].totalBuyCost += amount;
      } else if (transaction.type === 'sell') {
        stockTransactionsForReturns[symbol].sells.push({
          quantity,
          totalRevenue: amount,
        });
        stockTransactionsForReturns[symbol].totalSellQuantity += quantity;
        stockTransactionsForReturns[symbol].totalSellRevenue += amount;
      }

      // 用于交易统计的分组
      if (!stockTransactionsForStats[symbol]) {
        stockTransactionsForStats[symbol] = {
          buys: [],
          sells: [],
        };
      }

      const price = quantity > 0 ? amount / quantity : 0;

      if (transaction.type === 'buy') {
        stockTransactionsForStats[symbol].buys.push({
          quantity,
          totalCost: amount,
          price,
        });
      } else if (transaction.type === 'sell') {
        stockTransactionsForStats[symbol].sells.push({
          quantity,
          totalRevenue: amount,
          price,
        });
      }
    }

    // 计算总投资成本和总收益
    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalRealizedGain = 0;
    let totalUnrealizedGainLoss = 0;
    let totalCurrentMarketValue = 0;
    let totalCostBasis = 0;

    // 获取当前持仓信息，用于计算未实现盈亏
    const currentPositions = await positionService.getCurrentPositions(accountId);

    // 创建持仓映射，方便查找
    const positionsMap = new Map();
    for (const position of currentPositions) {
      positionsMap.set(position.symbol, position);
    }

    for (const symbol in stockTransactionsForReturns) {
      const stock = stockTransactionsForReturns[symbol];

      // 使用 Decimal.js 计算平均买入价，避免精度问题
      const avgBuyPrice =
        stock.totalBuyQuantity > 0
          ? new Decimal(stock.totalBuyCost).div(stock.totalBuyQuantity).toDecimalPlaces(4)
          : new Decimal(0);

      // 使用 Decimal.js 计算已实现收益（卖出收入 - 卖出股票的成本）
      const costOfSoldShares = new Decimal(stock.totalSellQuantity).mul(avgBuyPrice);
      const realizedGain = new Decimal(stock.totalSellRevenue).sub(costOfSoldShares);

      totalInvestment = new Decimal(totalInvestment).add(stock.totalBuyCost).toNumber();
      totalRevenue = new Decimal(totalRevenue).add(stock.totalSellRevenue).toNumber();
      totalRealizedGain = new Decimal(totalRealizedGain).add(realizedGain).toNumber();

      // 计算未实现盈亏（浮动盈亏）
      const remainingShares = new Decimal(stock.totalBuyQuantity).sub(stock.totalSellQuantity);
      if (remainingShares.gt(0)) {
        // 获取当前股价
        const position = positionsMap.get(symbol);
        if (position) {
          // 获取最新价格
          let currentPrice = position.currentPrice; // 使用当前价格
          if (!currentPrice) {
            currentPrice = position.averageCost; // 如果没有当前价格，使用平均成本价
          }

          // 使用 Decimal.js 计算未实现盈亏
          const costBasis = remainingShares.mul(avgBuyPrice);
          const currentValue = remainingShares.mul(currentPrice);
          const unrealizedGain = currentValue.sub(costBasis);
          totalUnrealizedGainLoss = new Decimal(totalUnrealizedGainLoss)
            .add(unrealizedGain)
            .toNumber();

          // 累计当前市值和成本基础用于计算整体未实现盈亏率
          totalCurrentMarketValue = new Decimal(totalCurrentMarketValue)
            .add(currentValue)
            .toNumber();
          totalCostBasis = new Decimal(totalCostBasis).add(costBasis).toNumber();
        }
      }
    }

    // 计算交易统计数据
    let totalTrades = 0;
    let profitableTrades = 0;

    for (const symbol in stockTransactionsForStats) {
      const stock = stockTransactionsForStats[symbol];

      // 计算交易对数（买入和卖出的最小对数）
      const buyCount = stock.buys.length;
      const sellCount = stock.sells.length;
      const tradePairs = Math.min(buyCount, sellCount);

      totalTrades += tradePairs;

      // 计算盈利交易数
      // 使用 Decimal.js 精确计算平均买入价和平均卖出价
      if (tradePairs > 0) {
        const totalBuyCost = stock.buys.reduce(
          (sum, buy) => new Decimal(sum).add(buy.totalCost).toNumber(),
          0,
        );
        const totalBuyQuantity = stock.buys.reduce(
          (sum, buy) => new Decimal(sum).add(buy.quantity).toNumber(),
          0,
        );
        const avgBuyPrice =
          totalBuyQuantity > 0
            ? new Decimal(totalBuyCost).div(totalBuyQuantity).toDecimalPlaces(4)
            : new Decimal(0);

        const totalSellRevenue = stock.sells.reduce(
          (sum, sell) => new Decimal(sum).add(sell.totalRevenue).toNumber(),
          0,
        );
        const totalSellQuantity = stock.sells.reduce(
          (sum, sell) => new Decimal(sum).add(sell.quantity).toNumber(),
          0,
        );
        const avgSellPrice =
          totalSellQuantity > 0
            ? new Decimal(totalSellRevenue).div(totalSellQuantity).toDecimalPlaces(4)
            : new Decimal(0);

        // 如果平均卖出价高于平均买入价，则认为是盈利交易
        if (avgSellPrice.gt(avgBuyPrice)) {
          profitableTrades += tradePairs;
        }
      }
    }

    // 如果没有投资，返回0
    if (totalInvestment === 0) {
      return {
        realizedProfitAmount: 0,
        realizedProfitRate: 0,
        unrealizedProfitAmount: 0,
        unrealizedProfitRate: 0,
        totalTrades,
        profitableTrades,
      };
    }

    // 使用 Decimal.js 确保计算精度
    const realizedProfitAmount = totalRealizedGain;
    const realizedProfitRate = new Decimal(realizedProfitAmount).div(totalInvestment).toNumber();

    const unrealizedProfitAmount = totalUnrealizedGainLoss;
    const unrealizedProfitRate = new Decimal(unrealizedProfitAmount)
      .div(totalInvestment)
      .toNumber();

    logger.info(
      `[AssetService#calculateTotalReturnAndTradeStats] unrealizedProfitAmount=${unrealizedProfitAmount}, totalInvestment=${totalInvestment}, totalUnrealizedGainLoss=${totalUnrealizedGainLoss}`,
    );
    return {
      realizedProfitAmount,
      realizedProfitRate,
      unrealizedProfitAmount,
      unrealizedProfitRate,
      totalTrades,
      profitableTrades,
    };
  }
  /**
   * 获取资产概要信息
   * @param accountId 账户ID
   * @returns 资产概要信息
   */
  async getAssetSummary(accountId: string): Promise<AssetSummaryType> {
    try {
      // 获取账户信息
      const account = await accountService.getTradingAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const { stockAccountValue, totalInvestment } =
        await positionService.getPositionAmountSummary(accountId);

      // 现金余额
      const cashBalance = account.balance;

      // 总资产
      const totalBalance = new Decimal(cashBalance).add(stockAccountValue).toNumber();

      // 使用 Decimal.js 计算资产配置比例，避免精度问题
      const stockAllocationPercent =
        totalBalance > 0
          ? new Decimal(stockAccountValue).div(totalBalance).mul(100).toDecimalPlaces(2).toNumber()
          : 0;
      const cashAllocationPercent =
        totalBalance > 0
          ? new Decimal(cashBalance).div(totalBalance).mul(100).toDecimalPlaces(2).toNumber()
          : 0;

      // 计算股票收益（货币金额）：当前股票市值 - 总投资成本
      const stockGain = new Decimal(stockAccountValue)
        .minus(new Decimal(totalInvestment))
        .toNumber();

      // 计算股票收益率：(股票市值 - 总投资) / 总投资
      const stockReturnRate =
        totalInvestment > 0
          ? new Decimal(stockAccountValue)
              .minus(new Decimal(totalInvestment))
              .div(totalInvestment)
              .mul(100)
              .toDecimalPlaces(2)
              .toNumber()
          : 0;

      // 计算总收益率：(总资产 - 总投资) / 总投资
      const totalReturnRate =
        totalInvestment > 0
          ? new Decimal(totalBalance)
              .minus(new Decimal(totalInvestment))
              .div(totalInvestment)
              .mul(100)
              .toDecimalPlaces(2)
              .toNumber()
          : 0;

      return {
        stockAccountValue,
        cashBalance,
        totalBalance,
        totalInvestment,
        stockAllocationPercent,
        cashAllocationPercent,
        stockGain,
        stockReturnRate,
        totalReturnRate,
      };
    } catch (error) {
      logger.error(`[AssetService] Failed to get asset summary for account ${accountId}: ${error}`);
      throw new Error(`[AssetService] Failed to get asset summary: ${error}`);
    }
  }
}

const assetService = new AssetService();

export default assetService;
