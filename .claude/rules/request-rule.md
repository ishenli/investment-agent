# Request 规则

## 概述

为了实现请求在 HTTP 和 IPC 之间的无缝切换，我们需要设计一个统一的请求抽象层。该抽象层将隐藏底层传输协议的具体实现，使 React 组件无需关心实际使用的是 HTTP 还是 IPC。

## 设计原则

1. **透明切换**：上层组件不应该感知到底层使用的是 HTTP 还是 IPC
2. **统一接口**：提供一致的 API 接口，无论底层实现如何变化
3. **可配置性**：支持运行时动态切换传输协议
4. **向后兼容**：不破坏现有基于 HTTP 的实现

## 核心实现

### 1. 请求传输接口定义

```typescript
export interface RequestTransport {
  request<T = any>(url: string, options: RequestInit): Promise<T>;
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T>;
  put<T = any>(url: string, body?: any, config?: PutConfig): Promise<T>;
  delete<T = any>(url: string, config?: DeleteConfig): Promise<T>;
}
```

### 2. HTTP 传输实现

```typescript
class HTTPTransport implements RequestTransport {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    // 使用现有的 fetch 实现
    return fetch(url, options).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  }
  
  // 实现 get, post, put, delete 方法...
}
```

### 3. IPC 传输实现（示例）

```typescript
class IPCTransport implements RequestTransport {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    // 使用 IPC 通信方式
    // 例如通过 Electron 的 IPC 通道发送消息
    return window.electron.ipcRenderer.invoke('http-request', { url, options });
  }
  
  // 实现 get, post, put, delete 方法...
}
```

### 4. 传输工厂

```typescript
class TransportFactory {
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
```

### 5. 请求管理器

```typescript
class RequestManager {
  private static instance: RequestManager;
  private transport: RequestTransport;
  
  private constructor() {
    // 默认使用 HTTP 传输
    this.transport = TransportFactory.createTransport('http');
  }
  
  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }
  
  setTransport(type: 'http' | 'ipc') {
    this.transport = TransportFactory.createTransport(type);
  }
  
  get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.transport.get(url, config);
  }
  
  post<T = any>(url: string, body?: any, config?: PostConfig): Promise<T> {
    return this.transport.post(url, body, config);
  }
  
  // 其他方法...
}
```

## 使用方式

### 在 React 组件中使用

```typescript
import { RequestManager } from '@/app/lib/request-manager';

const requestManager = RequestManager.getInstance();

// 组件中使用，无需关心底层传输协议
const fetchData = async () => {
  try {
    const data = await requestManager.get('/api/data');
    setData(data);
  } catch (error) {
    console.error('Request failed:', error);
  }
};
```

### 切换传输协议

```typescript
// 在应用启动或配置时切换传输协议
RequestManager.getInstance().setTransport('ipc'); // 切换到 IPC
// 或
RequestManager.getInstance().setTransport('http'); // 切换到 HTTP
```

## 项目结构建议

```
src/
├── app/
│   ├── lib/
│   │   ├── request-manager.ts      # 请求管理器
│   │   ├── transports/
│   │   │   ├── http-transport.ts   # HTTP 传输实现
│   │   │   ├── ipc-transport.ts    # IPC 传输实现
│   │   │   └── index.ts            # 传输接口定义
│   │   └── request.ts              # 现有请求封装的适配
```

## 迁移策略

1. **第一步**：创建新的请求管理层，保持现有代码不变
2. **第二步**：逐步替换现有组件中的直接 fetch 调用
3. **第三步**：添加 IPC 传输实现
4. **第四步**：提供运行时切换能力

## 注意事项

1. 确保 IPC 实现与 HTTP 实现有相同的行为和错误处理
2. 在开发环境中默认使用 HTTP，便于调试
3. 生产环境中根据环境变量或配置决定使用哪种传输方式
4. 添加适当的日志记录，方便追踪请求路径