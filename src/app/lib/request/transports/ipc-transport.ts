/**
 * IPC 传输实现占位文件
 * 需要根据实际的 IPC 实现进行完善
 */

import { RequestTransport, RequestConfig, PostConfig, PutConfig, DeleteConfig } from './index';

export class IPCTransport implements RequestTransport {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    // 这里需要根据实际的 IPC 实现进行调整
    // 示例：通过 Electron 的 IPC 通道发送消息
    console.warn('IPC transport is not fully implemented yet. Falling back to HTTP-like behavior.');
    
    // 临时实现，实际应通过 IPC 通道发送请求
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`IPC Request failed! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return (await response.text()) as unknown as T;
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