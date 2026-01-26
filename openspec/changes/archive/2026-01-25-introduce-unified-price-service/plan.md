# 统一价格获取服务技术设计

## 分支：`unified-price-service` | **日期**：2026-01-24

## 架构概览

采用分层适配器架构，实现价格获取的统一抽象：

```
┌─────────────────────────────────────────────────────────┐
│                    业务层 (Business Layer)               │
│  - InitController.init()                                 │
│  - 定时价格更新服务                                       │
│  - 手动刷新功能                                           │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│              统一价格服务层         │
│  - getQuote(symbol, market, options)                     │
│  - batchGetQuote(symbols, market, options)               │
│  - 统一缓存策略                                           │
│  - 重试/降级/超时控制                                     │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│             数据源适配器层                                │
│  ├── PriceSourceAdapter (抽象基类)                       │
│  ├── FinnhubAdapter (美股/其他 Finnhub 支持的市场)        │
│  ├── TencentAdapter (港股)                               │
│  └── AdapterRouter (路由和主备切换)                      │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│               持久化层              │
│  - assetMeta (当日最新价格 - 缓存)                        │
│  - assetPriceHistory (历史价格)                         │
│  - priceService.updatePrice/batchUpdatePrices            │
└─────────────────────────────────────────────────────────┘
```

## 技术上下文

**语言/版本**：TypeScript 5.x / Node.js >= 20
**主要依赖**：Next.js 16, Drizzle ORM, dayjs
**存储**：SQLite via Drizzle ORM
**性能目标**：
- 单次价格获取 < 500ms (有缓存) / < 2000ms (无缓存)
- 批量获取 < 3000ms (10个 symbol)
- 减少不必要的 API 调用 (缓存命中)

## 核心设计

### 1. 数据类型定义

```typescript
// src/server/service/unifiedPriceService/types.ts

interface QuoteRequest {
  symbol: string;
  market: MarketType;
}

interface QuoteResponse {
  symbol: string;
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
  cached: boolean;
}

interface FailedQuote {
  symbol: string;
  market: MarketType;
  error: string;
}

interface BatchQuoteResponse {
  succeeded: QuoteResponse[];
  failed: FailedQuote[];
}

interface QuoteOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  timeout?: number;
  retries?: number;
  fallbackAdapter?: string;
}
```

### 2. 适配器基类

```typescript
// src/server/service/adapters/PriceSourceAdapter.ts

abstract class PriceSourceAdapter {
  abstract name: string;
  abstract supportedMarkets: MarketType[];
  abstract supportsBatch: boolean;

  // 单次查询（必须实现）
  abstract fetchQuote(request: QuoteRequest): Promise<QuoteResponse | null>;

  // 批量查询（默认循环调用，子类可重写）
  async fetchBatchQuotes(
    requests: QuoteRequest[]
  ): Promise<BatchQuoteResponse>;

  // 健康检查
  abstract healthCheck(): Promise<boolean>;

  // 更新缓存（由服务层调用）
  protected async persistPrice(
    response: QuoteResponse
  ): Promise<void>;
}
```

### 3. 统一价格服务

```typescript
// src/server/service/unifiedPriceService/index.ts

class UnifiedPriceService {
  private adapterRouter: AdapterRouter;
  private cacheStrategy: CacheStrategy;

  async getQuote(
    symbol: string,
    market: MarketType,
    options: QuoteOptions = {}
  ): Promise<QuoteResponse>;

  async getBatchQuotes(
    requests: QuoteRequest[],
    options: QuoteOptions = {}
  ): Promise<BatchQuoteResponse>;

  async updateAccountPrices(accountId: string): Promise<UpdateStats>;

  async updateMarketPrices(market: MarketType): Promise<UpdateStats>;
}
```

### 4. 缓存策略

```typescript
// src/server/service/unifiedPriceService/cache.ts

interface CacheEntry {
  symbol: string;
  market: MarketType;
  price: number;
  currency: string;
  timestamp: Date;
  ttl: number;
  source: string;
}

abstract class CacheStrategy {
  abstract get(symbol: string, market: MarketType): Promise<CacheEntry | null>;
  abstract set(entry: CacheEntry): Promise<void>;
  abstract invalidate(symbol: string, market: MarketType): Promise<void>;
  abstract isExpired(entry: CacheEntry): boolean;
}

class SameDayPriceCache extends CacheStrategy {
  // 当日缓存实现
  // 如果当天已更新，直接返回
}
```

### 5. 适配器路由器

```typescript
// src/server/service/adapters/AdapterRouter.ts

class AdapterRouter {
  private adapters: Map<MarketType, PriceSourceAdapter[]>;
  private fallbackMap: Map<MarketType, string>;

  // 获取主适配器
  getAdapter(market: MarketType): PriceSourceAdapter;

  // 获取备用适配器
  getFallback(market: MarketType): PriceSourceAdapter | null;

  // 注册适配器
  register(market: MarketType, adapter: PriceSourceAdapter): void;

  // 设置备用适配器
  setFallback(market: MarketType, adapterName: string): void;
}
```

## 项目结构

```text
src/server/service/
├── unifiedPriceService/          # 统一价格服务
│   ├── index.ts                  # 导出和服务入口
│   ├── UnifiedPriceService.ts    # 核心实现
│   ├── cache.ts                  # 缓存策略
│   ├── types.ts                  # 类型定义
│   └── errorHandler.ts           # 错误处理
├── adapters/                     # 数据源适配器
│   ├── PriceSourceAdapter.ts     # 抽象基类
│   ├── FinnhubAdapter.ts         # Finnhub 实现
│   ├── TencentAdapter.ts         # 腾讯接口实现
│   └── AdapterRouter.ts          # 路由器
└── legacy/                       # 旧代码（迁移后删除）
    ├── finnhubService.ts         # 保留一段时间作为回退
    └── tencentUtil.ts
```

## 实现策略

### 阶段划分

1. **阶段 1：基础架构** - 定义类型、适配器基类
2. **阶段 2：适配器实现** - FinnhubAdapter, TencentAdapter
3. **阶段 3：统一服务** - UnifiedPriceService, 缓存策略
4. **阶段 4：迁移** - 逐步替换现有调用
5. **阶段 5：清理** - 删除旧代码

### 数据库兼容性

- 使用现有的 `assetMeta` 表作为缓存层
- 继续使用 `priceService` 进行持久化
- 不修改数据库 schema

### 向后兼容

- `finnhubService.getPrice()` 保持可用
- `finnhubService.batchQuoteByTencent()` 保持可用
- 内部路由到新的 `UnifiedPriceService`
- 计划在稳定版本后弃用旧接口

## 性能考虑

1. **缓存策略**：当日缓存减少外部 API 调用
2. **并发请求**：批量查询时并发调用（当适配器不支持原生批量时）
3. **请求合并**：短时间内相同 symbol 的请求合并处理
4. **超时控制**：每个请求设置超时，避免阻塞
5. **限流保护**：保护外部 API 不被过度调用

## 错误处理

1. **可重试错误**：网络超时、临时不可用（自动重试 2-3 次）
2. **不可重试错误**：无效 symbol、API key 错误（立即返回）
3. **降级策略**：主适配器失败时尝试备用适配器
4. **错误报告**：清晰的错误信息，包含 symbol、market、source

## 测试策略

1. **单元测试**：适配器基类、缓存策略、错误处理
2. **集成测试**：完整的价格获取流程
3. **Mock 测试**：外部 API 使用 mock 数据
4. **性能测试**：验证缓存和批量查询性能

## 安全考虑

1. API key 安全：使用环境变量，不硬编码
2. 限流保护：防止 API 调用过度消耗 quota
3. 输入验证：验证 symbol 格式，防止注入
4. 错误信息：不泄露敏感信息到客户端

## 监控指标

1. 价格获取成功率/失败率
2. 缓存命中率
3. 平均响应时间
4. API 调用量
5. 重试次数