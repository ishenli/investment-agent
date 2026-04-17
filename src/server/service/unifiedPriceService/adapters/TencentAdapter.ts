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
 * 判断是否为基金代码请求
 */
function isFundRequest(request: QuoteRequest): boolean {
  return request.assetType === 'fund' && request.market === 'CN';
}

/**
 * 生成带前缀的股票代码
 */
function genStockPrefix(stockCode: string, market: MarketType, assetType?: string): string {
  if (market === 'HK') {
    return `r_hk${stockCode}`;
  }
  if (market === 'CN') {
    // 基金代码使用 jj 前缀
    if (assetType === 'fund') {
      return `jj${stockCode}`;
    }
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
   * 批量获取港股/A股/基金价格
   * 使用腾讯批量接口，一次请求可以获取多个股票的数据
   */
  async fetchBatchQuotes(requests: QuoteRequest[]): Promise<BatchQuoteResponse> {
    const succeeded: QuoteResponse[] = [];
    const failed: Array<{ symbol: string; market: MarketType; error: string }> = [];

    if (requests.length === 0) {
      return { succeeded, failed };
    }

    // 分离基金请求和股票请求（基金返回格式不同，需单独解析）
    const fundRequests = requests.filter(isFundRequest);
    const stockRequests = requests.filter((r) => !isFundRequest(r));

    // 处理股票请求
    if (stockRequests.length > 0) {
      try {
        const prefixedCodes = stockRequests.map((r) => genStockPrefix(r.symbol, r.market, r.assetType)).join(',');
        const url = `${STOCK_API}${prefixedCodes}`;

        logger.debug(`[TencentAdapter] Fetching stock quotes from Tencent API: ${url}`);
        const response = await axios.get(url, { responseType: 'text', timeout: 10000 });

        const stocksData = this.parseResponseData(response.data);

        stockRequests.forEach(async (request) => {
          const stockData = stocksData[request.symbol];
          if (stockData) {
            const isHK = request.market === 'HK';
            succeeded.push({
              symbol: request.symbol,
              price: isHK ? await hkdToUsd(stockData.price) : await cnyToUsd(stockData.price),
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
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[TencentAdapter] Stock batch quote failed:`, error);
        failed.push(
          ...stockRequests.map((r) => ({ symbol: r.symbol, market: r.market, error: errorMessage })),
        );
      }
    }

    // 处理基金请求
    if (fundRequests.length > 0) {
      try {
        const prefixedCodes = fundRequests.map((r) => genStockPrefix(r.symbol, r.market, r.assetType)).join(',');
        const url = `${STOCK_API}${prefixedCodes}`;

        logger.debug(`[TencentAdapter] Fetching fund quotes from Tencent API: ${url}`);
        const response = await axios.get(url, { responseType: 'text', timeout: 10000 });

        const fundsData = this.parseFundResponseData(response.data);

        fundRequests.forEach((request) => {
          const fundData = fundsData[request.symbol];
          if (fundData) {
            // 基金保留 CNY 原始净值，不做 USD 转换
            succeeded.push({
              symbol: request.symbol,
              price: fundData.price,
              currency: 'CNY',
              timestamp: new Date(),
              source: 'tencent',
              cached: false,
            });
          } else {
            failed.push({
              symbol: request.symbol,
              market: request.market,
              error: 'No fund data returned from Tencent API',
            });
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[TencentAdapter] Fund batch quote failed:`, error);
        failed.push(
          ...fundRequests.map((r) => ({ symbol: r.symbol, market: r.market, error: errorMessage })),
        );
      }
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

  /**
   * 解析腾讯基金接口返回的数据
   * 基金返回格式: v_jj012349="基金代码~基金名称~涨跌额~涨跌幅~~单位净值~累计净值~...~日期~"
   */
  private parseFundResponseData(responseData: string): Record<string, { price: number; name?: string }> {
    const result: Record<string, { price: number; name?: string }> = {};

    // 匹配基金数据: v_jj110011="..."
    const rawQuotations = responseData.match(/v_jj\d+=".*?"/g) || [];

    for (const rawQuotation of rawQuotations) {
      const match = rawQuotation.match(/"(.*?)"/);
      if (!match) continue;

      const fields = match[1].split('~');
      // fields[0] = 基金代码, fields[1] = 基金名称, fields[5] = 单位净值
      const fundCode = fields[0];
      const fundName = fields[1];
      const nav = parseFloat(fields[5]) || 0;

      if (fundCode && nav > 0) {
        result[fundCode] = { price: nav, name: fundName };
      }
    }

    return result;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 使用一个常见的港股代码进行健康检查
      const result = await this.fetchQuote({ symbol: '00700', market: 'HK' });
      return result !== null && result.price > 0;
    } catch {
      return false;
    }
  }
}