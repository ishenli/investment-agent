/**
 * 优化的港股数据获取工具
 * 集成缓存策略，减少API调用，提高响应速度
 */

import type { Logger } from '@server/base/logger';
import { StockDataCache, getCache } from './cacheManager';
import { finnhubClient } from './finnhubUtil';
import finnhubService from '@server/service/finnhubService';

/**
 * 优化的港股数据提供器
 */
class OptimizedHKDataProvider {
  private cache: StockDataCache;
  private last_api_call: number = 0;
  private min_api_interval: number = 1.0; // 最小API调用间隔（秒）
  logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.cache = getCache(logger);
    this.logger = logger;
    this.logger.info('[OptimizedHKDataProvider] 港股数据提供器初始化完成');
  }

  private async wait_for_rate_limit(): Promise<void> {
    const current_time = Date.now() / 1000;
    const time_since_last_call = current_time - this.last_api_call;

    if (time_since_last_call < this.min_api_interval) {
      const wait_time = this.min_api_interval - time_since_last_call;
      await new Promise((resolve) => setTimeout(resolve, wait_time * 1000));
    }

    this.last_api_call = Date.now() / 1000;
  }

  /**
   * 获取港股数据 - 优先使用缓存
   */
  public async getStockData(
    symbol: string,
    start_date: string,
    end_date: string,
    force_refresh: boolean = false,
  ): Promise<string> {
    // 检查缓存
    if (!force_refresh) {
      let cache_key = this.cache.findCachedStockData({
        symbol: symbol,
        start_date: start_date,
        end_date: end_date,
        data_source: 'tencent_finnhub', // Using a distinct source identifier
      });

      if (cache_key) {
        const cached_data = this.cache.loadStockData(cache_key);
        if (cached_data) {
          return cached_data;
        }
      }
    }

    // 缓存未命中，从API获取
    let formatted_data: string | null = null;
    let data_source: string | null = null;

    try {
      this.logger.info(`[OptimizedHKDataProvider]从API获取数据: ${symbol}`);
      await this.wait_for_rate_limit();

      formatted_data = await this.getDataFromSource(symbol, start_date, end_date);
      if (formatted_data && !formatted_data.includes('❌')) {
        data_source = 'tencent_finnhub';
      } else {
        formatted_data = null;
      }
    } catch (e) {
      formatted_data = null;
    }

    // 如果失败，生成备用数据
    if (!formatted_data) {
      const error_msg = '港股数据源不可用';
      return this._generate_fallback_data(symbol, start_date, end_date, error_msg);
    }

    // 保存到缓存
    this.cache.saveStockData({
      symbol: symbol,
      data: formatted_data,
      start_date: start_date,
      end_date: end_date,
      data_source: data_source,
    });

    return formatted_data;
  }

  async finnhubPromisify(method: string, params: string): Promise<object> {
    return new Promise((resolve, reject) => {
      finnhubClient[method](params, (error: unknown, data: object) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * 从数据源获取数据 (Tencent for quote, Finnhub for profile/candles)
   */
  private async getDataFromSource(
    symbol: string,
    start_date: string,
    end_date: string,
  ): Promise<string | null> {
    try {
      await this.wait_for_rate_limit();

      // Determine if we need historical candles or just current quote
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Fetch Company Profile via Finnhub
      let company_name = symbol.toUpperCase();
      let currency = 'HKD';
      let exchange = 'HK';

      try {
        const profile = (await this.finnhubPromisify('companyProfile2', symbol)) as {
          name: string;
          currency: string;
          exchange: string;
        };
        if (profile) {
          company_name = profile.name || company_name;
          currency = profile.currency || currency;
          exchange = profile.exchange || exchange;
        }
      } catch (e) {
        // If profile fails, use defaults
      }

      let marketDataSection = '';

      if (diffDays > 1) {
        // Historical Data Mode (Candles)
        const fromTimestamp = Math.floor(start.getTime() / 1000);
        const toTimestamp = Math.floor(end.getTime() / 1000) + 86400;

        const candles = await finnhubService.getCandles(symbol, 'D', fromTimestamp, toTimestamp);

        if (candles && candles.c && candles.c.length > 0) {
          const count = candles.c.length;
          const firstClose = candles.c[0];
          const lastClose = candles.c[count - 1];
          const high = Math.max(...candles.h);
          const low = Math.min(...candles.l);
          const change = lastClose - firstClose;
          const changePercent = (change / firstClose) * 100;

          marketDataSection = `
// ## 📉 历史行情
// - 周期: ${count} 个交易日
// - 起始价格: ${firstClose.toFixed(2)} ${currency}
// - 结束价格: ${lastClose.toFixed(2)} ${currency}
// - 期间最高: ${high.toFixed(2)} ${currency}
// - 期间最低: ${low.toFixed(2)} ${currency}
// - 期间涨跌: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)
`;
        } else {
          marketDataSection = `// ## 📉 历史行情\n// - 暂无该时间段的历史数据`;
        }
      } else {
        // Real-time/Snapshot Mode - Use Tencent via finnhubService for better HK support
        const hkData = await finnhubService.batchQuoteByTencent([{ symbol: symbol }]);

        if (hkData && hkData.length > 0) {
          const quote = hkData[0];
          // Note: batchQuoteByTencent returns price in USD currently via makeHKDToUSD inside it?
          // Checking finnhubService.batchQuoteByTencent implementation:
          // It calls makeHKDToUSD(data.price). So the price is in USD.
          // We should display it as USD for consistency or handle currency carefully.
          // The prompt implies "HKD" but the service converts.
          // Let's stick to what the service returns (USD) but label it clearly,
          // OR if we want HKD we might need to change the service.
          // Given existing code uses the converted price, we'll display as USD.

          marketDataSection = `
// ## 📊 实时行情
// - 当前价格: ${quote.price.toFixed(2)} USD (已转汇率)
// - 注意: 此为实时快照
`;
        } else {
          marketDataSection = `// ## 📊 实时行情\n// - 暂无实时行情数据`;
        }
      }

      const formatted_data = `# ${symbol.toUpperCase()} 港股市场数据分析

      // - 公司名称: ${company_name}
      // - 交易所: ${exchange}
      // - 原币种: ${currency}
      // - 数据更新时间: ${new Date().toLocaleString('zh-CN')}
      
      ${marketDataSection}

      // ## 📈 数据概览
      // - 数据期间: ${start_date} 至 ${end_date}
      // - 数据来源: Tencent/Finnhub
      // `;

      return formatted_data;
    } catch (e) {
      this.logger.error(`[OptimizedHKDataProvider]获取失败: ${e}`);
      return null;
    }
  }

  private _generate_fallback_data(
    symbol: string,
    start_date: string,
    end_date: string,
    error_msg: string,
  ): string {
    return `# ${symbol} 数据获取失败

## ❌ 错误信息
${error_msg}

## ⚠️ 重要提示
无法获取港股数据。建议稍后重试。

生成时间: ${new Date().toLocaleString('zh-CN')}
`;
  }
}

// 全局实例
let _hk_data_provider: OptimizedHKDataProvider | null = null;

function getOptimizedHkDataProvider(options: { logger: Logger }): OptimizedHKDataProvider {
  if (_hk_data_provider === null) {
    _hk_data_provider = new OptimizedHKDataProvider({
      logger: options.logger,
    });
  }
  return _hk_data_provider;
}

// 统一对外接口
async function getHkStockDataCached(
  symbol: string,
  start_date: string,
  end_date: string,
  force_refresh: boolean = false,
  logger: Logger,
): Promise<string> {
  const provider = getOptimizedHkDataProvider({
    logger: logger,
  });
  return provider.getStockData(symbol, start_date, end_date, force_refresh);
}

export { OptimizedHKDataProvider, getOptimizedHkDataProvider, getHkStockDataCached };
