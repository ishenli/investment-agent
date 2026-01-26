import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import type { PriceSourceAdapter } from './PriceSourceAdapter';

/**
 * 适配器路由器
 *
 * 负责管理多个适配器实例，根据市场类型路由到对应的适配器。
 */
export class AdapterRouter {
  private adapters = new Map<MarketType, PriceSourceAdapter>();

  /**
   * 注册适配器
   *
   * @param adapter 适配器实例
   */
  register(adapter: PriceSourceAdapter): void {
    for (const market of adapter.supportedMarkets) {
      this.adapters.set(market, adapter);
    }
    logger.debug(
      `[AdapterRouter] Registered adapter for markets: ${adapter.supportedMarkets.join(', ')}`,
    );
  }

  /**
   * 根据市场类型获取适配器
   *
   * @param market 市场类型
   * @returns 适配器实例，如果不存在则返回 undefined
   */
  getAdapter(market: MarketType): PriceSourceAdapter | undefined {
    const adapter = this.adapters.get(market);
    if (!adapter) {
      logger.warn(`[AdapterRouter] No adapter found for market ${market}`);
    }
    return adapter;
  }

  /**
   * 获取所有已注册的市场类型
   *
   * @returns 市场类型数组
   */
  getSupportedMarkets(): MarketType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 检查是否支持指定市场
   *
   * @param market 市场类型
   * @returns 是否支持
   */
  supports(market: MarketType): boolean {
    return this.adapters.has(market);
  }
}