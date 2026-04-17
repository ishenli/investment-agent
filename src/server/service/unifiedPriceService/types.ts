import type { MarketType } from '@typings/asset';

/**
 * 价格查询请求
 */
export interface QuoteRequest {
  /** 资产代码，如 "AAPL", "00700.HK" */
  symbol: string;
  /** 市场类型 */
  market: MarketType;
  /** 账户 ID，用于获取用户配置（如 API Key），可选 */
  accountId?: string;
  /** 资产类型（可选），用于区分基金等特殊资产 */
  assetType?: 'stock' | 'etf' | 'fund' | 'crypto';
}

/**
 * 价格查询响应
 */
export interface QuoteResponse {
  /** 资产代码 */
  symbol: string;
  /** 价格 */
  price: number;
  /** 货币代码，如 "USD", "HKD" */
  currency: string;
  /** 价格时间戳 */
  timestamp: Date;
  /** 数据源名称，如 "finnhub", "tencent" */
  source: string;
  /** 是否来自缓存 */
  cached: boolean;
}

/**
 * 失败的价格查询
 */
export interface FailedQuote {
  /** 资产代码 */
  symbol: string;
  /** 市场类型 */
  market: MarketType;
  /** 错误信息 */
  error: string;
}

/**
 * 批量价格查询响应
 */
export interface BatchQuoteResponse {
  /** 成功的查询结果 */
  succeeded: QuoteResponse[];
  /** 失败的查询结果 */
  failed: FailedQuote[];
}

/**
 * 价格查询选项
 */
export interface QuoteOptions {
  /** 是否使用缓存，默认 true */
  useCache?: boolean;
  /** 是否强制刷新（跳过缓存），默认 false */
  forceRefresh?: boolean;
  /** 请求超时时间（毫秒），默认 10000 */
  timeout?: number;
  /** 重试次数，默认 3 */
  retries?: number;
  /** 备用适配器名称，主适配器失败时使用 */
  fallbackAdapter?: string;
}