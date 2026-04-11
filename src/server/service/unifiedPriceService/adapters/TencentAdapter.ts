import axios from 'axios';
import logger from '@server/base/logger';
import exchangeRateService from '@server/service/exchangeRateService';
import type { MarketType } from '@typings/asset';
import type {
  QuoteRequest,
  QuoteResponse,
  BatchQuoteResponse,
} from '@server/service/unifiedPriceService/types';
import { PriceSourceAdapter } from './PriceSourceAdapter';


/**
 * HKD 转 USD 的汇率转换（使用动态汇率）
 */
async function hkdToUsd(hkd: number): Promise<number> {
  const rate = await exchangeRateService.getRate('HKD', 'USD');
  return Number((hkd * rate).toFixed(4));
}

/**
 * CNY 转 USD 的汇率转换（使用动态汇率）
 */
async function cnyToUsd(cny: number): Promise<number> {
  const rate = await exchangeRateService.getRate('CNY', 'USD');
  return Number((cny * rate).toFixed(4));
}

/**
 * 腾讯港股行情数据接口 URL
 */
const STOCK_API = 'http://sqt.gtimg.cn/utf8/q=';

/**
 * 生成带前缀的股票代码
 */
function genStockPrefix(stockCode: string, market: MarketType): string {
  if (market === 'HK') {
    return `r_hk${stockCode}`;
  }
  if (market === 'CN') {
    // A股代码通常是 6xxxxx (SH), 0xxxxx/3xxxxx (SZ)
    // 腾讯接口前缀是 sh 或 sz
    const prefix =
      stockCode.startsWith('6') || stockCode.startsWith('9') || stockCode.startsWith('11')
        ? 'sh'
        : 'sz';
    return `${prefix}${stockCode}`;
  }
  return stockCode;
}

/**
 * 腾讯港股数据源适配器
 *
 * 支持 HK 市场的资产价格获取。
 * 支持批量查询，使用单次批量接口。
 */
export class TencentAdapter extends PriceSourceAdapter {
  name = 'tencent';
  supportedMarkets: MarketType[] = ['HK', 'CN'];
  supportsBatch = true;

  async fetchQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    // 使用批量接口获取单个股票
    const batchResult = await this.fetchBatchQuotes([request]);

    if (batchResult.succeeded.length > 0) {
      return batchResult.succeeded[0];
    }

    logger.error(`[TencentAdapter] Failed to fetch quote for ${request.symbol}`);
    return null;
  }

  /**
   * 批量获取港股价格
   * 使用腾讯批量接口，一次请求可以获取多个股票的数据
   */
  async fetchBatchQuotes(requests: QuoteRequest[]): Promise<BatchQuoteResponse> {
    const succeeded: QuoteResponse[] = [];
    const failed: Array<{ symbol: string; market: MarketType; error: string }> = [];

    if (requests.length === 0) {
      return { succeeded, failed };
    }

    try {
      // 构建批量请求 URL
      const prefixedCodes = requests.map((r) => genStockPrefix(r.symbol, r.market)).join(',');
      const url = `${STOCK_API}${prefixedCodes}`;

      logger.debug(`[TencentAdapter] Fetching quotes from Tencent API: ${url}`);
      const response = await axios.get(url, { responseType: 'text', timeout: 10000 });

      // 解析响应数据
      const stocksData = this.parseResponseData(response.data);

      // 匹配请求数据
      for (const request of requests) {
        const stockData = stocksData[request.symbol];
        if (stockData) {
          const isHK = request.market === 'HK';
          const price = isHK ? await hkdToUsd(stockData.price) : await cnyToUsd(stockData.price);
          succeeded.push({
            symbol: request.symbol,
            price,
            currency: isHK ? 'HKD' : 'CNY',
            timestamp: new Date(),
            source: 'tencent',
            cached: false,
          });
        } else {
          failed.push({
            symbol: request.symbol,
            market: request.market,
            error: 'No data returned from Tencent API',
          });
        }
      }
    } catch (error) {
      // 整体请求失败，所有股票都标记为失败
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[TencentAdapter] Batch quote failed:`, error);

      failed.push(
        ...requests.map((r) => ({
          symbol: r.symbol,
          market: r.market,
          error: errorMessage,
        })),
      );
    }

    return { succeeded, failed };
  }

  /**
   * 解析腾讯接口返回的数据
   */
  private parseResponseData(responseData: string): Record<string, { price: number }> {
    const result: Record<string, { price: number }> = {};

    // 使用正则表达式匹配股票数据: v_r_hk00981="..." 或 v_sh600519="..." 或 v_sz000001="..."
    const rawQuotations = responseData.match(/v_(r_hk|sh|sz)\d+=".*?"/g) || [];

    for (const rawQuotation of rawQuotations) {
      const match = rawQuotation.match(/"(.*?)"/);
      if (!match) continue;

      const fields = match[1].split('~');
      // fields[2] 是股票代码，fields[3] 是当前价格
      const stockCode = fields[2];
      const price = parseFloat(fields[3]) || 0;

      if (stockCode && price > 0) {
        result[stockCode] = { price };
      }
    }

    return result;
  }

  async healthCheck(_accountId?: string): Promise<boolean> {
    try {
      // 使用一个常见的港股代码进行健康检查
      const result = await this.fetchQuote({ symbol: '00700', market: 'HK' });
      return result !== null && result.price > 0;
    } catch {
      return false;
    }
  }
}