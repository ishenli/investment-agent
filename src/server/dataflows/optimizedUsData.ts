/**
 * 优化的美股数据获取工具
 * 集成缓存策略，减少API调用，提高响应速度
 */

import type { Logger } from '@server/base/logger';
import { StockDataCache, getCache } from './cacheManager';
import { finnhubClient } from './finnhubUtil';

/**
 * 优化的美股数据提供器
 */
class OptimizedUSDataProvider {
  private cache: StockDataCache;
  private last_api_call: number = 0;
  private min_api_interval: number = 1.0; // 最小API调用间隔（秒）
  logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.cache = getCache(logger);
    this.logger = logger;
    this.logger.info('[OptimizedUSDataProvider] 美股数据提供器初始化完成');
  }

  private async wait_for_rate_limit(): Promise<void> {
    const current_time = Date.now() / 1000;
    const time_since_last_call = current_time - this.last_api_call;

    if (time_since_last_call < this.min_api_interval) {
      const wait_time = this.min_api_interval - time_since_last_call;
      // this.logger.info(`⏳ API限制等待 ${wait_time.toFixed(1)}s...`);
      // In a real implementation, you would use setTimeout or similar
      // For now, we'll just simulate the delay
      await new Promise((resolve) => setTimeout(resolve, wait_time * 1000));
    }

    this.last_api_call = Date.now() / 1000;
  }

  /**
   * 获取美股数据 - 优先使用缓存
   * @param symbol
   * @param start_date
   * @param end_date
   * @param force_refresh
   * @returns
   */
  public async getStockData(
    symbol: string,
    start_date: string,
    end_date: string,
    force_refresh: boolean = false,
  ): Promise<string> {
    // this.logger.info(`📈 获取美股数据: ${symbol} (${start_date} 到 ${end_date})`);

    // 检查缓存（除非强制刷新）
    if (!force_refresh) {
      // 优先查找FINNHUB缓存
      let cache_key = this.cache.findCachedStockData({
        symbol: symbol,
        start_date: start_date,
        end_date: end_date,
        data_source: 'finnhub',
      });

      if (cache_key) {
        const cached_data = this.cache.loadStockData(cache_key);
        if (cached_data) {
          // this.logger.info(`⚡ 从缓存加载美股数据: ${symbol}`);
          return cached_data;
        }
      }
    }

    // 缓存未命中，从API获取 - 优先使用FINNHUB
    let formatted_data: string | null = null;
    let data_source: string | null = null;

    // 尝试FINNHUB API（优先）
    try {
      this.logger.info(`[OptimizedUSDataProvider]从FINNHUB API获取数据: ${symbol}`);
      await this.wait_for_rate_limit();

      formatted_data = await this.getDataFromFinnhub(symbol, start_date, end_date);
      if (formatted_data && !formatted_data.includes('❌')) {
        data_source = 'finnhub';
        // this.logger.info(`✅ FINNHUB数据获取成功: ${symbol}`);
      } else {
        // this.logger.error(`⚠️ FINNHUB数据获取失败，尝试备用方案`);
        formatted_data = null;
      }
    } catch (e) {
      // this.logger.error(`❌ FINNHUB API调用失败: ${e}`);
      formatted_data = null;
    }

    // 如果所有API都失败，生成备用数据
    if (!formatted_data) {
      const error_msg = '所有美股数据源都不可用';
      // this.logger.error(`❌ ${error_msg}`);
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
   * 从FINNHUB API获取数据
   * @param symbol
   * @param start_date
   * @param end_date
   * @returns
   */
  /**
   * Fetch stock data from Finnhub.
   * If start_date and end_date provided and span multiple days, try to fetch candles.
   * Otherwise fetch current quote.
   */
  private async getDataFromFinnhub(
    symbol: string,
    start_date: string,
    end_date: string,
  ): Promise<string | null> {
    try {
      // API Key check
      const api_key = process.env.FINNHUB_API_KEY;
      if (!api_key) {
        return null;
      }

      await this.wait_for_rate_limit();

      // Determine if we need historical candles or just current quote
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Fetch Company Profile
      const profile = (await this.finnhubPromisify('companyProfile2', symbol)) as {
        name: string;
        currency: string;
        ticker: string;
        exchange: string;
      };
      const company_name = profile?.name || symbol.toUpperCase();
      const currency = profile?.currency || 'USD';

      let marketDataSection = '';

      if (diffDays > 1) {
        // Historical Data Mode (Candles)
        const fromTimestamp = Math.floor(start.getTime() / 1000);
        // Add 1 day to end timestamp to include the end date fully
        const toTimestamp = Math.floor(end.getTime() / 1000) + 86400;

        // imports are circular if we import finnhubService here directly if not careful, 
        // but finnhubUtil exports finnhubClient which we use. 
        // actually finnhubService IS where we added getCandles. 
        // Let's use finnhubService instance.
        const { default: finnhubService } = await import('@server/service/finnhubService');
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
        // Real-time/Snapshot Mode
        const quote = (await this.finnhubPromisify('quote', symbol)) as {
          c: number;
          d: number;
          dp: number;
          o: number;
          h: number;
          l: number;
          pc: number;
          t: number;
        };

        if (quote && quote.c) {
          marketDataSection = `
// ## 📊 实时行情
// - 当前价格: ${quote.c.toFixed(2)} ${currency}
// - 涨跌额: ${quote.d >= 0 ? '+' : ''}${quote.d.toFixed(2)}
// - 涨跌幅: ${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}%
// - 开盘价: ${quote.o.toFixed(2)}
// - 最高价: ${quote.h.toFixed(2)}
// - 最低价: ${quote.l.toFixed(2)}
// - 前收盘: ${quote.pc.toFixed(2)}
`;
        } else {
          marketDataSection = `// ## 📊 实时行情\n// - 暂无实时行情数据`;
        }
      }

      const formatted_data = `# ${symbol.toUpperCase()} 市场数据分析

      // - 公司名称: ${company_name}
      // - 交易所: ${profile?.exchange || 'N/A'}
      // - 货币: ${currency}
      // - 数据更新时间: ${new Date().toLocaleString('zh-CN')}
      
      ${marketDataSection}

      // ## 📈 数据概览
      // - 数据期间: ${start_date} 至 ${end_date}
      // - 数据来源: FINNHUB API
      // `;

      return formatted_data;
    } catch (e) {
      this.logger.error(`[OptimizedUSDataProvider]FINNHUB数据获取失败: ${e}`);
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
由于API限制或网络问题，无法获取数据。
建议稍后重试或检查网络连接。

生成时间: ${new Date().toLocaleString('zh-CN')}
`;
  }
}

// 全局实例
let _us_data_provider: OptimizedUSDataProvider | null = null;

function getOptimizedUsDataProvider(options: { logger: Logger }): OptimizedUSDataProvider {
  if (_us_data_provider === null) {
    _us_data_provider = new OptimizedUSDataProvider({
      logger: options.logger,
    });
  }
  return _us_data_provider;
}

async function getUsStockDataCached(
  symbol: string,
  start_date: string,
  end_date: string,
  force_refresh: boolean = false,
  logger: Logger,
): Promise<string> {
  const provider = getOptimizedUsDataProvider({
    logger: logger,
  });
  return provider.getStockData(symbol, start_date, end_date, force_refresh);
}

export { OptimizedUSDataProvider, getOptimizedUsDataProvider, getUsStockDataCached };
