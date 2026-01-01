/**
 * HTTP 传输实现
 * 基于浏览器的 fetch API 实现
 */

import { RequestTransport, RequestConfig, PostConfig, PutConfig, DeleteConfig } from './index';

export class HTTPTransport implements RequestTransport {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    // 默认选项
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // 合并选项
    const config: RequestInit = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    // 处理请求体
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 尝试解析JSON响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      // 处理其他类型的响应
      return (await response.text()) as unknown as T;
    } catch (error) {
      console.error(`HTTP Request failed: ${url}`, error);
      throw error;
    }
  }

  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    let finalUrl = url;

    // 处理查询参数
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.keys(config.params).forEach((key) => {
        if (config.params![key] !== undefined && config.params![key] !== null) {
          searchParams.append(key, String(config.params![key]));
        }
      });
      finalUrl += `?${searchParams.toString()}`;
    }

    const options: RequestInit = { method: 'GET' };
    if (config?.signal) {
      options.signal = config.signal;
    }

    return this.request<T>(finalUrl, options);
  }

  async post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T> {
    const options: RequestInit = { method: 'POST' };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (config?.signal) {
      options.signal = config.signal;
    }

    return this.request<T>(url, options);
  }

  async put<T = any>(url: string, body?: any, config?: PutConfig): Promise<T> {
    const options: RequestInit = { method: 'PUT' };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (config?.signal) {
      options.signal = config.signal;
    }

    return this.request<T>(url, options);
  }

  async delete<T = any>(url: string, config?: DeleteConfig): Promise<T> {
    const options: RequestInit = { method: 'DELETE' };

    if (config?.signal) {
      options.signal = config.signal;
    }

    return this.request<T>(url, options);
  }
}