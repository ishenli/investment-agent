import { revenueMetricType, revenueHistoryType } from '@/types';
import { db } from '@server/lib/db';
import { accountFunds, transactions, assetPositions } from '@/drizzle/schema';
import { eq, and, sql, or, asc } from 'drizzle-orm';
import logger from '@server/base/logger';
import accountService from './accountService';
import positionService from './positionService';
import Decimal from 'decimal.js';
import { AssetSummaryType } from '@typings/asset';
import {
  calculateAnnualizedReturn,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateDrawdownSeries,
} from '@server/lib/utils/financialCalculations';

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

  /**
   * 获取收益历史数据
   * @param accountId 账户ID
   * @param period 时间周期 ('7d', '30d', '90d', '365d', 'all')
   * @param granularity 时间粒度 ('weekly' or 'monthly')
   * @returns 收益历史数据，包含时间序列和衍生指标
   */
  async getRevenueHistoryData(
    accountId: string,
    period: string = '30d',
    granularity: 'weekly' | 'monthly' = 'monthly',
  ): Promise<revenueHistoryType> {
    try {
      // 计算周期日期
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
        case '365d':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          // 对于全部时间，使用账户创建日期
          const account = await accountService.getTradingAccount(accountId);
          if (account) {
            periodStart = account.createdAt;
          } else {
            periodStart.setDate(now.getDate() - 365);
          }
          break;
        default:
          periodStart.setDate(now.getDate() - 30);
      }

      const periodEnd = now;

      // 获取指定时间段内的所有交易记录
      const transactionRecords = await db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, parseInt(accountId)),
          or(eq(transactions.type, 'buy'), eq(transactions.type, 'sell')),
          sql`created_at >= ${periodStart.toISOString()} AND created_at <= ${periodEnd.toISOString()}`,
        ),
        orderBy: [asc(transactions.createdAt)],
      });

      // 计算每日净值
      const dailyNetValuesMap = await this.calculateDailyNetValues(
        accountId,
        periodStart,
        periodEnd,
      );

      // 如果没有交易记录且没有净值数据，返回空结果
      if (transactionRecords.length === 0 && dailyNetValuesMap.size === 0) {
        return {
          accountId,
          period,
          granularity,
          data: [],
          derivedMetrics: {
            annualizedReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            volatility: 0,
          },
          periodStart,
          periodEnd,
          createdAt: new Date(),
        };
      }

      // 根据粒度聚合成周/月数据
      const aggregatedData = this.aggregateNetValuesByGranularity(
        dailyNetValuesMap,
        granularity,
      );

      if (aggregatedData.length === 0) {
        return {
          accountId,
          period,
          granularity,
          data: [],
          derivedMetrics: {
            annualizedReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            volatility: 0,
          },
          periodStart,
          periodEnd,
          createdAt: new Date(),
        };
      }

      // 计算衍生指标
      const netValues = aggregatedData.map((d) => d.netValue).filter((v) => v !== undefined) as number[];
      const returnRates = aggregatedData.map((d) => d.returnRate);
      const drawdowns = calculateDrawdownSeries(netValues);

      // 计算总收益率
      const totalReturn =
        netValues.length >= 2
          ? (netValues[netValues.length - 1] - netValues[0]) / netValues[0]
          : 0;

      // 计算衍生指标
      const daysInvested = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const annualizedReturn = calculateAnnualizedReturn(totalReturn, daysInvested);
      const volatility = calculateVolatility(returnRates, daysInvested);
      const sharpeRatio = calculateSharpeRatio(annualizedReturn, volatility);
      const maxDrawdown = calculateMaxDrawdown(netValues);

      // 构建返回数据
      const data = aggregatedData.map((item, index) => ({
        date: item.date,
        returnRate: item.returnRate,
        drawdown: drawdowns[index] || 0,
        netValue: item.netValue,
      }));

      return {
        accountId,
        period,
        granularity,
        data,
        derivedMetrics: {
          annualizedReturn,
          sharpeRatio,
          maxDrawdown,
          volatility,
        },
        periodStart,
        periodEnd,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to get revenue history for account ${accountId}: ${error}`);
      throw new Error(`Failed to get revenue history: ${error}`);
    }
  }

  /**
   * 计算每日净值
   * @param accountId 账户ID
   * @param periodStart 周期开始日期
   * @param periodEnd 周期结束日期
   * @returns 每日净值映射 (date -> netValue)
   *
   * 实现说明：
   * 由于历史价格数据有限，此方法使用简化算法：
   * 1. 获取当前持仓的总市值（使用当前价格）
   * 2. 计算每日累积的投资/ withdrawals 以追踪资金进出
   * 3. 每日净值 = 现金余额 + （市值 * 累积投资比例）或使用更精确的基于成本的计算
   *
   * 注意：这是一个简化的实现。在生产环境中，应该：
   * - 使用历史股价表 (asset_price_history) 重建每日持仓市值
   * - 或创建账户净值快照表 (account_equity_daily) 来记录历史净值
   */
  private async calculateDailyNetValues(
    accountId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Map<string, number>> {
    const dailyNetValues = new Map<string, number>();

    // 获取账户资金信息
    const accountFund = await db.query.accountFunds.findFirst({
      where: eq(accountFunds.accountId, parseInt(accountId)),
    });

    const initialCash = accountFund ? accountFund.amountCents / 100 : 0;

    // 获取当前持仓信息
    const currentPositions = await positionService.getCurrentPositions(accountId);
    const currentTotalStockValue = currentPositions.reduce(
      (sum: number, pos: any) =>
        new Decimal(sum).plus(pos.marketValue || 0).toNumber(),
      0,
    );

    // 获取期间内的所有交易记录
    const allTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, parseInt(accountId)),
        sql`created_at >= ${periodStart.toISOString()} AND created_at <= ${periodEnd.toISOString()}`,
      ),
      orderBy: [asc(transactions.createdAt)],
    });

    // 计算每日累积的投资/ withdrawals（buy/deposit/withdrawal 都会影响净值）
    // 使用 Map 存储每日的净现金流量
    const dailyCashFlow = new Map<string, number>();

    // 初始化所有日期的现金流为0
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const dateString = currentDate.toISOString().split('T')[0];
      dailyCashFlow.set(dateString, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 累加当日交易产生的现金流
    for (const tx of allTransactions) {
      const txDate = tx.createdAt.toISOString().split('T')[0];
      const amount = (tx.totalAmountCents ?? 0) / 100;

      // buy 是流出（减少可用现金），deposit 是流入（增加现金），sell 是流入
      const flowAmount = tx.type === 'buy' ? -amount : amount;

      if (dailyCashFlow.has(txDate)) {
        dailyCashFlow.set(txDate, (dailyCashFlow.get(txDate) || 0) + flowAmount);
      }
    }

    // 计算期末总净值
    const finalNetValue = initialCash + currentTotalStockValue;

    // 计算期初净值（从期初的可用现金开始，简化处理）
    const startNetValue = initialCash;

    // 按天遍历时间范围，计算每日净值
    // 使用线性插值：净值会从期初到期末平滑变化
    const totalDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    let currentDay = 0;
    const tempDate = new Date(periodStart);

    while (tempDate <= periodEnd) {
      const dateString = tempDate.toISOString().split('T')[0];

      // 计算到当前日期为止的总现金流
      let cumulativeCashFlow = 0;
      const tempDate2 = new Date(periodStart);
      while (tempDate2 <= tempDate) {
        const dString = tempDate2.toISOString().split('T')[0];
        cumulativeCashFlow += dailyCashFlow.get(dString) || 0;
        tempDate2.setDate(tempDate2.getDate() + 1);
      }

      // 计算每日净值：基础净值 + 累积现金流 + 持仓市值变化
      // 这里使用简化的模型：假设仓位没有太大变化，主要现金流影响净值
      const progress = currentDay / Math.max(1, totalDays);
      const baseValue = startNetValue + (finalNetValue - startNetValue) * progress;

      // 加上现金流影响
      let netValue = baseValue + cumulativeCashFlow;

      // 确保净值不为负
      if (netValue < 0) netValue = 0;

      dailyNetValues.set(dateString, netValue);

      tempDate.setDate(tempDate.getDate() + 1);
      currentDay++;
    }

    return dailyNetValues;
  }

  /**
   * 根据粒度聚合成周/月数据
   * @param dailyNetValuesMap 每日净值映射
   * @param granularity 时间粒度 ('weekly' or 'monthly')
   * @returns 聚合后的数据点数组
   */
  private aggregateNetValuesByGranularity(
    dailyNetValuesMap: Map<string, number>,
    granularity: 'weekly' | 'monthly',
  ): Array<{ date: string; returnRate: number; netValue?: number }> {
    const entries = Array.from(dailyNetValuesMap.entries()).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

    if (entries.length === 0) {
      return [];
    }

    const aggregatedData: Array<{ date: string; returnRate: number; netValue?: number }> = [];
    let lastNetValue: number | null = null;

    if (granularity === 'monthly') {
      // 按月聚合
      const monthlyGroups = new Map<string, number[]>();

      for (const [date, netValue] of entries) {
        const monthKey = date.substring(0, 7); // YYYY-MM
        if (!monthlyGroups.has(monthKey)) {
          monthlyGroups.set(monthKey, []);
        }
        monthlyGroups.get(monthKey)!.push(netValue);
      }

      for (const [monthKey, netValues] of monthlyGroups) {
        const monthNetValue = netValues[netValues.length - 1]; // 使用每月最后一天的净值

        let returnRate = 0;
        if (lastNetValue !== null) {
          returnRate = new Decimal(monthNetValue)
            .minus(lastNetValue)
            .div(lastNetValue)
            .toNumber();
        }

        aggregatedData.push({
          date: monthKey,
          returnRate,
          netValue: monthNetValue,
        });

        lastNetValue = monthNetValue;
      }
    } else {
      // 按周聚合
      const weeklyGroups = new Map<number, number[]>();

      for (const [date, netValue] of entries) {
        const dateObj = new Date(date);
        const weekNumber = this.getWeekNumber(dateObj);
        const weekKey = dateObj.getFullYear() * 100 + weekNumber;

        if (!weeklyGroups.has(weekKey)) {
          weeklyGroups.set(weekKey, []);
        }
        weeklyGroups.get(weekKey)!.push(netValue);
      }

      for (const [weekKey, netValues] of weeklyGroups) {
        const year = Math.floor(weekKey / 100);
        const weekNumber = weekKey % 100;
        const weekDate = this.getDateOfWeek(year, weekNumber);
        const dateString = weekDate.toISOString().split('T')[0];
        const weekNetValue = netValues[netValues.length - 1]; // 使用每周最后一天的净值

        let returnRate = 0;
        if (lastNetValue !== null) {
          returnRate = new Decimal(weekNetValue).minus(lastNetValue).div(lastNetValue).toNumber();
        }

        aggregatedData.push({
          date: dateString,
          returnRate,
          netValue: weekNetValue,
        });

        lastNetValue = weekNetValue;
      }
    }

    return aggregatedData;
  }

  /**
   * 获取日期所在的周数（ISO 8601 标准周）
   * @param date 日期对象
   * @returns 周数 (1-53)
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  /**
   * 获取指定年份和周数的日期（ISO 8601 标准）
   * @param year 年份
   * @param week 周数
   * @returns 日期对象（该周的周一）
   */
  private getDateOfWeek(year: number, week: number): Date {
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }
}

const assetService = new AssetService();

export default assetService;
