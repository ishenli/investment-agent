import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';

/**
 * 判断错误是否可重试
 *
 * @param error 错误对象
 * @returns 是否可重试
 */
export function isRetryable(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);

  // 网络相关错误通常可重试
  const networkErrors = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'fetch failed',
    'network error',
    'timeout',
    'Temporary failure',
  ];

  return networkErrors.some((pattern) => errorMessage.includes(pattern));
}

/**
 * 带重试的执行函数 - 选项对象形式
 *
 * @param fn 要执行的操作
 * @param options 重试选项
 * @returns 操作结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; delay?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const delay = options?.delay ?? 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      if (!isRetryable(error)) {
        throw error;
      }

      const backoffDelay = delay * Math.pow(2, attempt);
      logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}

/**
 * 处理单个请求失败
 *
 * @param request 请求对象
 * @param error 错误对象
 * @returns 失败信息
 */
export function handleIndividualFailure(
  request: { symbol: string; market: MarketType | string },
  error: unknown,
): { symbol: string; market: MarketType; error: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    symbol: request.symbol,
    market: request.market as MarketType,
    error: errorMessage,
  };
}

/**
 * 处理批量请求失败 - 多参数形式
 *
 * @param symbols 资产代码数组
 * @param markets 市场类型数组
 * @param error 错误对象
 * @returns 失败信息数组
 */
export function handleBatchFailure(
  symbols: string[],
  markets: (MarketType | string)[],
  error: unknown,
): Array<{ symbol: string; market: MarketType; error: string }> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return symbols.map((symbol, index) => ({
    symbol,
    market: markets[index] as MarketType,
    error: errorMessage,
  }));
}