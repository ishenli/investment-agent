import logger from '../base/logger';
import accountService from '../service/accountService';
import { unifiedPriceService } from '../service/unifiedPriceService';
import { BaseBizController } from './base';

/**
 * 更新统计信息（兼容现有格式）
 */
interface UpdateStats {
  total: number;
  succeeded: number;
  failed: FailedInfo[];
  byMarket: {
    US: MarketStats;
    HK: MarketStats;
    CN: MarketStats;
  };
  completeTime: string;
}

/**
 * 失败信息
 */
interface FailedInfo {
  symbol: string;
  market: 'US' | 'HK' | 'CN';
  error: string;
}

/**
 * 市场统计信息
 */
interface MarketStats {
  attempted: number;
  succeeded: number;
  failed: FailedInfo[];
}

export class InitController extends BaseBizController {
  async init() {
    try {
      // 获取所有账户
      const accounts = await accountService.getAllAccounts();

      // 统计信息聚合
      const aggregatedStats: UpdateStats = {
        total: 0,
        succeeded: 0,
        failed: [],
        byMarket: {
          US: { attempted: 0, succeeded: 0, failed: [] },
          HK: { attempted: 0, succeeded: 0, failed: [] },
          CN: { attempted: 0, succeeded: 0, failed: [] },
        },
        completeTime: new Date().toISOString(),
      };

      // 使用 UnifiedPriceService 更新每个账户的价格
      for (const account of accounts) {
        try {
          const accountStats = await unifiedPriceService.updateAccountPrices(account.id);

          // 聚合统计信息
          aggregatedStats.total += accountStats.total;
          aggregatedStats.succeeded += accountStats.succeeded;
          aggregatedStats.failed.push(...accountStats.failed);

          // 聚合各市场统计
          aggregatedStats.byMarket.US.attempted += accountStats.byMarket.US.attempted;
          aggregatedStats.byMarket.US.succeeded += accountStats.byMarket.US.succeeded;
          aggregatedStats.byMarket.US.failed.push(...accountStats.byMarket.US.failed);

          aggregatedStats.byMarket.HK.attempted += accountStats.byMarket.HK.attempted;
          aggregatedStats.byMarket.HK.succeeded += accountStats.byMarket.HK.succeeded;
          aggregatedStats.byMarket.HK.failed.push(...accountStats.byMarket.HK.failed);

          aggregatedStats.byMarket.CN.attempted += accountStats.byMarket.CN.attempted;
          aggregatedStats.byMarket.CN.succeeded += accountStats.byMarket.CN.succeeded;
          aggregatedStats.byMarket.CN.failed.push(...accountStats.byMarket.CN.failed);
        } catch (error) {
          logger.error(`[InitController] Failed to update prices for account ${account.id}:`, error);
        }
      }

      aggregatedStats.completeTime = new Date().toISOString();

      logger.info(
        `[InitController] Price update completed: ${aggregatedStats.succeeded}/${aggregatedStats.total} succeeded`,
      );

      return this.success({
        message: '资产实时价格更新完成',
        stats: aggregatedStats,
        updatedCount: aggregatedStats.succeeded,
        failedCount: aggregatedStats.failed.length,
      });
    } catch (error) {
      logger.error('[InitController] 初始化更新资产价格失败:', error);
      return this.error('初始化更新资产价格失败', 'init_error');
    }
  }
}