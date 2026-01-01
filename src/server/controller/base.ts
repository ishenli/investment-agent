import { z } from 'zod';
import { ResultUtil } from '@server/base/responseUtil';

export abstract class BaseBizController {
  async validateParams<T extends z.ZodType>(param: any, schema: T) {
    const paramData = schema.safeParse(param);
    if (!paramData.success) {
      throw new Error(JSON.stringify(paramData.error.issues));
    }
    return paramData.data as z.infer<T>;

  }

  async responseValidateError(error: z.ZodError) {
    return ResultUtil.error(error.issues, 'validate_error');
  }

  success(data: object) {
    return ResultUtil.success(data);
  }

  error(message: string, code: string) {
    return ResultUtil.error(message, code), { status: 500 };
  }
}
