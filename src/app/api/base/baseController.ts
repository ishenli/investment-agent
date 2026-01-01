import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ResultUtil } from '@server/base/responseUtil';

export abstract class BaseController {
  static async getQuery(request: Request): Promise<any> {
    const url = new URL(request.url);
    return Object.fromEntries(url.searchParams);
  }

  static async getBody(request: Request) {
    return request.json();
  }
  static async validateParams<T extends z.ZodType>(request: Request, schema: T) {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const param = schema.safeParse(searchParams);
    if (!param.success) {
      throw new Error(JSON.stringify(param.error.issues));
    }
    return param.data as z.infer<T>;
  }

  static async validateBody<T extends z.ZodType>(request: Request, schema: T) {
    const body = await request.json();
    const param = schema.safeParse(body);
    if (!param.success) {
      throw new Error(JSON.stringify(param.error.issues));
    }
    return param.data as z.infer<T>;
  }

  static async responseValidateError(error: z.ZodError) {
    return NextResponse.json(ResultUtil.error(error.issues, 'validate_error'), {
      status: 400,
    });
  }

  static async success(data: object) {
    return NextResponse.json(ResultUtil.success(data));
  }

  static async error(message: string, code: string) {
    return NextResponse.json(ResultUtil.error(message, code), { status: 500 });
  }
}
