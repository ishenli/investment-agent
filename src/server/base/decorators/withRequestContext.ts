/* eslint-disable @typescript-eslint/ban-ts-comment */
import { requestContextStorage } from '../asyncStorage';
import { randomUUID } from 'node:crypto';
/**
 * 在请求上下文中运行函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runWithRequestContext(fn: () => Promise<any>): Promise<Response> {
  const requestId = randomUUID().replace(/-/g, '');
  const existingContext = requestContextStorage.getStore();
  const invoker = async () => {
    const res = await fn();
    if (res instanceof Response) {
      res.headers.set('X-Request-Id', requestId);
    }
    return res;
  };

  // 如果已有上下文且 requestId 匹配，则重用上下文
  if (existingContext && existingContext.requestId === requestId) {
    return invoker();
  }

  // 创建新的上下文
  return requestContextStorage.run(
    {
      requestId,
      startTime: Date.now(),
    },
    invoker,
  );
}

/**
 * 在请求上下文中运行函数，专门支持 Nextjs 的 API 路由
 * @returns
 */
export function WithRequestContextStatic() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (...args: any[]) {
      // 对于静态方法，this 就是类本身
      const Class = target;

      return runWithRequestContext(async () => {
        // 使用类本身调用原始方法
        return await originalMethod.apply(Class, args);
      });
    };
    return descriptor;
  };
}


export function WithRequestContext() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (this: any, ...args: any[]) {
      // 对于实例方法，this 指向实例；对于静态方法，this 指向类构造函数。
      // 直接使用运行时的 `this` 能同时支持静态和实例方法。

      const self = this;

      return runWithRequestContext(async () => {
        // 使用运行时的 this 调用原始方法（支持实例方法和静态方法）
        return await originalMethod.apply(self, args);
      });
    };
    return descriptor;
  };
}
