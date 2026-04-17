# 实现计划：添加人民币基金资产支持

**分支**：`add-cny-fund-asset` | **日期**：2026-04-15 | **规范**：`openspec/changes/add-cny-fund-asset/`

## 概要

为投资分析平台添加人民币基金资产的完整支持，包括：通过腾讯接口自动获取基金净值、基金买入/卖出交易（数量×单价模式）、持仓以人民币原始计价展示、以及总资产可切换币种视角展示。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Drizzle ORM, Zustand, Ant Design
**存储**：SQLite (Drizzle ORM)
**测试**：Vitest
**约束条件**：不破坏现有美元/港元资产的行为

## 规范检查

- 现有 `AssetType` 已包含 `'fund'`，无需新增枚举值
- 现有 `MarketType` 已包含 `'CN'`，无需新增枚举值
- 汇率常量 `EXCHANGE_RATES.CNY_TO_USD` 已存在于 `src/shared/constant.ts`
- 腾讯适配器已支持 CN 市场，但仅处理股票代码，需扩展支持基金代码前缀

## 技术架构

### 数据流

```
[基金代码 + CN market] → [TencentAdapter: jj前缀] → [解析基金净值] → [QuoteResponse: CNY原始价格]
                                                                          ↓
[交易创建] → [TransactionService] → [PositionService: CNY持仓] → [asset_positions: currency标记]
                                                                          ↓
[资产汇总] → [PortfolioService] → [按currency分组] → [AssetDashboard: displayCurrency切换展示]
```

### 关键设计决策

**1. 价格存储策略：保留原始货币**

当前系统在 TencentAdapter 中将 HK/CN 价格统一转换为 USD 存储。对于基金，改为：
- `assetType='fund' && market='CN'` → 价格以 CNY 存储，不转换
- 其他 CN 资产（股票）→ 保持现有 CNY→USD 转换行为

**2. 持仓表增加 currency 字段**

`asset_positions` 表新增 `currency` 字段（TEXT, 默认 'USD'），标识该持仓的计价货币。
- 现有持仓默认 'USD'，向后兼容
- 新建的 CN fund 持仓标记为 'CNY'

**3. 资产汇总币种切换展示**

实现方案为"单币种切换展示"而非同时展示两种货币：
- `CurrencySwitcher` 组件提升至 `AssetPage` 页面级别（与 PriceRefreshButton 并列）
- `displayCurrency` 状态由 `AssetPage` 管理，通过 prop 传递给 `AssetDashboard`
- 当用户选择 USD 时：所有金额统一转换为美元展示
- 当用户选择 CNY 时：所有金额统一转换为人民币展示
- PortfolioService 按 currency 分组返回原始数据，前端根据 `displayCurrency` 动态转换

**4. 基金价格获取：腾讯基金接口**

腾讯接口支持基金代码，前缀为 `jj`（如 `jj110011`），返回数据格式与股票略有不同，需要单独的解析逻辑。

**5. UI 布局：紧凑四卡片设计**

资产概览页采用紧凑的单行网格布局：
- 有 CNY 资产时：`grid-cols-4`（总余额、现金余额、股票资产、基金资产）
- 仅有 USD 资产时：`grid-cols-3`（总余额、现金余额、股票资产）
- 每张资产卡片的盈亏和投资本金分两行展示，避免窄卡片下文本溢出
- 资产配置比例条置于卡片区域下方

### 状态管理

- **服务端**：PositionService/PortfolioService 增加 currency 维度
- **客户端**：
  - `AssetPage` 管理 `displayCurrency` 状态，通过 prop 下发
  - `CurrencySwitcher` 组件导出供页面级别使用
  - Position Store 增加 currency 字段
  - AssetSummary 类型扩展双币字段

### 外部集成

- **腾讯基金接口**：`http://sqt.gtimg.cn/utf8/q=jj{fundCode}` — 获取基金净值

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户能通过腾讯接口自动获取基金净值（CNY） | 调用 API 返回正确的 CNY 净值 |
| P2 | 用户能创建人民币基金的买入/卖出交易 | 交易记录以 CNY 存储，持仓正确更新 |
| P3 | 用户能在持仓列表中看到基金以人民币计价 | 基金持仓显示 ¥ 符号和 CNY 盈亏 |
| P4 | 用户能在资产汇总中切换币种视角查看 | 切换 USD/CNY 时所有金额正确转换 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 腾讯基金接口格式变更 | 中 | 增加健康检查和错误日志 |
| 汇率硬编码不准确 | 低 | 后续可扩展为实时汇率，当前复用已有常量 |
| 现有持仓无 currency 字段 | 低 | 新增字段默认 'USD'，迁移脚本填充 |

## 性能考虑

- 基金净值通常日更新一次，缓存策略与股票一致（当日缓存）
- 币种切换为纯前端计算，无额外 API 调用

## 测试策略

- **单元测试**：TencentAdapter 基金代码解析、PortfolioService 双币汇总逻辑
- **集成测试**：基金交易创建完整流程
