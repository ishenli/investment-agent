import { z } from 'zod';

/**
 * 验证函数，返回格式化的错误信息
 * @param schema Zod schema
 * @param data 要验证的数据
 * @returns 验证结果和错误信息
 */
export function validateWithFormat<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    return `${issue.path.join('.')}: ${issue.message}`;
  });

  return { success: false, errors };
}
