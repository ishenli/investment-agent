import { createDefaultRouter } from './adapters';
import { UnifiedPriceService } from './UnifiedPriceService';

/**
 * 导出类型
 */
export type {
  BatchQuoteResponse,
  FailedQuote,
  QuoteOptions,
  QuoteRequest,
  QuoteResponse,
} from './types';

export type { UpdateStats } from './UnifiedPriceService';

/**
 * 导出缓存类
 */
export { SameDayPriceCache } from './cache';

/**
 * 导出错误处理函数
 */
export {
  handleBatchFailure,
  handleIndividualFailure,
  isRetryable,
  withRetry,
} from './errorHandler';

/**
 * 创建并初始化单例实例
 */
const router = createDefaultRouter();
export const unifiedPriceService = new UnifiedPriceService(router);

/**
 * 导出服务类（用于测试或高级用例）
 */
export { UnifiedPriceService } from './UnifiedPriceService';