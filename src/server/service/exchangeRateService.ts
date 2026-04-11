/**
 * Exchange Rate Service
 *
 * 汇率管理服务：提供汇率获取、设置和货币转换功能
 */
import { exchangeRateRepository, type ExchangeRate } from '@server/repository/exchangeRateRepository';
import { fetchExchangeRatesFromAPI, type FetchedRate } from './exchangeRateService/adapters/FreeCurrencyAPI';
import logger from '@server/base/logger';

/**
 * 默认汇率（作为后备值）
 * 保持与原 constant.ts 中的硬编码值一致
 */
export const DEFAULT_EXCHANGE_RATES = {
  HKD_TO_USD: 0.13,
  CNY_TO_USD: 0.14,
};

/**
 * 汇率来源类型
 */
export type ExchangeRateSource = 'manual' | 'api' | 'default';

/**
 * 汇率数据接口
 */
export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: ExchangeRateSource;
  lastUpdated: Date | null;
}

export class ExchangeRateService {
  /**
   * 获取汇率（优先用户设置，后备默认值）
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // 如果是 USD 到 USD，直接返回 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    // 尝试从数据库获取
    const rate = await exchangeRateRepository.findByCurrencyPair(fromCurrency, toCurrency);

    if (rate) {
      return rate.rate;
    }

    // 使用默认汇率
    return this.getDefaultRate(fromCurrency, toCurrency);
  }

  /**
   * 获取所有汇率
   */
  async getAllRates(): Promise<ExchangeRateData[]> {
    const rates = await exchangeRateRepository.getAllRates();

    // 如果数据库为空，返回默认汇率
    if (rates.length === 0) {
      return this.getDefaultRates();
    }

    return rates.map((r) => ({
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: r.rate,
      source: r.source,
      lastUpdated: r.lastUpdated,
    }));
  }

  /**
   * 设置汇率
   */
  async setRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    source: ExchangeRateSource = 'manual'
  ): Promise<ExchangeRateData> {
    const result = await exchangeRateRepository.upsertRate(fromCurrency, toCurrency, rate, source);

    return {
      fromCurrency: result.fromCurrency,
      toCurrency: result.toCurrency,
      rate: result.rate,
      source: result.source,
      lastUpdated: result.lastUpdated,
    };
  }

  /**
   * 从在线 API 获取汇率
   */
  async fetchFromAPI(): Promise<ExchangeRateData[]> {
    try {
      const fetchedRates = await fetchExchangeRatesFromAPI();

      // 保存到数据库
      const savedRates: ExchangeRateData[] = [];
      for (const fetched of fetchedRates) {
        const saved = await this.setRate(fetched.fromCurrency, fetched.toCurrency, fetched.rate, 'api');
        savedRates.push(saved);
      }

      logger.info(`[ExchangeRateService] Successfully saved ${savedRates.length} rates from API`);
      return savedRates;
    } catch (error) {
      logger.error('[ExchangeRateService] Failed to fetch rates from API:', error);
      throw error;
    }
  }

  /**
   * 获取默认汇率
   */
  getDefaultRate(fromCurrency: string, toCurrency: string): number {
    const key = `${fromCurrency}_TO_${toCurrency}` as keyof typeof DEFAULT_EXCHANGE_RATES;
    return DEFAULT_EXCHANGE_RATES[key] ?? 1;
  }

  /**
   * 获取所有默认汇率
   */
  getDefaultRates(): ExchangeRateData[] {
    return [
      {
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: DEFAULT_EXCHANGE_RATES.HKD_TO_USD,
        source: 'default',
        lastUpdated: null,
      },
      {
        fromCurrency: 'CNY',
        toCurrency: 'USD',
        rate: DEFAULT_EXCHANGE_RATES.CNY_TO_USD,
        source: 'default',
        lastUpdated: null,
      },
    ];
  }

  /**
   * 初始化默认汇率到数据库
   * 仅在数据库为空时执行
   */
  async initializeDefaultRates(): Promise<void> {
    const existingRates = await exchangeRateRepository.getAllRates();

    if (existingRates.length === 0) {
      logger.info('[ExchangeRateService] Initializing default exchange rates...');

      for (const defaultRate of this.getDefaultRates()) {
        await exchangeRateRepository.upsertRate(
          defaultRate.fromCurrency,
          defaultRate.toCurrency,
          defaultRate.rate,
          'default'
        );
      }

      logger.info('[ExchangeRateService] Default exchange rates initialized successfully');
    }
  }

  /**
   * 货币转换（转换为 USD）
   */
  async convertToUSD(amount: number, fromCurrency: string): Promise<number> {
    const rate = await this.getRate(fromCurrency, 'USD');
    return amount * rate;
  }

  /**
   * 批量货币转换
   */
  async convertMultiple(
    amounts: Array<{ amount: number; fromCurrency: string }>
  ): Promise<Array<{ originalAmount: number; fromCurrency: string; usdAmount: number }>> {
    const results = [];

    for (const item of amounts) {
      const usdAmount = await this.convertToUSD(item.amount, item.fromCurrency);
      results.push({
        originalAmount: item.amount,
        fromCurrency: item.fromCurrency,
        usdAmount,
      });
    }

    return results;
  }

  /**
   * 重置为默认汇率
   */
  async resetToDefaults(): Promise<void> {
    const defaultRates = this.getDefaultRates();

    for (const defaultRate of defaultRates) {
      await exchangeRateRepository.upsertRate(
        defaultRate.fromCurrency,
        defaultRate.toCurrency,
        defaultRate.rate,
        'default'
      );
    }

    logger.info('[ExchangeRateService] Exchange rates reset to defaults');
  }

  /**
   * 删除指定货币对的汇率
   */
  async deleteRate(fromCurrency: string, toCurrency: string): Promise<boolean> {
    return exchangeRateRepository.deleteByCurrencyPair(fromCurrency, toCurrency);
  }
}

// 导出单例
const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;
