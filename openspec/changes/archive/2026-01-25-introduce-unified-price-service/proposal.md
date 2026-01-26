# 统一价格获取服务重构

## Why

当前系统中，美股和港股的价格获取逻辑存在显著差异：

1. **API 调用方式不统一**：美股使用 Finnhub API 逐个获取，港股使用腾讯接口批量获取
2. **缓存机制不一致**：美股有当日缓存机制，港股没有
3. **错误处理粒度不同**：美股单个失败不影响其他，港股批量失败时全部标记失败
4. **扩展性不足**：新增市场或资产类型需要大量重复代码，难以维护
5. **dataflows 目录混乱**：重复的缓存逻辑、职责不清的模块、难以维护的数据流

## What Changes

### 统一价格服务层
- 新增 `UnifiedPriceService` 统一的价格服务接口
- 统一的 `getQuote()` 和 `batchGetQuote()` 方法
- 统一的缓存策略配置（当日缓存）

### 数据源适配器层
- 新增 `PriceSourceAdapter` 抽象基类
- 实现 `FinnhubAdapter`（美股及其他 Finnhub 支持的市场）
- 实现 `TencentAdapter`（港股）
- 实现 `AdapterRouter` 用于路由和主备切换

### 股票数据服务层 (新增)
- 新增 `StockDataService` - 为 LLM Tools 提供统一的股票数据获取接口
- 新增 `HistoryService` - 历史数据专用服务（从 finnhubService 迁移）
- 新增 `MarkdownFormatter` - 统一的 Markdown 格式化器

### 错误处理改进
- 统一的单点/批量错误处理机制
- 批量查询时精确区分成功/失败的单个 symbol
- 支持重试和降级策略

### dataflows 目录重构
- 删除 `optimizedUsData.ts` 和 `optimizedHkData.ts`
- 保留 `cacheManager.ts`（大文本缓存）
- 保留 `finnhubUtil.ts` 和 `tencentUtil.ts`（API 封装）

### 迁移现有代码
- 重构 `InitController` 使用新的 `UnifiedPriceService`
- 重构 `stockGetPrice.ts` 使用 `StockDataService`
- 重构 `asset/price/route.ts` 使用 `unifiedPriceService`
- `finnhubService` 作为兼容层和历史数据功能保持不变

## Impact

### Affected Specs
- `price-fetcher` - 统一价格获取能力

### Affected Code
- `src/server/controller/init.ts` - 使用统一服务
- `src/server/core/tools/stock/stockGetPrice.ts` - 使用 StockDataService
- `src/server/core/utils/stockUtils/validator.ts` - 使用 StockDataService
- `src/app/api/asset/price/route.ts` - 使用 unifiedPriceService
- `src/server/service/finnhubService.ts` - 保留为兼容层 + 历史数据

### New Files
- `src/server/service/unifiedPriceService/` - 统一价格服务
  - `UnifiedPriceService.ts`
  - `types.ts`
  - `cache.ts`
  - `errorHandler.ts`
  - `index.ts`
- `src/server/service/adapters/` - 数据源适配器
  - `PriceSourceAdapter.ts`
  - `FinnhubAdapter.ts`
  - `TencentAdapter.ts`
  - `AdapterRouter.ts`
  - `index.ts`
- `src/server/service/stockDataService/` - LLM 数据服务
  - `StockDataService.ts`
  - `formatters/MarkdownFormatter.ts`
  - `formatters/index.ts`
  - `index.ts`
- `src/server/service/historyService/` - 历史数据服务
  - `HistoryService.ts`
  - `index.ts`

### Deleted Files
- `src/server/dataflows/optimizedUsData.ts`
- `src/server/dataflows/optimizedHkData.ts`

### Breaking Changes
- `optimizedUsData.ts` 和 `optimizedHkData.ts` 已删除，调用方已迁移
- `finnhubService.getPrice()` 和 `batchQuoteByTencent()` 内部实现已迁移

### Non-Breaking Changes
- `finnhubService` 保留为兼容层，现有调用不受影响
- 历史数据相关功能（`getCandles`, `syncHistoricalData`）继续保留在 `finnhubService`
- 可以逐步迁移，不需要一次性替换所有调用点

### Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| 大规模重构可能引入 bug | 逐步迁移，保留旧代码作为回退方案 |
| 性能可能降低 | 先验证性能指标，必要时优化 |
| 批量 API 调用成本增加 | 监控 API 调用量，考虑限流策略 |

### Benefits
- 新增市场/数据源只需实现适配器接口
- 统一的缓存策略提升整体性能
- 精确的错误报告便于调试
- 代码结构清晰，易于维护和测试
- 统一的 Markdown 格式化输出
- 服务职责单一，职责清晰分离

## New Architecture

```
                                    ┌─────────────────────────────────────────┐
                                    │              应用层                       │
                                    │  - API Controllers                     │
                                    │  - LLM Tools (stockGetPriceTool)        │
                                    └──────────────────┬──────────────────────┘
                                                       │
                       ┌───────────────────────────────┼───────────────────────┐
                       │                               │                       │
                       ▼                               ▼                       ▼
              ┌────────────────┐            ┌─────────────────┐    ┌──────────────────┐
              │ PriceService   │            │ StockDataService│    │ HistoryService   │
              │ (价格 CRUD)    │            │ (LLM数据提供器)  │    │ (历史行情)        │
              └────────────────┘            └─────────────────┘    └──────────────────┘
                       │                               │                       │
                       │                               ▼                       │
                       │                    ┌─────────────────┤               │
                       │                    │ MarkdownFormatter│               │
                       │                    │ (格式化输出)      │               │
                       │                    └─────────┬───────┤               │
                       │                              │                       │
                       └───────────────┬──────────────┘                       │
                                       ▼                                      │
                              ┌────────────────────────┐                      │
                              │ UnifiedPriceService   │◄─────────────────────┘
                              │ (统一价格获取)         │
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                      │
                    ▼                     ▼                      ▼
           ┌────────────────┤    ┌─────────────────┤   ┌─────────────────┤
           │ SameDayCache   │    │ AdapterRouter   │   │ ErrorHandlers   │
           │ (缓存层)       │    │ (适配器路由)     │   │ (错误处理)       │
           └────────────────┘    └────────┬────────┘   └─────────────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────┐
          │                              │                          │
          ▼                              ▼                          ▼
  ┌────────────────┤            ┌─────────────────┤      ┌─────────────────┤
  │ FinnhubAdapter │            │ TencentAdapter  │      │ (新适配器)      │
  │ (US/CN实时)    │            │ (HK实时)         │      │                │
  └────────────────┘            └─────────────────┘      └─────────────────┘

  finnhubService (历史数据专用)
  - getCandles()
  - syncHistoricalData()
  - getHistoricalPrice()
```

## Updated Directory Structure

```
src/server/service/
├── unifiedPriceService/          # 统一价格服务
│   ├── UnifiedPriceService.ts
│   ├── types.ts
│   ├── cache.ts
│   ├── errorHandler.ts
│   └── index.ts
│
├── adapters/                     # 数据源适配器
│   ├── PriceSourceAdapter.ts
│   ├── FinnhubAdapter.ts
│   ├── TencentAdapter.ts
│   ├── AdapterRouter.ts
│   └── index.ts
│
├── stockDataService/             # LLM 数据服务
│   ├── StockDataService.ts
│   ├── formatters/
│   │   ├── MarkdownFormatter.ts
│   │   └── index.ts
│   └── index.ts
│
├── historyService/               # 历史数据服务
│   ├── HistoryService.ts
│   └── index.ts
│
└── finnhubService.ts             # 兼容层 + 历史数据

src/server/dataflows/
├── cacheManager.ts               # 保留：文件缓存（大文本数据）
├── finnhubUtil.ts                # 保留：Finnhub SDK 封装
├── tencentUtil.ts                # 保留：腾讯 API 封装
├── akshare.ts                    # 保留：A股数据源
└── (optimized*Data.ts 已删除)    # 已迁移到 stockDataService
```

## Status

### Completed ✅
- [x] Phase 1: 基础架构（类型定义、适配器基类、路由器）
- [x] Phase 2: 适配器实现（FinnhubAdapter、TencentAdapter）
- [x] Phase 3: 缓存策略（SameDayPriceCache）
- [x] Phase 4: 错误处理（isRetryable、withRetry、错误处理器）
- [x] Phase 5: 统一价格服务（UnifiedPriceService）
- [x] Phase 6: 迁移现有代码（init.ts、finnhubService.ts compatibility layer）
- [x] dataflows 重构（创建 StockDataService、HistoryService）
- [x] 类型检查通过
- [x] 删除优化冗余文件（optimizedUsData.ts、optimizedHkData.ts）

### Pending (Optional)
- [ ] Phase 7: 单元测试
- [ ] Phase 8: 集成测试
- [ ] Phase 9: 性能基准测试
- [ ] Phase 10: 文档完善（JSDoc 注释）