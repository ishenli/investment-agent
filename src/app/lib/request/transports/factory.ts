/**
 * 传输工厂
 * 根据类型创建相应的传输实现
 */

import { RequestTransport } from './index';
import { HTTPTransport } from './http-transport';
import { IPCTransport } from './ipc-transport';

export class TransportFactory {
  static createTransport(type: 'http' | 'ipc'): RequestTransport {
    switch (type) {
      case 'http':
        return new HTTPTransport();
      case 'ipc':
        return new IPCTransport();
      default:
        return new HTTPTransport();
    }
  }
}