# 数据模型：AI 仓位管理器

## 实体

### 持仓资产

代表用户投资组合中的各类资产。

**字段：**

- `id` (string, 必填): 资产的唯一标识符
- `symbol` (string, 必填): 资产代码/符号
- `name` (string, 必填): 资产名称
- `type` (string, 必填): 资产类型 ("stock" | "etf" | "mutualFund" | "bond" | "convertibleBond" | "bankWealth" | "cash")
- `quantity` (number, 必填): 持有数量
- `averageCost` (number, 必填): 平均成本价
- `currentPrice` (number, 必填): 当前市场价格
- `marketValue` (number, 必填): 当前市值 (数量 * 当前价格)
- `unrealizedPnL` (number, 必填): 未实现盈亏
- `unrealizedPnLPercentage` (number, 必填): 未实现盈亏百分比
- `weight` (number, 必填): 在投资组合中的权重百分比
- `sector` (string, 可选): 所属行业/板块
- `exchange` (string, 可选): 交易所代码
- `currency` (string, 必填): 货币代码 (默认: "CNY")
- `lastUpdated` (Date, 必填): 最后更新时间戳

**验证规则：**

- 数量必须为非负数
- 平均成本必须为正数
- 当前价格必须为正数
- 权重必须在0到100之间
- 资产类型必须是允许的值之一

### 投资组合

代表用户的完整投资组合。

**字段：**

- `id` (string, 必填): 投资组合的唯一标识符
- `userId` (string, 必填): 关联的用户ID
- `totalValue` (number, 必填): 投资组合总市值
- `totalNonCashValue` (number, 必填): 非现金资产总市值
- `cashValue` (number, 必填): 现金资产总市值
- `concentrationRiskScore` (number, 必填): 集中度风险评分 (0-100)
- `correlationRiskScore` (number, 必填): 相关性风险评分 (0-100)
- `liquidityRiskScore` (number, 必填): 流动性风险评分 (0-100)
- `allocationRiskScore` (number, 必填): 资产配置风险评分 (0-100)
- `overallRiskScore` (number, 必填): 总体风险评分 (0-100)
- `riskLevel` (string, 必填): 风险等级 ("low" | "medium" | "high")
- `lastUpdated` (Date, 必填): 最后更新时间戳
- `riskMode` (string, 必填): 风险评估模式 ("retail" | "advanced")

**验证规则：**

- 所有风险评分必须在0到100之间
- 风险等级必须是允许的值之一
- 风险评估模式必须是允许的值之一

### 风险洞察

代表特定时间点的风险洞察数据。

**字段：**

- `id` (string, 必填): 风险洞察的唯一标识符
- `portfolioId` (string, 必填): 关联的投资组合ID
- `timestamp` (Date, 必填): 洞察生成时间戳
- `concentrationData` (object, 必填): 集中度数据
  - `topAssets` (array, 必填): 前N个资产的集中度信息
  - `singleAssetThreshold` (number, 必填): 单一资产阈值百分比
  - `concentrationAlerts` (array, 必填): 集中度预警信息
- `allocationData` (object, 必填): 资产配置数据
  - `categoryAllocation` (array, 必填): 大类资产配置比例
  - `allocationAlerts` (array, 必填): 资产配置预警信息
- `correlationData` (object, 必填): 相关性数据
  - `correlationMatrix` (array, 必填): 相关性矩阵
  - `highCorrelationPairs` (array, 必填): 高相关性资产对
  - `correlationAlerts` (array, 必填): 相关性预警信息
- `liquidityData` (object, 必填): 流动性数据
  - `liquidityScores` (array, 必填): 各资产流动性评分
  - `liquidityAlerts` (array, 必填): 流动性预警信息
- `strategySuggestions` (array, 必填): 策略建议

**验证规则：**

- 所有数据对象必须包含必要的字段
- 时间戳必须是有效的日期时间

### 历史风险数据

代表历史风险评分数据，用于趋势分析。

**字段：**

- `id` (string, 必填): 历史数据的唯一标识符
- `portfolioId` (string, 必填): 关联的投资组合ID
- `date` (Date, 必填): 数据日期
- `concentrationRiskScore` (number, 必填): 集中度风险评分
- `correlationRiskScore` (number, 必填): 相关性风险评分
- `liquidityRiskScore` (number, 必填): 流动性风险评分
- `allocationRiskScore` (number, 必填): 资产配置风险评分
- `overallRiskScore` (number, 必填): 总体风险评分

**验证规则：**

- 所有风险评分必须在0到100之间
- 日期必须是有效的日期

### 分散建议

代表系统生成的分散投资建议。

**字段：**

- `id` (string, 必填): 建议的唯一标识符
- `portfolioId` (string, 必填): 关联的投资组合ID
- `generatedAt` (Date, 必填): 建议生成时间
- `totalAmount` (number, 必填): 建议分散投资的总金额
- `recommendations` (array, 必填): 具体推荐项列表
  - `assetId` (string, 必填): 推荐资产ID
  - `assetSymbol` (string, 必填): 推荐资产代码
  - `assetName` (string, 必填): 推荐资产名称
  - `amount` (number, 必填): 建议投资金额
  - `correlation` (number, 必填): 与现有投资组合的相关性
  - `liquidityScore` (number, 必填): 流动性评分
  - `reason` (string, 必填): 推荐理由
- `rationale` (string, 必填): 整体推荐理由
- `isAccepted` (boolean, 可选): 用户是否接受建议
- `acceptedAt` (Date, 可选): 用户接受建议的时间

**验证规则：**

- 建议金额必须为正数
- 推荐项列表不能为空
- 相关性必须在-1到1之间
- 流动性评分必须在0到100之间

## 关系

1. **用户** → **投资组合** (1:1)
   - 每个用户拥有一个投资组合
   - 每个投资组合只属于一个用户

2. **投资组合** → **持仓资产** (1:N)
   - 一个投资组合可以包含多个持仓资产
   - 每个持仓资产只属于一个投资组合

3. **投资组合** → **风险洞察** (1:N)
   - 一个投资组合可以有多个风险洞察记录(不同时点)
   - 每个风险洞察只属于一个投资组合

4. **投资组合** → **历史风险数据** (1:N)
   - 一个投资组合可以有多个历史风险数据记录(不同日期)
   - 每个历史风险数据记录只属于一个投资组合

5. **投资组合** → **分散建议** (1:N)
   - 一个投资组合可以有多个分散建议
   - 每个分散建议只属于一个投资组合

## 状态转换

### 风险等级状态

- `low` → `medium`: 风险评分超过中等阈值
- `medium` → `high`: 风险评分超过高风险阈值
- `high` → `medium`: 风险评分降低到中等阈值以下
- `medium` → `low`: 风险评分降低到低风险阈值以下

### 风险评估模式

- `retail` ↔ `advanced`: 用户在两种模式之间切换

## 数据流

1. **数据收集**:
   - 系统从资产管理系统获取用户的持仓数据
   - 系统从市场数据API获取实时价格信息
   - 系统定期更新持仓资产的市场价值

2. **风险计算**:
   - 系统计算各项风险指标(集中度、相关性、流动性、资产配置)
   - 系统生成风险洞察报告
   - 系统更新历史风险数据

3. **建议生成**:
   - 当风险超过阈值时，系统生成分散建议
   - 系统基于相关性和流动性等因素推荐合适的投资标的

4. **数据存储**:
   - 所有数据在浏览器的IndexedDB中本地存储
   - 敏感数据在存储前进行加密处理