import type { Logger } from '@server/base/logger';
import type { MarketType } from '@typings/asset';
import { unifiedPriceService } from '../unifiedPriceService';
import { HistoryService } from '../historyService';
import { MarkdownFormatter } from './formatters';
import type {
  CompanyProfile,
} from './formatters';
import { StockDataCache, getCache } from '../../dataflows/cacheManager';
import { finnhubClient } from '../../dataflows/finnhubUtil';

/**
 * 股票数据服务
 *
 * 为 LLM Tools 提供统一的股票数据获取接口
 * - 实时报价 (<1天): 使用 UnifiedPriceService
 * - 历史数据 (>1天): 使用 HistoryService
 * - 支持文件缓存策略（cacheManager）
 * - 自动格式化为 Markdown 输出
 */
export class StockDataService {
  private cache: StockDataCache;
  private formatter: MarkdownFormatter;
  private historyService: HistoryService;
  private readonly DEFAULT_CACHE_HOURS = 2; // 默认缓存2小时
  private readonly min_api_interval: number = 1.0; // 最小API调用间隔（秒）
  private last_api_call: number = 0;

  constructor({ logger }: { logger: Logger }) {
    this.cache = getCache(logger);
    this.formatter = new MarkdownFormatter();
    this.historyService = new HistoryService();
    logger.info('[StockDataService] Stock data service initialized');
  }

  /**
   * 获取股票数据（LLM 友好的 Markdown 格式）
   *
   * 智能路由：
   * - 1天内：使用实时报价
   * - >1天：使用历史行情数据
   *
   * @param symbol 资产代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param market 市场类型
   * @param forceRefresh 是否强制刷新缓存
   * @returns Markdown 格式的股票数据
   */
  async getStockData(
    symbol: string,
    startDate: string,
    endDate: string,
    market: MarketType = 'US',
    forceRefresh: boolean = false,
  ): Promise<string> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 检查缓存（除非强制刷新）
    if (!forceRefresh) {
      const data_source = this.getDataSource(diffDays);
      const cacheKey = this.cache.findCachedStockData({
        symbol,
        start_date: startDate,
        end_date: endDate,
        data_source,
        max_age_hours: this.DEFAULT_CACHE_HOURS,
      });

      if (cacheKey) {
        const cachedData = this.cache.loadStockData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
    }

    // 缓存未命中，从 API 获取
    let formattedData: string | null = null;
    const dataSource = this.getDataSource(diffDays);

    try {
      await this.wait_for_rate_limit();

      if (diffDays <= 1) {
        // 实时模式
        formattedData = await this.fetchRealTimeData(symbol, market);
      } else {
        // 历史模式
        formattedData = await this.fetchHistoricalData(
          symbol,
          startDate,
          endDate,
          market,
        );
      }

      // 如果获取失败，生成备用数据
      if (!formattedData || formattedData.includes('❌')) {
        formattedData = null;
      }
    } catch (error) {
      formattedData = null;
    }

    // 如果失败，生成错误数据
    if (!formattedData) {
      return this.formatter.formatError(
        symbol,
        startDate,
        endDate,
        '股票数据源不可用，建议稍后重试',
        market,
      );
    }

    // 保存到缓存
    this.cache.saveStockData({
      symbol,
      data: formattedData,
      start_date: startDate,
      end_date: endDate,
      data_source: dataSource,
    });

    return formattedData;
  }

  /**
   * 获取实时报价数据（<1天）
   *
   * @param symbol 资产代码
   * @param market 市场类型
   * @returns Markdown 格式数据
   */
  private async fetchRealTimeData(
    symbol: string,
    market: MarketType = 'US',
  ): Promise<string> {
    // 获取实时报价
    const quote = await unifiedPriceService.getQuote(symbol, market);

    if (!quote) {
      throw new Error(`Failed to get quote for ${symbol}`);
    }

    // 获取公司档案
    const profile = await this.getCompanyProfile(symbol);

    // 格式化为 Markdown
    return this.formatter.formatQuote(quote, market, profile);
  }

  /**
   * 获取历史行情数据（>1天）
   *
   * @param symbol 资产代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param market 市场类型
   * @returns Markdown 格式数据
   */
  private async fetchHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string,
    market: MarketType = 'US',
  ): Promise<string> {
    // 获取历史蜡烛数据
    const candleData = await this.historyService.getCandleDataForDateRange(
      symbol,
      { startDate, endDate },
      market,
    );

    if (!candleData) {
      throw new Error(
        `Failed to get historical data for ${symbol} from ${startDate} to ${endDate}`,
      );
    }

    // 获取公司档案
    const profile = await this.getCompanyProfile(symbol);

    // 格式化为 Markdown
    return this.formatter.formatHistory(
      candleData,
      market,
      profile,
      startDate,
      endDate,
    );
  }

  /**
   * 获取公司档案
   *
   * @param symbol 资产代码
   * @returns 公司档案或 undefined
   */
  private async getCompanyProfile(
    symbol: string,
  ): Promise<CompanyProfile | undefined> {
    try {
      const profile = await this.finnhubPromisify('companyProfile2', symbol);
      return profile as unknown as CompanyProfile;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Finnhub Promise 封装
   */
  private finnhubPromisify(method: string, params: string): Promise<object> {
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
   * 根据日期范围确定数据源
   */
  private getDataSource(diffDays: number): string {
    if (diffDays <= 1) {
      return 'unified_price'; // 实时报价
    }
    return 'finnhub_history'; // 历史数据
  }

  /**
   * API 限流等待
   */
  private async wait_for_rate_limit(): Promise<void> {
    const current_time = Date.now() / 1000;
    const time_since_last_call = current_time - this.last_api_call;

    if (time_since_last_call < this.min_api_interval) {
      const wait_time = this.min_api_interval - time_since_last_call;
      await new Promise((resolve) =>
        setTimeout(resolve, wait_time * 1000),
      );
    }

    this.last_api_call = Date.now() / 1000;
  }

  /**
   * 清除缓存
   */
  invalidateCache(): void {
    this.cache = getCache({} as Logger);
  }
}

// 全局单例实例
let _stockDataService: StockDataService | null = null;

/**
 * 获取股票数据服务实例
 *
 * @param options 配置选项
 * @returns StockDataService 实例
 */
export function getStockDataService(options: {
  logger: Logger;
}): StockDataService {
  if (_stockDataService === null) {
    _stockDataService = new StockDataService(options);
  }
  return _stockDataService;
}

/**
 * 获取 LLM 友好的股票数据（便捷方法）
 *
 * @param symbol 资产代码
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param market 市场类型
 * @param forceRefresh 是否强制刷新缓存
 * @param logger 日志记录器
 * @returns Markdown 格式的股票数据
 */
export async function getStockData(
  symbol: string,
  startDate: string,
  endDate: string,
  market: MarketType = 'US',
  forceRefresh: boolean = false,
  logger: Logger,
): Promise<string> {
  const service = getStockDataService({ logger });
  return service.getStockData(symbol, startDate, endDate, market, forceRefresh);
}