import { z } from 'zod';
import { ResultUtil } from '../responseUtil';
import { requestContextStorage } from '../asyncStorage';
import { NextRequest } from 'next/server';

// 增强的请求上下文类型
export interface ValidateRequestContext {
  requestId: string;
  startTime: number;
  validatedData?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

// 请求验证选项
export interface RequestValidationOptions {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

// 增强的请求类型
export type ValidateRequest<T = unknown> = NextRequest & {
  context: ValidateRequestContext;
  validatedData: T;
};

/**
 * 请求参数验证装饰器，专门支持 Nextjs 的 API 路由
 * @returns
 */
export function Validate(options: RequestValidationOptions = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    // 保存对类的引用
    const Class = target;

    descriptor.value = async function (request: NextRequest, ...args: unknown[]) {
      const context = requestContextStorage.getStore() as ValidateRequestContext;
      const enhancedRequest = {
        ...request,
        context,
        validatedData: {} as unknown,
      };

      try {
        // 验证请求体
        if (options.body) {
          const body = await request.json();
          const bodyResult = options.body.safeParse(body);
          if (!bodyResult.success) {
            return Response.json(ResultUtil.error(bodyResult.error.issues, 'validate_error'), {
              status: 400,
            });
          }
          enhancedRequest.validatedData = bodyResult.data;
        }

        // 验证查询参数
        if (options.query) {
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams);
          const queryResult = options.query.safeParse(queryParams);
          if (!queryResult.success) {
            return Response.json(ResultUtil.error(queryResult.error.issues, 'validate_error'), {
              status: 400,
            });
          }
          enhancedRequest.validatedData = queryResult.data;
        }

        // 验证路径参数
        if (options.params) {
          const params = {}; // 这里需要从路由中获取参数
          const paramsResult = options.params.safeParse(params);
          if (!paramsResult.success) {
            return Response.json(ResultUtil.error(paramsResult.error.issues, 'validate_error'), {
              status: 400,
            });
          }
          enhancedRequest.validatedData = paramsResult.data;
        }

        // 使用类引用调用原始方法
        return await originalMethod.apply(Class, [enhancedRequest, ...args]);
      } catch (error) {
        return Response.json(ResultUtil.error('Invalid request', 'validate_error'), {
          status: 400,
        });
      }
    };

    return descriptor;
  };
}
