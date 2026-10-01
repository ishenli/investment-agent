/**
 * Controller 返回结果解包工具
 *
 * Biz Controller 统一返回 { success, data, message, code }；此工具在工具 handler 中
 * 把成功结果序列化为文本、把失败结果抛为异常（由 handler 捕获转 isError）。
 */

export function unwrapControllerResult(result: unknown): string {
  if (!result || typeof result !== 'object') {
    throw new Error('Controller returned invalid response');
  }
  const r = result as { success?: boolean; message?: unknown; code?: string; data?: unknown };
  if (!r.success) {
    const msg = typeof r.message === 'string' ? r.message : JSON.stringify(r.message);
    throw new Error(`${r.code ?? 'CONTROLLER_ERROR'}: ${msg}`);
  }
  return JSON.stringify(r.data ?? result);
}