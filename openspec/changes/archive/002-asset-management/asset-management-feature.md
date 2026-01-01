# 资产管理功能文档

## 功能概述

资产管理功能允许用户管理其虚拟交易资产，包括创建交易账户、管理持仓、查看交易历史和分析业绩表现。该模块与基础账户管理分离，专注于用户的金融资产相关操作。

## 功能详情

### 用户场景

1. 用户已拥有基础账户，需要创建交易账户开始虚拟交易
2. 用户需要查看和管理其持有的股票仓位
3. 用户希望查看交易历史记录以分析交易行为
4. 用户需要查看账户业绩表现以评估投资策略

### 核心流程

1. 用户创建交易账户并设置初始参数
2. 用户执行买入/卖出操作，系统更新持仓
3. 用户查看交易历史记录
4. 系统定期计算并展示业绩指标

## API 接口规范

### 创建交易账户接口

**Endpoint**: `POST /api/asset/account`

**请求体 (Request Body)**:

```json
{
  "userId": "string", // 关联的用户ID (必填)
  "initialDeposit": "number", // 初始资金 (必填)
  "accountName": "string", // 账户名称 (可选)
  "market": "string", // 市场类型 (可选，默认: 美股)
  "leverage": "number" // 杠杆比例 (可选，默认: 1)
}
```

**成功响应 (Status 201)**:

```json
{
  "id": "string",
  "userId": "string",
  "accountName": "string",
  "balance": "number",
  "currency": "string",
  "leverage": "number",
  "market": "string",
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "isActive": "boolean"
}
```

### 获取账户详情接口

**Endpoint**: `GET /api/asset/account/{accountId}`

**路径参数**:

- `accountId`: 交易账户ID

**成功响应 (Status 200)**:

```json
{
  "id": "string",
  "userId": "string",
  "accountName": "string",
  "balance": "number",
  "currency": "string",
  "leverage": "number",
  "market": "string",
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "isActive": "boolean"
}
```

### 更新账户设置接口

**Endpoint**: `PUT /api/asset/account/{accountId}`

**路径参数**:

- `accountId`: 交易账户ID

**请求体 (Request Body)**:

```json
{
  "accountName": "string", // 账户名称 (可选)
  "market": "string", // 市场类型 (可选)
  "leverage": "number" // 杠杆比例 (可选)
}
```

**成功响应 (Status 200)**:

```json
{
  "id": "string",
  "userId": "string",
  "accountName": "string",
  "balance": "number",
  "currency": "string",
  "leverage": "number",
  "market": "string",
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "isActive": "boolean"
}
```

### 获取账户余额接口

**Endpoint**: `GET /api/asset/account/{accountId}/balance`

**路径参数**:

- `accountId`: 交易账户ID

**成功响应 (Status 200)**:

```json
{
  "balance": "number",
  "currency": "string"
}
```

### 获取交易历史接口

**Endpoint**: `GET /api/asset/account/{accountId}/transactions`

**路径参数**:

- `accountId`: 交易账户ID

**查询参数**:

- `limit`: 返回记录数量 (可选，默认: 50，最大: 100)
- `offset`: 偏移量 (可选，默认: 0)

**成功响应 (Status 200)**:

```json
{
  "transactions": [
    {
      "id": "string",
      "type": "string",
      "amount": "number",
      "balanceAfter": "number",
      "description": "string",
      "referenceId": "string",
      "createdAt": "date-time"
    }
  ],
  "totalCount": "integer"
}
```

### 获取当前持仓接口

**Endpoint**: `GET /api/asset/account/{accountId}/positions`

**路径参数**:

- `accountId`: 交易账户ID

**成功响应 (Status 200)**:

```json
{
  "positions": [
    {
      "id": "string",
      "symbol": "string",
      "quantity": "number",
      "averageCost": "number",
      "currentPrice": "number",
      "marketValue": "number",
      "unrealizedPnL": "number",
      "createdAt": "date-time",
      "updatedAt": "date-time"
    }
  ]
}
```

### 获取业绩指标接口

**Endpoint**: `GET /api/asset/account/{accountId}/revenue`

**路径参数**:

- `accountId`: 交易账户ID

**查询参数**:

- `period`: 时间周期 (可选，默认: 30d，可选值: 7d, 30d, 90d, 1y, all)

**成功响应 (Status 200)**:

```json
{
  "metrics": {
    "periodStart": "date-time",
    "periodEnd": "date-time",
    "totalReturn": "number",
    "annualizedReturn": "number",
    "volatility": "number",
    "sharpeRatio": "number",
    "maxDrawdown": "number",
    "winRate": "number",
    "totalTrades": "integer",
    "profitableTrades": "integer",
    "createdAt": "date-time"
  }
}
```

## 使用示例

### 示例1: 创建美股交易账户

**请求**:

```bash
curl -X POST /api/asset/account \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_1234567890",
    "initialDeposit": 10000,
    "accountName": "美股主账户",
    "market": "美股",
    "leverage": 2
  }'
```

**响应**:

```json
{
  "id": "asset_acc_1234567890",
  "userId": "user_1234567890",
  "accountName": "美股主账户",
  "balance": 10000,
  "currency": "USD",
  "leverage": 2,
  "market": "美股",
  "createdAt": "2025-10-14T10:00:00Z",
  "updatedAt": "2025-10-14T10:00:00Z",
  "isActive": true
}
```

### 示例2: 获取账户持仓

**请求**:

```
curl -X GET /api/asset/account/asset_acc_1234567890/positions
```

**响应**:

```
{
  "positions": [
    {
      "id": "pos_0987654321",
      "symbol": "AAPL",
      "quantity": 100,
      "averageCost": 150.50,
      "currentPrice": 175.25,
      "marketValue": 17525,
      "unrealizedPnL": 2475,
      "createdAt": "2025-10-14T10:05:00Z",
      "updatedAt": "2025-10-14T10:30:00Z"
    }
  ]
}
```

## 数据模型影响

资产管理功能会操作以下实体：

1. **Trading Account**: 存储交易账户信息
2. **Transaction Record**: 记录交易历史
3. **Position**: 存储持仓信息
4. **revenue Metric**: 存储业绩指标

详细数据模型定义请参考 [data-model.md](./data-model.md)

## 收益计算标准

### 总收益率 (Total Return)

总收益率衡量投资期间的整体表现，计算公式为：

```
总收益率 = (期末账户价值 - 期初账户价值) / 期初账户价值 × 100%
```

其中：

- 期初账户价值 = 期初现金余额 + 期初持仓市值
- 期末账户价值 = 期末现金余额 + 期末持仓市值

### 年化收益率 (Annualized Return)

年化收益率将投资期间的收益标准化为年度表现，计算公式为：

```
年化收益率 = (1 + 总收益率)^(365 / 投资天数) - 1
```

### 波动率 (Volatility)

波动率衡量收益率的标准差，反映投资风险，计算方法为：

1. 计算每日收益率序列
2. 计算收益率的标准差
3. 年化波动率 = 日波动率 × √252

### 夏普比率 (Sharpe Ratio)

夏普比率衡量单位风险获得的超额收益，计算公式为：

```
夏普比率 = (年化收益率 - 无风险利率) / 年化波动率
```

其中无风险利率默认为2%

### 最大回撤 (Max Drawdown)

最大回撤衡量投资期间从峰值到谷值的最大跌幅，计算方法为：

1. 计算每日累计收益曲线
2. 对每个日期，计算从之前峰值到当前值的最大跌幅
3. 取所有跌幅中的最大值作为最大回撤

### 胜率 (Win Rate)

胜率衡量盈利交易占总交易的比例，计算公式为：

```
胜率 = 盈利交易次数 / 总交易次数 × 100%
```

### 计算时机

1. 业绩指标每日计算并存储
2. 实时查询时基于最新数据计算
3. 历史查询时基于指定时间区间的数据计算

### 特殊情况处理

1. 新账户：投资天数不足7天时，年化指标按实际天数计算
2. 无交易：无交易记录时，相关指标返回0或N/A
3. 负余额：账户出现负余额时，相关指标标记为异常

## 验证规则

### 输入验证

1. 初始资金：
   - 必须大于等于0

2. 账户名称：
   - 长度不超过50个字符

3. 市场类型：
   - 必须是"A股"或"美股"之一

4. 杠杆比例：
   - 范围在1-100之间

### 业务验证

1. 用户必须存在且有效
2. 初始资金不能为负数
3. 创建时间不能晚于当前时间
4. 账户余额不能为负数

## 安全考虑

1. 所有API接口需要身份验证
2. 用户只能访问自己的资产数据
3. 敏感信息不能在错误响应中泄露
4. 对请求频率进行限制以防止滥用
5. 所有通信应通过HTTPS加密传输

## 性能要求

1. 资产查询响应时间应小于200ms
2. 支持并发访问多个账户数据
3. 数据库读取操作应具有高效性

## 测试用例

### 正面测试

1. 成功创建美股交易账户
2. 成功创建A股交易账户
3. 成功获取账户持仓信息
4. 成功获取交易历史记录
5. 成功获取业绩指标

### 负面测试

1. 用户ID不存在
2. 账户ID不存在
3. 初始资金为负数
4. 杠杆比例超出范围
5. 未授权访问他人账户数据

## 相关文档

- [API Contract](./contracts/asset-api.yaml)
- [Data Model](./data-model.md)
- [Implementation Plan](./plan.md)
