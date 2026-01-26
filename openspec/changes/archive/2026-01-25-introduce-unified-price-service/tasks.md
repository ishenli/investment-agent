# 任务：统一价格获取服务重构

**输入**：来自 `plan.md` 的技术设计文档
**前置条件**：plan.md，proposal.md
**测试**：
- 代码检查：`npm run lint`
- 类型检查：`npx tsc --noEmit`

**组织方式**：任务按阶段分组，支持增量交付和验证。

## 架构职责说明

```
┌─────────────────────────────────────────────────────────┐
│  UnifiedPriceService (新增 - 业务逻辑层)                    │
│  - 缓存策略决策                                             │
│  - 适配器路由选择                                           │
│  - 错误重试/降级                                           │
│  └─ 调用 priceService 持久化结果                           │
└─────────────────────────────────────────────────────────┘
                            ▲
                    ┌───────┴────────┐
                    │ 协作关系          │
                ┌───┴────┴───────┐
                ▼                ▼
┌──────────────────┐  ┌──────────────────────────────────────┐
│  地源适配器        │  │  priceService.ts (现有 - 持久化层)    │
│ - FinnhubAdapter  │  │ - getLatestPrice()   查询缓存        │
│ - TencentAdapter  │  │ - updatePrice()      保存价格        │
│ - AdapterRouter   │  │ - batchUpdatePrices() 批量更新        │
└──────────────────┘  └──────────────────────────────────────┘
```

**关键原则**：
- `UnifiedPriceService` **不直接操作数据库**，所有持久化通过 `priceService`
- `priceService` 保持现有接口不变，继续作为唯一的 DB 访问点
- 适配器返回价格后，通过 `UnifiedPriceService` 调用 `priceService.updatePrice()` 保存

## 格式说明
- **[P]**：可以并行运行
- **[US]**：关联的用户故事（US1-统一接口, US2-适配器, US3-缓存）

---

## 第1阶段：基础架构（共享基础设施）

### 目的
定义核心类型和适配器基础，不依赖任何实现细节。

### 实现任务

- [x] T001 在 `src/server/service/unifiedPriceService/types.ts` 中定义核心类型
  - 定义 `QuoteRequest`, `QuoteResponse`, `FailedQuote`
  - 定义 `BatchQuoteResponse`, `QuoteOptions`
  - **注意**：类型设计要考虑与现有 `priceService` 的兼容性 🔹 id: 101

- [x] T002 在 `src/server/service/adapters/PriceSourceAdapter.ts` 中创建适配器抽象基类
  - 定义 `PriceSourceAdapter` 抽象类
  - 定义 `fetchQuote()` 抽象方法（只负责调用外部 API）
  - 实现 `fetchBatchQuotes()` 默认方法（循环调用）
  - 定义 `healthCheck()` 抽象方法
  - **移除** `persistPrice()` 方法（持久化由 UnifiedPriceService 调用 priceService 处理）🔹 id: 102

- [x] T003 在 `src/server/service/adapters/AdapterRouter.ts` 中创建路由器
  - 定义 `AdapterRouter` 类
  - 实现 `getAdapter()` 方法
  - 实现 `register()` 方法
  - 实现 `supports()` 方法 🔹 id: 103

**检查点**：类型定义和抽象基类就绪，可以开始实现具体适配器

---

## 第2阶段：适配器实现（US2）

### 目的
实现具体的数据源适配器，将现有逻辑迁移到适配器架构。

### 实现任务

- [x] T004 [P] 在 `src/server/service/adapters/FinnhubAdapter.ts` 中实现 Finnhub 适配器
  - 继承 `PriceSourceAdapter`
  - 实现 `name = 'finnhub'`，`supportedMarkets = ['US', 'CN']`
  - 实现 `supportsBatch = false`
  - 实现 `fetchQuote()` - 迁移现有 `getQuoteByFinnhub()` 逻辑
  - **注意**：移除原有的持久化代码，只保留 API 调用逻辑（finnhubService.ts:58-122）
  - 实现 `healthCheck()` - 检查 API key 和连接 🔹 id: 104

- [x] T005 [P] 在 `src/server/service/adapters/TencentAdapter.ts` 中实现腾讯适配器
  - 继承 `PriceSourceAdapter`
  - 实现 `name = 'tencent'`，`supportedMarkets = ['HK']`
  - 实现 `supportsBatch = true`
  - 实现 `fetchQuote()` - 单个查询（如果腾讯支持单次）
  - 重写 `fetchBatchQuotes()` - 使用批量接口（迁移 finnhubService.ts:190-227 的逻辑）
  - **注意**：移除原有的 priceService.batchUpdatePrices 调用，只返回原始价格数据
  - 实现 `healthCheck()` - 检查接口可用性 🔹 id: 105

- [x] T006 在 `src/server/service/adapters/index.ts` 中创建适配器注册入口
  - 导出所有适配器类
  - 创建 `createDefaultRouter()` 工厂函数
  - 设置主适配器和备用适配器映射 🔹 id: 106

**检查点**：适配器层就绪，适配器只负责调用外部 API，不涉及持久化

---

## 第3阶段：缓存策略（US3）

### 目的
实现统一的缓存策略，减少外部 API 调用。

### 实现任务

- [x] T007 在 `src/server/service/unifiedPriceService/cache.ts` 中实现缓存层
  - 定义 `SameDayPriceCache` 类
  - 实现 `get(symbol, market)` 方法 - **调用 `priceService.getLatestPrice(symbol)`**
  - 实现 `isValidForToday(timestamp)` 方法 - 使用 dayjs 判断是否当日
  - 实现 `save(symbol, price, currency, source, market)` 方法 - 调用 `priceService.updatePrice()`
  - **注意**：缓存存储使用现有的 `assetMeta` 表，通过 `priceService` 访问 🔹 id: 107

- [x] T008 在 `src/server/service/unifiedPriceService/cache.ts` 中添加缓存辅助方法
  - `invalidateCache(symbol, market)` - 清除指定缓存（当前为空实现，因为没有删除 API）🔹 id: 108

**检查点**：缓存层通过 priceService 与数据库交互，功能完整

---

## 第4阶段：错误处理（US2）

### 目的
实现统一的错误处理和重试策略。

### 实现任务

- [x] T009 在 `src/server/service/unifiedPriceService/errorHandler.ts` 中创建错误处理器
  - 定义可重试错误类型（网络超时、临时不可用）
  - 定义不可重试错误类型（无效 symbol、认证失败）
  - 实现 `withRetry<T>(fn, options)` 方法
  - 实现 `isRetryable(error)` 判断方法
  - 实现 `handleIndividualFailure()` 和 `handleBatchFailure()` 🔹 id: 109

**检查点**：错误处理逻辑可以独立测试

---

## 第5阶段：统一价格服务（US1）

### 目的
实现核心的 `UnifiedPriceService` 整合所有组件，**注意其与 `priceService` 的协作关系**。

### 实现任务

- [x] T010 在 `src/server/service/unifiedPriceService/UnifiedPriceService.ts` 中创建核心服务
  - 定义 `UnifiedPriceService` 类
  - 导入 `priceService` 用于持久化操作
  - 初始化 `AdapterRouter` 和 `SameDayPriceCache`
  - 实现 `getQuote()` 方法：
    - 先调用 `cache.get()` 查询缓存
    - 如果缓存命中直接返回
    - 否则通过适配器获取价格，然后调用 `priceService.updatePrice()` 保存
  - 实现 `batchGetQuote()` 方法：
    - 支持批量查询和精确错误报告
    - 成功的价格通过 `priceService.batchUpdatePrices()` 持久化
  - 实现 `updateAccountPrices()` 方法 🔹 id: 110

- [x] T011 [P] 在 `src/server/service/unifiedPriceService/UnifiedPriceService.ts` 中添加账户/市场方法
  - 实现 `updateMarketPrices(market)` 方法
  - 实现 `getAllQuotesForAccount(accountId)` 辅助方法
  - **注意**：与现有的 `InitController` 逻辑保持兼容 🔹 id: 111

- [x] T012 在 `src/server/service/unifiedPriceService/index.ts` 中创建服务入口
  - 导出 `UnifiedPriceService` 和相关类型
  - 创建单例实例 `unifiedPriceService`
  - **不导出** priceService 避免混淆 🔹 id: 112

**检查点**：UnifiedPriceService 整合完成，正确协作 priceService

---

## 第6阶段：迁移现有代码（US1-US3）

### 目的
逐步替换现有调用点，确保兼容性。

### 实现任务

- [x] T013 更新 `src/server/controller/init.ts` 使用 `UnifiedPriceService`
  - 导入 `unifiedPriceService`
  - 替换 `finnhubService.getPrice()` 为 `unifiedPriceService.getQuote()`
  - **替换** `finnhubService.batchQuoteByTencent()` 为 `unifiedPriceService.batchGetQuote()`
  - 确认 `UpdateStats` 返回格式保持一致（包括 byMarket 统计）🔹 id: 113

- [x] T014 更新 `src/server/service/finnhubService.ts` 作为兼容层
  - **保留** `getPrice()` 方法 - 内部路由到 `unifiedPriceService.getQuote()`
  - **保留** `batchQuoteByTencent()` 方法 - 内部路由到 `unifiedPriceService.batchGetQuote()`
  - 移除这些方法的原有实现逻辑（已被适配器接管）
  - 添加顶部注释说明兼容层用途和保留的历史数据功能 🔹 id: 114

- [x] T015 更新 `src/app/api/asset/price/route.ts` 使用 UnifiedPriceService
  - PUT 端点：将 `finnhubService.batchQuoteByTencent()` 替换为 `unifiedPriceService.getQuote()`
  - 查看 `priceService.getLatestPrice()` 是否仍被使用（GET/POST 端点）通过 priceService 查询缓存 🔹 id: 115

**检查点**：迁移完成，现有功能保持兼容，priceService 接口不变

---

## 第7阶段：dataflows 目录重构（新增）

### 目的
清理 dataflows 目录混乱的状态，统一数据流处理。

### 实现任务

- [x] T016 创建 `src/server/service/stockDataService/formatters/MarkdownFormatter.ts`
  - 定义 `formatQuote()` - 格式化实时报价为 Markdown
  - 定义 `formatDetailedQuote()` - 格式化含详情的报价
  - 定义 `formatHistory()` - 格式化历史行情为 Markdown
  - 定义 `formatError()` - 格式化错误信息为 Markdown
  - 导出接口类型（`CandleData`, `CompanyProfile`, `FormattedQuoteData`, `FormattedHistoryData`）🔹 id: 116

- [x] T017 创建 `src/server/service.historyService/HistoryService.ts`
  - 迁移 `finnhubService.getCandles()` 功能
  - 实现 `getCandleDataForDateRange()` - 获取日期范围内的统计
  - 实现 `getHistoricalPrices()` - 从数据库查询历史价格
  - 实现 `syncHistoricalData()` - 同步历史数据到数据库
  - 实现 `saveHistoricalPrices()` - 保存历史价格
  - 实现 `getHistoricalPrice()` - 获取特定日期的历史价格
  - 实现 `healthCheck()` - 检查 Finnhub API 可用性 🔹 id: 117

- [x] T018 创建 `src/server/service.stockDataService/StockDataService.ts`
  - 整合 `UnifiedPriceService`、`HistoryService`、`MarkdownFormatter`、`cacheManager`
  - 实现 `getStockData()` - 智能路由（<1天用实时报价，>1天用历史数据）
  - 实现 `fetchRealTimeData()` - 获取实时报价（调用 unifiedPriceService）
  - 实现 `fetchHistoricalData()` - 获取历史行情（调用 historyService）
  - 实现 `getCompanyProfile()` - 获取公司档案
  - 实现 API 限流机制 🔹 id: 118

- [x] T019 更新 `src/server/core/tools/stock/stockGetPrice.ts` 使用 StockDataService
  - 删除对 `getUsStockDataCached` 和 `getHkStockDataCached` 的调用
  - 简化 `getMarketType` 实现以支持中国市场（CN）
  - 使用 `getStockData()` 替代原有调用
  - 导入 `MarketType` 类型来自 `@typings/asset` 🔹 id: 119

- [x] T020 更新 `src/server/core/utils/stockUtils/validator.ts` 使用 StockDataService
  - 删除对 `getUsStockDataCached` 的调用
  - 修复 `MarketType` 命名冲突（改为 `MarketTypeConstant` 和 `AssetMarketType`）
  - 使用 `getStockData()` 替代原有调用
  - 在 `prepareUsStockData()` 中调用新的 API 🔹 id: 120

- [x] T021 删除冗余文件
  - 删除 `src/server/dataflows/optimizedUsData.ts`
  - 删除 `src/server/dataflows/optimizedHkData.ts`
  - 保留 `cacheManager.ts`（大文本缓存）
  - 保留 `finnhubUtil.ts` 和 `tencentUtil.ts`（API 封装）🔹 id: 121

**检查点**：dataflows 目录清理完成，数据流清晰统一

---

## 第8阶段：测试与验证（可选）

### 目的
确保新实现正确且性能符合预期。

### 实现任务

- [ ] T022 [P] 在 `src/server/service/adapters/__tests__/` 中添加适配器单元测试
  - 测试 `FinnhubAdapter.fetchQuote()` - Mock Finnhub API 调用
  - 测试 `TencentAdapter.fetchQuote()` 和 `fetchBatchQuotes()` - Mock 腾讯接口
  - 测试 `AdapterRouter` 路由逻辑 🔹 id: 122

- [ ] T023 [P] 在 `src/server/service/unifiedPriceService/__tests__/` 中添加服务集成测试
  - **Mock** `priceService` 来测试缓存逻辑
  - 测试缓存命中/未命中场景
  - 测试错误重试逻辑
  - 测试批量查询精确错误报告
  - 测试降级策略 🔹 id: 123

- [ ] T024 集成测试：完整的价格更新流程
  - 测试 `api/init` 端点
  - 验证美股/港股混合场景
  - 验证失败后的错误报告
  - **验证** `priceService` 被正确调用持久化数据 🔹 id: 124

- [ ] T025 性能测试和基准测量
  - 测量缓存命中场景的响应时间（目标 < 50ms）
  - 测量批量查询性能（10, 50, 100 symbols）
  - 对比迁移前后的性能
  - 确认数据库调用次数合理 🔹 id: 125

**检查点**：所有测试通过，性能符合预期

---

## 第9阶段：完善与清理（待完成）

### 目的
代码质量提升和文档完善。

### 实现任务

- [ ] T026 执行 `npm run lint` 并修复所有问题 🔹 id: 126

- [x] T027 执行 `npx tsc --noEmit` 并修复类型问题 🔹 id: 127

- [ ] T028 添加 JSDoc 注释到公共 API
  - 特别注明 UnifiedPriceService 和 priceService 的职责分工
  - 标注 finnhubService 的弃用方法 🔹 id: 128

- [ ] T029 更新文档说明新架构
  - 添加架构说明文档
  - 说明如何添加新的适配器
  - 说明如何配置缓存策略 🔹 id: 129

**检查点**：代码质量检查通过，文档完善

---

## 依赖关系与执行顺序

### 阶段依赖关系

| 阶段 | 依赖 | 说明 | 状态 |
|------|------|------|------|
| 第1阶段 | 无 | 可以立即开始 | ✅ 完成 |
| 第2阶段 | 第1阶段 | 需要适配器基类 | ✅ 完成 |
| 第3阶段 | 第1阶段 | 需要类型定义，依赖 priceService | ✅ 完成 |
| 第4阶段 | 第2阶段 | 需要知道适配器返回的 error 类型 | ✅ 完成 |
| 第5阶段 | 第2-4阶段 | 适配器、缓存、错误处理都就绪 | ✅ 完成 |
| 第6阶段 | 第5阶段 | 核心服务完成后才能迁移 | ✅ 完成 |
| 第7阶段 | 第5-6阶段 | 服务和迁移完成后才能重构 | ✅ 完成 |
| 第8阶段 | 第7阶段 | 重构完成后才能测试 | ⏳ 待完成 |
| 第9阶段 | 第8阶段 | 测试通过后完善 | ⏳ 待完成 |

### 并行机会

- T001, T002, T003 可以并行（基础架构的不同文件）
- T004, T005 可以并行（不同的适配器）
- T010, T011 可以并行（同一个文件的不同方法）
- T022, T023 可以并行（不同的测试文件）

### 关键路径

T001 → T002 → T004 → T010 → T013 → T024

（基础架构 → 适配器 → 服务 → 迁移 → 集成测试）

### 关键集成点

1. **适配器 → 统一服务**：适配器返回原始价格，服务调用 priceService 持久化
2. **缓存 → priceService**：缓存层通过 priceService.getLatestPrice() 查询
3. **统一服务 → priceService**：获取价格后调用 priceService.updatePrice() 保存
4. **旧代码兼容**：finnhubService 路由到 unifiedPriceService
5. **新服务层**：StockDataService 整合实时/历史数据，MarkdownFormatter 统一输出格式