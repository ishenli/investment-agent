/**
 * Free Currency API Adapter
 *
 * 使用免费汇率 API 获取实时汇率数据
 * 备选方案：exchangerate-api.com, open.er-api.com, ECB API
 */
import axios from 'axios';
import logger from '@server/base/logger';

/**
 * 汇率 API 响应格式
 */
interface ExchangeRateAPIResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

/**
 * 获取的汇率数据
 */
export interface FetchedRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

/**
 * 从 Open Exchange Rate API 获取汇率
 * 使用 exchangerate-api.com 的免费端点
 */
export async function fetchExchangeRatesFromAPI(): Promise<FetchedRate[]> {
  try {
    // 使用免费的 ExchangeRate-API
    // API 文档：https://www.exchangerate-api.com/docs/overview
    const response = await axios.get<ExchangeRateAPIResponse>(
      'https://open.er-api.com/v6/latest/USD',
      {
        timeout: 10000, // 10秒超时
      }
    );

    if (response.data.result !== 'success') {
      throw new Error(`API returned unsuccessful result: ${response.data.result}`);
    }

    const rates = response.data.rates;
    const lastUpdated = new Date(response.data.time_last_update_utc);

    // 提取我们需要的货币对（HKD 和 CNY 相对于 USD）
    const fetchedRates: FetchedRate[] = [];

    // HKD -> USD (从 USD -> HKD 反推)
    if (rates.HKD) {
      fetchedRates.push({
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 1 / rates.HKD, // HKD 到 USD 的汇率
        lastUpdated,
      });
    }

    // CNY -> USD (从 USD -> CNY 反推)
    if (rates.CNY) {
      fetchedRates.push({
        fromCurrency: 'CNY',
        toCurrency: 'USD',
        rate: 1 / rates.CNY, // CNY 到 USD 的汇率
        lastUpdated,
      });
    }

    logger.info(
      `[FreeCurrencyAPI] Successfully fetched ${fetchedRates.length} exchange rates from API`
    );

    return fetchedRates;
  } catch (error) {
    logger.error('[FreeCurrencyAPI] Failed to fetch exchange rates from API:', error);
    throw error;
  }
}

/**
 * 备用方案：从 European Central Bank API 获取汇率
 * ECB API 完全免费且稳定
 */
export async function fetchExchangeRatesFromECB(): Promise<FetchedRate[]> {
  try {
    // ECB 提供免费的每日汇率数据
    // 这里使用一个简化的实现，实际项目中可以使用更完整的 ECB API 客户端
    const response = await axios.get(
      'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
      {
        timeout: 10000,
      }
    );

    // 解析 XML 响应（这里简化处理，实际需要 XML 解析）
    // 由于 XML 解析复杂，这里仅作为备用方案的示例
    logger.warn('[ECB] ECB API integration not fully implemented, falling back to default rates');

    // 返回空数组，让 Service 使用默认值
    return [];
  } catch (error) {
    logger.error('[ECB] Failed to fetch exchange rates from ECB:', error);
    return [];
  }
}
