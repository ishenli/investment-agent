import { AsyncLocalStorage } from 'async_hooks';

// 定义请求上下文类型
interface RequestContext {
  requestId: string;
  // 其他上下文信息
  startTime?: number;
  userAgent?: string;
  [key: string]: unknown;
}

// 创建一个单例实例
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 获取当前请求上下文
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * 向当前上下文添加数据
 */
export function addToContext(key: string, value: unknown): void {
  const context = requestContextStorage.getStore();
  if (context) {
    context[key] = value;
  }
}
