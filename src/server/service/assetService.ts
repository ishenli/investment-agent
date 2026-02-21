import {
  SnapshotRevenuePeriod,
  SnapshotRevenueMetrics,
  SnapshotRevenueHistory,
  RevenueHistoryPoint,
  PositionPerformance,
} from '@typings/account';
import portfolioSnapshotService, {
  PositionSnapshot,
} from './portfolioSnapshotService';
import { db } from '@server/lib/db';
import { accountFunds } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
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
   * Get revenue history from portfolio snapshots
   * Provides accurate historical performance timeline using snapshot data
   * @param accountId Account ID
   * @param period Time period (1W, 1M, 3M, 6M, YTD, 1Y, ALL)
   * @returns Snapshot-based revenue history with time series data
   */
  async getRevenueHistoryFromSnapshots(
    accountId: string,
    period: SnapshotRevenuePeriod = '1M',
  ): Promise<SnapshotRevenueHistory> {
    try {
      const periodEnd = new Date();
      let periodStart = this.getPeriodStartDate(period);

      // For ALL period, use account creation date
      if (period === 'ALL') {
        const account = await accountService.getTradingAccount(accountId);
        if (account) {
          periodStart = account.createdAt;
        }
      }

      // Get all snapshots within the period
      let snapshots = await portfolioSnapshotService.getSnapshotsByDateRange(
        parseInt(accountId),
        periodStart,
        periodEnd,
      );

      // If no snapshots found in the period, try to get all available snapshots
      // This handles cases where snapshot data doesn't extend back far enough
      if (snapshots.length === 0) {
        const allSnapshots = await portfolioSnapshotService.getAllSnapshots(parseInt(accountId));
        if (allSnapshots.length > 0) {
          snapshots = allSnapshots.sort(
            (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
          );
          // Update periodStart to reflect actual data range
          periodStart = snapshots[0].snapshotDate;
          logger.info(
            `[AssetService] No snapshots found in period, using all ${snapshots.length} available snapshots for account ${accountId}`
          );
        }
      }

      // If still no snapshots, return empty result
      if (snapshots.length === 0) {
        return {
          accountId,
          period,
          periodStart,
          periodEnd,
          data: [],
          derivedMetrics: {
            annualizedReturn: 0,
            maxDrawdown: 0,
            volatility: 0,
            sharpeRatio: 0,
            totalReturn: 0,
          },
          createdAt: new Date(),
        };
      }

      // Build history data points
      const data: RevenueHistoryPoint[] = [];
      const startValue = snapshots[0].totalValueCents / 100;
      const totalValues: number[] = [];

      for (const snapshot of snapshots) {
        const totalValue = snapshot.totalValueCents / 100;
        totalValues.push(totalValue);

        // Calculate cumulative profit rate from first snapshot
        const profitRate =
          startValue > 0
            ? new Decimal(totalValue).minus(startValue).div(startValue).mul(100).toDecimalPlaces(2).toNumber()
            : 0;

        data.push({
          date: snapshot.snapshotDate,
          totalValue,
          profitRate,
        });
      }

      // Calculate daily returns for volatility
      const dailyReturns: number[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const prevValue = snapshots[i - 1].totalValueCents / 100;
        const currValue = snapshots[i].totalValueCents / 100;
        if (prevValue > 0) {
          dailyReturns.push(new Decimal(currValue).minus(prevValue).div(prevValue).toNumber());
        }
      }

      // Calculate derived metrics
      const daysInvested = Math.floor(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );

      const totalReturn = data.length > 0 ? data[data.length - 1].profitRate : 0;
      const annualizedReturn = calculateAnnualizedReturn(totalReturn / 100, daysInvested);
      const maxDrawdown = calculateMaxDrawdown(totalValues);
      const volatility = calculateVolatility(dailyReturns, daysInvested);
      const sharpeRatio = calculateSharpeRatio(annualizedReturn, volatility);

      return {
        accountId,
        period,
        periodStart,
        periodEnd,
        data,
        derivedMetrics: {
          annualizedReturn: annualizedReturn * 100, // Convert to percentage
          maxDrawdown,
          volatility,
          sharpeRatio,
          totalReturn,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(
        `[AssetService] Failed to get revenue history for account ${accountId}: ${error}`,
      );
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * Calculate period start date based on snapshot revenue period
   * @param period Snapshot revenue period
   * @returns Period start date
   */
  private getPeriodStartDate(period: SnapshotRevenuePeriod): Date {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3M':
        startDate.setDate(now.getDate() - 90);
        break;
      case '6M':
        startDate.setDate(now.getDate() - 180);
        break;
      case 'YTD':
        startDate.setMonth(0, 1); // January 1st of current year
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        // Will be updated with account creation date later
        startDate.setFullYear(now.getFullYear() - 10); // Default fallback
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return startDate;
  }

  /**
   * Get revenue metrics from portfolio snapshots
   * Provides accurate historical performance using snapshot data
   * @param accountId Account ID
   * @param period Time period (1W, 1M, 3M, 6M, YTD, 1Y, ALL)
   * @returns Snapshot-based revenue metrics
   */
  async getRevenueMetricsFromSnapshots(
    accountId: string,
    period: SnapshotRevenuePeriod = '1M',
  ): Promise<SnapshotRevenueMetrics | null> {
    try {
      const periodEnd = new Date();
      let periodStart = this.getPeriodStartDate(period);

      // For ALL period, use account creation date
      if (period === 'ALL') {
        const account = await accountService.getTradingAccount(accountId);
        if (account) {
          periodStart = account.createdAt;
        }
      }

      // Get current (latest) snapshot
      const currentSnapshot = await portfolioSnapshotService.getLatestSnapshot(
        parseInt(accountId),
      );

      if (!currentSnapshot) {
        logger.warn(`No snapshot found for account ${accountId}`);
        return null;
      }

      // Get comparison snapshot (nearest to period start)
      let comparisonSnapshot = await portfolioSnapshotService.getNearestSnapshot(
        parseInt(accountId),
        periodStart,
      );

      // If no snapshot found before period start, use the earliest available snapshot
      // This handles cases where snapshot data doesn't extend back far enough
      if (!comparisonSnapshot) {
        const allSnapshots = await portfolioSnapshotService.getAllSnapshots(parseInt(accountId));
        if (allSnapshots.length > 0) {
          // Get the earliest snapshot (array is sorted by date descending, so take the last one)
          const sortedSnapshots = [...allSnapshots].sort(
            (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
          );
          comparisonSnapshot = sortedSnapshots[0];
          logger.info(
            `[AssetService] No snapshot found before ${periodStart.toISOString().split('T')[0]}, using earliest available snapshot from ${comparisonSnapshot.snapshotDate.toISOString().split('T')[0]} for account ${accountId}`
          );
        }
      }

      if (!comparisonSnapshot) {
        logger.warn(`No comparison snapshot found for account ${accountId}`);
        return null;
      }

      // Calculate days held
      const daysHeld = Math.floor(
        (currentSnapshot.snapshotDate.getTime() - comparisonSnapshot.snapshotDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Convert cents to dollars
      const currentTotalValue = currentSnapshot.totalValueCents / 100;
      const currentCashBalance = currentSnapshot.cashBalanceCents / 100;
      const currentPositionsValue = currentSnapshot.positions.totalPositionsValueCents / 100;

      const comparisonTotalValue = comparisonSnapshot.totalValueCents / 100;

      // Calculate performance metrics
      const profitAmount = new Decimal(currentTotalValue).minus(comparisonTotalValue).toNumber();
      const profitRate =
        comparisonTotalValue > 0
          ? new Decimal(profitAmount).div(comparisonTotalValue).mul(100).toDecimalPlaces(2).toNumber()
          : 0;

      // Calculate benchmark performance
      const currentBenchmark = (currentSnapshot.benchmarkValueCents ?? 0) / 100;
      const comparisonBenchmark = (comparisonSnapshot.benchmarkValueCents ?? 0) / 100;
      const benchmarkProfitRate =
        comparisonBenchmark > 0
          ? new Decimal(currentBenchmark)
              .minus(comparisonBenchmark)
              .div(comparisonBenchmark)
              .mul(100)
              .toDecimalPlaces(2)
              .toNumber()
          : 0;

      // Excess return
      const excessReturn = new Decimal(profitRate).minus(benchmarkProfitRate).toDecimalPlaces(2).toNumber();

      // Annualized return
      const annualizedReturn =
        daysHeld > 0
          ? new Decimal(profitRate)
              .mul(365)
              .div(daysHeld)
              .toDecimalPlaces(2)
              .toNumber()
          : 0;

      // Calculate position-level performance
      const positionsPerformance = this.calculatePositionsPerformance(
        comparisonSnapshot.positions.positions,
        currentSnapshot.positions.positions,
        profitAmount,
        currentTotalValue,
      );

      return {
        accountId,
        period,
        periodStart: comparisonSnapshot.snapshotDate,
        periodEnd: currentSnapshot.snapshotDate,
        daysHeld,
        currentSnapshot: {
          date: currentSnapshot.snapshotDate,
          totalValue: currentTotalValue,
          cashBalance: currentCashBalance,
          positionsValue: currentPositionsValue,
        },
        comparisonSnapshot: {
          date: comparisonSnapshot.snapshotDate,
          totalValue: comparisonTotalValue,
        },
        performance: {
          profitAmount,
          profitRate,
          benchmarkProfitRate,
          excessReturn,
          annualizedReturn,
        },
        positions: positionsPerformance,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(
        `[AssetService] Failed to get snapshot revenue metrics for account ${accountId}: ${error}`,
      );
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * Calculate position-level performance
   * @param startPositions Positions at period start
   * @param endPositions Positions at period end
   * @param totalProfitAmount Total profit amount
   * @param currentTotalValue Current total portfolio value
   * @returns Array of position performance data
   */
  private calculatePositionsPerformance(
    startPositions: PositionSnapshot[],
    endPositions: PositionSnapshot[],
    totalProfitAmount: number,
    currentTotalValue: number,
  ): PositionPerformance[] {
    const startPositionMap = new Map<string, PositionSnapshot>();
    for (const pos of startPositions) {
      startPositionMap.set(pos.symbol, pos);
    }

    const result: PositionPerformance[] = [];

    for (const endPos of endPositions) {
      const startPos = startPositionMap.get(endPos.symbol);
      const startValue = startPos ? startPos.marketValueCents / 100 : 0;
      const endValue = endPos.marketValueCents / 100;

      const posProfitAmount = new Decimal(endValue).minus(startValue).toNumber();
      const posProfitRate =
        startValue > 0
          ? new Decimal(posProfitAmount).div(startValue).mul(100).toDecimalPlaces(2).toNumber()
          : endValue > 0
            ? 100 // New position, considered 100% gain
            : 0;

      const contribution =
        totalProfitAmount !== 0
          ? new Decimal(posProfitAmount).div(totalProfitAmount).mul(100).toDecimalPlaces(2).toNumber()
          : 0;

      const currentWeight =
        currentTotalValue > 0
          ? new Decimal(endValue).div(currentTotalValue).mul(100).toDecimalPlaces(2).toNumber()
          : 0;

      result.push({
        symbol: endPos.symbol,
        quantity: endPos.quantity,
        startValue,
        endValue,
        profitAmount: posProfitAmount,
        profitRate: posProfitRate,
        contribution,
        currentWeight,
      });
    }

    // Sort by contribution descending
    return result.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }
}

const assetService = new AssetService();

export default assetService;