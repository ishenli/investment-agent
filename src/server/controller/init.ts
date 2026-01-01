import logger from '../base/logger';
import accountService from '../service/accountService';
import finnhubService from '../service/finnhubService';
import positionService from '../service/positionService';
import { BaseBizController } from './base';

export class InitController extends BaseBizController {
  async init() {
    try {

      // 获取所有账户
      const accounts = await accountService.getAllAccounts();

      // 遍历每个账户
      for (const account of accounts) {
        try {
          // 获取当前账户的持仓
          const positions = await positionService.getCurrentPositions(account.id);

          // 美股的处理
          const usPosition = positions
            .map((position) => ({
              symbol: position.symbol,
              market: position.market || 'US',
            }))
            .filter((position) => position.market === 'US');

          // 更新每个持仓的标的价格
          for (const position of usPosition) {
            // 根据持仓的市场类型调用不同的API
            const market = position.market || 'US';
            try {
              await finnhubService.getPrice(position.symbol, market);
            } catch (error) {
              logger.error(`获取资产实时价格时发生错误: ${position.symbol}`, error);
            }
          }

          // 港股的处理
          const hkPosition = positions
            .map((position) => ({
              symbol: position.symbol,
              market: position.market || 'HK',
            }))
            .filter((position) => position.market === 'HK');
          // // 使用 priceService 批量更新资产价格

          if (hkPosition.length > 0) {
            finnhubService.batchQuoteByTencent(hkPosition);
          }
        } catch (error) {
          logger.error(`获取账户 ${account.id} 的持仓信息时发生错误`, error);
        }
      }

      return this.success({
        message: '资产实时价格更新完成',
      });
    } catch (error) {
      logger.error('[InitController] 初始化更新资产价格失败:', error);
      return this.error('初始化更新资产价格失败', 'init_error');
    }
  }
}
