## MODIFIED Requirements

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
- **GIVEN** 系统需要使用腾讯接口作为港股和A股数据源
- **WHEN** 创建 `TencentAdapter` 实例
- **THEN** 适配器必须（MUST）声明支持的市场为 `['HK', 'CN']`
- **THEN** 适配器必须（MUST）声明支持批量查询（`supportsBatch = true`）
- **THEN** 适配器必须（MUST）实现 `fetchQuote()` 方法处理单个 symbol
- **THEN** 适配器必须（MUST）重写 `fetchBatchQuotes()` 方法使用腾讯批量接口

#### Scenario: 腾讯适配器支持基金代码
- **GIVEN** 系统需要获取中国大陆基金（assetType='fund', market='CN'）的净值
- **WHEN** 调用 `fetchQuote({symbol: '110011', market: 'CN', assetType: 'fund'})`
- **THEN** 适配器必须（MUST）使用基金专用前缀生成请求代码（如 `jj110011`）
- **THEN** 适配器必须（MUST）解析基金净值数据并返回人民币价格
- **THEN** 返回的 `QuoteResponse.currency` 必须（MUST）为 `'CNY'`
- **THEN** 返回的 `QuoteResponse.price` 必须（MUST）为 CNY 原始净值，不做 USD 换算

#### Scenario: 适配器路由
- **GIVEN** 系统配置了多个数据源适配器
- **WHEN** 请求美股 US 市场的价格
- **THEN** 路由器必须（MUST）返回优先级最高的支持美股的适配器
- **WHEN** 主适配器返回错误且配置了备用适配器
- **THEN** 路由器必须（MUST）尝试使用备用适配器

## ADDED Requirements

### Requirement: Fund Price Response Currency Preservation
系统 MUST 在基金价格响应中保留原始货币信息，不自动转换为 USD。

#### Scenario: CN 基金返回 CNY 原始价格
- **GIVEN** 请求中国大陆基金的价格，assetType 为 'fund'，market 为 'CN'
- **WHEN** 腾讯适配器成功获取基金净值
- **THEN** `QuoteResponse.price` 必须（MUST）为人民币原始净值（如 1.2345）
- **THEN** `QuoteResponse.currency` 必须（MUST）为 `'CNY'`
- **THEN** 系统必须（MUST）不对该价格进行 `cnyToUsd()` 转换

#### Scenario: 非基金 CN 资产仍然转换为 USD
- **GIVEN** 请求中国大陆股票的价格，assetType 为 'stock'，market 为 'CN'
- **WHEN** 腾讯适配器成功获取价格
- **THEN** `QuoteResponse.price` 必须（MUST）仍然通过 `cnyToUsd()` 转换为美元
- **THEN** 现有行为不受影响
