# price-fetcher Specification

## Purpose
统一的价格获取服务，支持多市场、多数据源的资产价格获取，提供缓存、批量查询、错误重试等能力。

## ADDED Requirements

### Requirement: Unified Price Service Interface
系统 MUST 提供统一的价格获取服务接口 `UnifiedPriceService`，支持单次和批量价格查询，并统一处理缓存、错误和重试逻辑。

#### Scenario: 单次查询美股价格
- **GIVEN** 用户请求获取美股 AAPL 的价格
- **WHEN** 调用 `unifiedPriceService.getQuote('AAPL', 'US')`
- **THEN** 系统必须（MUST）首先检查当日缓存
- **THEN** 如果缓存命中，系统必须（MUST）返回缓存价格并标记 `cached: true`
- **THEN** 如果缓存未命中，系统必须（MUST）调用 Finnhub API 获取最新价格
- **THEN** 系统必须（MUST）将价格保存到缓存并返回

#### Scenario: 批量查询港股价格
- **GIVEN** 用户请求获取港股 00700.HK 和 00941.HK 的价格
- **WHEN** 调用 `unifiedPriceService.batchGetQuote([{symbol: '00700.HK', market: 'HK'}, {symbol: '00941.HK', market: 'HK'}])`
- **THEN** 系统必须（MUST）使用腾讯批量接口一次性获取所有价格
- **THEN** 系统必须（MUST）返回成功列表和失败列表
- **THEN** 如果某个 symbol 查询失败，系统必须（MUST）不影响其他 symbol 的查询
- **THEN** 系统必须（MUST）在返回的 `BatchQuoteResponse.failed` 中精确标识失败的原因

#### Scenario: 强制跳过缓存
- **GIVEN** 用户需要获取最新的实时价格
- **WHEN** 调用 `unifiedPriceService.getQuote('AAPL', 'US', {forceRefresh: true})`
- **THEN** 系统必须（MUST）跳过缓存检查
- **THEN** 系统必须（MUST）直接调用外部 API 获取最新价格
- **THEN** 系统必须（MUST）更新缓存

### Requirement: Price Source Adapter Pattern
系统 MUST 使用适配器模式抽象不同的价格数据源，每个数据源实现统一的 `PriceSourceAdapter` 接口。

#### Scenario: Finnhub 适配器实现
- **GIVEN** 系统需要使用 Finnhub API 作为美股数据源
- **WHEN** 创建 `FinnhubAdapter` 实例
- **THEN** 适配器必须（MUST）声明支持的市场为 `['US', 'CN']`
- **THEN** 适配器必须（MUST）声明不支持批量查询（`supportsBatch = false`）
- **THEN** 适配器必须（MUST）实现 `fetchQuote()` 方法调用 Finnhub quote API
- **THEN** 适配器必须（MUST）实现 `healthCheck()` 方法验证 API key 有效性

#### Scenario: 腾讯适配器实现
- **GIVEN** 系统需要使用腾讯接口作为港股数据源
- **WHEN** 创建 `TencentAdapter` 实例
- **THEN** 适配器必须（MUST）声明支持的市场为 `['HK']`
- **THEN** 适配器必须（MUST）声明支持批量查询（`supportsBatch = true`）
- **THEN** 适配器必须（MUST）实现 `fetchQuote()` 方法处理单个 symbol
- **THEN** 适配器必须（MUST）重写 `fetchBatchQuotes()` 方法使用腾讯批量接口

#### Scenario: 适配器路由
- **GIVEN** 系统配置了多个数据源适配器
- **WHEN** 请求美股 US 市场的价格
- **THEN** 路由器必须（MUST）返回优先级最高的支持美股的适配器
- **WHEN** 主适配器返回错误且配置了备用适配器
- **THEN** 路由器必须（MUST）尝试使用备用适配器

### Requirement: Same-Day Price Cache
系统 MUST 实现当日价格缓存策略，对于当天已更新的价格，直接从缓存返回以减少外部 API 调用。

#### Scenario: 缓存命中场景
- **GIVEN** AAPL 价格在当天已更新并缓存
- **WHEN** 再次调用 `getQuote('AAPL', 'US')`
- **THEN** 系统必须（MUST）在 50ms 内从缓存返回价格
- **THEN** 返回的 `QuoteResponse` 必须包含 `cached: true`
- **THEN** 系统必须（MUST）不调用外部 API

#### Scenario: 缓存过期场景
- **GIVEN** AAPL 价格在昨天已更新缓存
- **WHEN** 调用 `getQuote('AAPL', 'US')`
- **THEN** 系统必须（MUST）识别缓存已过期
- **THEN** 系统必须（MUST）调用外部 API 获取最新价格
- **THEN** 系统必须（MUST）更新缓存

#### Scenario: 缓存失效
- **GIVEN** 用户需要清除指定 symbol 的缓存
- **WHEN** 调用 `invalidate(symbol, market)`
- **THEN** 系统必须（MUST）移除该 symbol 的缓存记录
- **THEN** 下次查询必须（MUST）重新从外部 API 获取价格

### Requirement: Error Handling and Retry
系统 MUST 实现智能的错误处理和重试策略，区分可重试和不可重试错误。

#### Scenario: 可重试错误自动重试
- **GIVEN** API 调用因网络超时失败
- **WHEN** 发生超时错误
- **THEN** 系统必须（MUST）识别此为可重试错误
- **THEN** 系统必须（MUST）最多重试 3 次，每次间隔 1 秒
- **THEN** 重试成功后必须（MUST）返回价格并更新缓存

#### Scenario: 不可重试错误立即返回
- **GIVEN** API 调用因无效 symbol 失败
- **WHEN** API 返回 "symbol not found" 错误
- **THEN** 系统必须（MUST）识别此为不可重试错误
- **THEN** 系统必须（MUST）不进行重试，立即返回错误
- **THEN** 错误信息必须（MUST）包含具体的失败原因

#### Scenario: 批量查询的精确错误报告
- **GIVEN** 批量查询 10 个港股价格
- **WHEN** 其中 2 个查询失败，8 个成功
- **THEN** 系统必须（MUST）在 `BatchQuoteResponse.succeeded` 中返回 8 个成功的 `QuoteResponse`
- **THEN** 系统必须（MUST）在 `BatchQuoteResponse.failed` 中返回 2 个 `FailedQuote`，每个包含具体的错误信息
- **THEN**失败的 symbol 必须不影响成功的 symbol

### Requirement: Account Price Update
系统 MUST 支持按账户或市场批量更新价格，并为更新操作提供详细的统计信息。

#### Scenario: 按账户更新所有持仓价格
- **GIVEN** 账户 A 有 5 个美股持仓和 3 个港股持仓
- **WHEN** 调用 `unifiedPriceService.updateAccountPrices('account-a')`
- **THEN** 系统必须（MUST）查询账户所有当前持仓
- **THEN** 系统必须（MUST）分别调用美股和港股适配器获取价格
- **THEN** 系统必须（MUST）返回 `UpdateStats` 包含总体统计和分市场统计
- **THEN** `UpdateStats` 必须包含：`\{total: 8, succeeded: 成功数, failed: 失败列表, byMarket: {US: {attempted, succeeded, failed}, HK: {...}}\}`

#### Scenario: 按市场更新所有账户的特定市场持仓
- **GIVEN** 系统有多个账户，每个账户都有美股持仓
- **WHEN** 调用 `unifiedPriceService.updateMarketPrices('US')`
- **THEN** 系统必须（MUST）查询所有账户的美股持仓
- **THEN** 系统必须（MUST）批量获取所有美股持仓的价格
- **THEN** 系统必须（MUST）返回更新统计信息

### Requirement: Backward Compatibility
系统 MUST 保持与现有 API 的向后兼容性，允许逐步迁移。

#### Scenario: 旧 API 继续可用
- **GIVEN** 现有代码调用 `finnhubService.getPrice(symbol, market)`
- **WHEN** 调用此方法
- **THEN** 方法必须（MUST）正常工作
- **THEN** 内部可以（CAN）路由到新的 `UnifiedPriceService`
- **THEN** 返回值的格式必须（MUST）与原有实现保持一致

#### Scenario: 旧批量 API 继续可用
- **GIVEN** 现有代码调用 `finnhubService.batchQuoteByTencent(hkPositions)`
- **WHEN** 调用此方法
- **THEN** 方法必须（MUST）正常工作
- **THEN** 返回值的格式必须（MUST）与原有实现保持一致