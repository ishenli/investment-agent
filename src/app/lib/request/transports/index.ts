/**
 * 请求传输接口定义
 * 为 HTTP 和 IPC 传输提供统一的接口
 */

export interface RequestConfig {
  params?: Record<string, any>;
  signal?: AbortSignal;
}

export interface PostConfig {
  signal?: AbortSignal;
}

export interface PutConfig {
  signal?: AbortSignal;
}

export interface DeleteConfig {
  signal?: AbortSignal;
}

export interface RequestTransport {
  request<T = any>(url: string, options: RequestInit): Promise<T>;
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T>;
  put<T = any>(url: string, body?: any, config?: PutConfig): Promise<T>;
  delete<T = any>(url: string, config?: DeleteConfig): Promise<T>;
}