/**
 * 请求管理器
 * 提供统一的请求入口，支持在 HTTP 和 IPC 之间切换
 */

import { RequestTransport } from './transports';
import { TransportFactory } from './transports/factory';
import { RequestConfig, PostConfig, PutConfig, DeleteConfig } from './transports';

export class RequestManager {
  private static instance: RequestManager;
  private transport: RequestTransport;
  private transportType: 'http' | 'ipc';

  private constructor() {
    // 默认使用 HTTP 传输
    this.transportType = 'http';
    this.transport = TransportFactory.createTransport(this.transportType);
  }

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * 设置传输类型
   * @param type 传输类型 ('http' | 'ipc')
   */
  setTransport(type: 'http' | 'ipc') {
    this.transportType = type;
    this.transport = TransportFactory.createTransport(type);
  }

  /**
   * 获取当前传输类型
   */
  getTransportType(): 'http' | 'ipc' {
    return this.transportType;
  }

  /**
   * 发起请求
   * @param url 请求地址
   * @param options 请求选项
   */
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    return this.transport.request<T>(url, options);
  }

  /**
   * GET 请求
   * @param url 请求地址
   * @param config 请求配置
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.transport.get<T>(url, config);
  }

  /**
   * POST 请求
   * @param url 请求地址
   * @param body 请求体
   * @param config 请求配置
   */
  async post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T> {
    return this.transport.post<T>(url, body, config);
  }

  /**
   * PUT 请求
   * @param url 请求地址
   * @param body 请求体
   * @param config 请求配置
   */
  async put<T = any>(url: string, body?: any, config?: PutConfig): Promise<T> {
    return this.transport.put<T>(url, body, config);
  }

  /**
   * DELETE 请求
   * @param url 请求地址
   * @param config 请求配置
   */
  async delete<T = any>(url: string, config?: DeleteConfig): Promise<T> {
    return this.transport.delete<T>(url, config);
  }
}