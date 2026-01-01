/**
 * 通用HTTP请求封装 (适配新请求管理器)
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise<T>
 */
import { RequestManager } from './request-manager';

const requestManager = RequestManager.getInstance();

export async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return requestManager.request<T>(url, options);
}

interface RequestConfig {
  params?: Record<string, any>;
  signal?: AbortSignal;
}

/**
 * GET请求封装
 * @param url 请求URL
 * @param config 请求配置
 * @returns Promise<T>
 */
export async function get<T = any>(url: string, config?: RequestConfig): Promise<T> {
  return requestManager.get<T>(url, config);
}

interface PostConfig {
  signal?: AbortSignal;
}

/**
 * POST请求封装
 * @param url 请求URL
 * @param body 请求体
 * @param config 请求配置
 * @returns Promise<T>
 */
export async function post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T> {
  return requestManager.post<T>(url, body, config);
}

interface PutConfig {
  signal?: AbortSignal;
}

/**
 * PUT请求封装
 * @param url 请求URL
 * @param body 请求体
 * @param config 请求配置
 * @returns Promise<T>
 */
export async function put<T = any>(url: string, body?: any, config?: PutConfig): Promise<T> {
  return requestManager.put<T>(url, body, config);
}

interface DeleteConfig {
  signal?: AbortSignal;
}

/**
 * DELETE请求封装
 * @param url 请求URL
 * @param config 请求配置
 * @returns Promise<T>
 */
export async function del<T = any>(url: string, config?: DeleteConfig): Promise<T> {
  return requestManager.delete<T>(url, config);
}

/**
 * 请求SSE
 * @param param0
 * @returns
 */
export async function requestSSE({
  api,
  body,
  method = 'POST',
  onProcessChunk,
  onBeforeProcess,
  onAfterProcess,
  signal,
}: {
  api: string;
  body: object;
  method?: string;
  onProcessChunk: (data: string) => void;
  onBeforeProcess?: () => void;
  onAfterProcess?: () => void;
  signal?: AbortSignal;
}) {
  const response = await fetch(api, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported');
  }
  onBeforeProcess?.();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      onAfterProcess?.();
      break;
    }

    const chunk = decoder.decode(value, { stream: true });

    // 处理 SSE 格式数据
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        // 提取数据部分
        const jsonData = line.substring(6); // 去掉 'data: ' 前缀
        // 处理 [DONE]
        if (jsonData === '[DONE]') {
          break;
        }
        onProcessChunk(jsonData);
      }
    }
  }

  return response;
}
