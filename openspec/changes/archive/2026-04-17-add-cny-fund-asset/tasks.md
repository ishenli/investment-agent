# 任务：添加人民币基金资产支持

**输入**：来自 `openspec/changes/add-cny-fund-asset/` 的设计文档
**前置条件**：plan.md
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3, P4）

## 路径约定

| 类型 | 路径 |
|------|------|
| 价格适配器 | `src/server/service/unifiedPriceService/adapters/TencentAdapter.ts` |
| 价格服务类型 | `src/server/service/unifiedPriceService/types.ts` |
| 交易服务 | `src/server/service/transactionService.ts` |
| 持仓服务 | `src/server/service/positionService.ts` |
| 组合服务 | `src/server/service/portfolioService.ts` |
| Schema | `drizzle/schema.ts` |
| 资产类型 | `src/types/asset.ts` |
| 常量 | `src/shared/constant.ts` |
| 交易对话框 | `src/app/components/add-transaction-dialog.tsx` |
| 资产页面 | `src/app/(pages)/asset/page.tsx` |
| 资产仪表盘 | `src/app/(pages)/asset/components/asset-dashboard.tsx` |

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-cny-fund-asset/`
- [x] T01 编写 proposal.md 描述变更意图和影响
- [x] T02 编写 spec delta 规范变更
- [x] T03 运行 `openspec validate add-cny-fund-asset --strict` 验证

---

## 第1阶段：数据库 Schema 和类型（基础设施）

**目的**：为后续服务层和 UI 层提供类型和数据支撑

- [x] T04 [P] [P1] 在 `drizzle/schema.ts` 的 `asset_positions` 表新增 `currency` 字段（TEXT, 默认 'USD'）
- [x] T05 [P] [P1] 运行 `pnpm db:generate` 生成迁移文件
- [x] T06 [P] [P1] 在 `src/types/asset.ts` 扩展 `AssetSummaryType` 增加双币字段（usdStockValue, usdStockGain, usdStockReturnRate, cnyStockValue, cnyStockGain, cnyStockReturnRate, usdCashBalance, cnyCashBalance, hasCnyAssets 等）
- [x] T07 [P] [P1] 在 `src/server/service/unifiedPriceService/types.ts` 的 `QuoteRequest` 增加可选 `assetType` 字段

---

## 第2阶段：价格获取（服务层 - P1）

**目的**：支持通过腾讯接口获取基金净值

**⚠️ 关键**：这是后续交易和持仓展示的基础

- [x] T08 [P1] 在 `TencentAdapter.ts` 的 `genStockPrefix` 函数添加基金代码逻辑：当 `assetType='fund' && market='CN'` 时使用 `jj` 前缀
- [x] T09 [P1] 在 `TencentAdapter.ts` 新增 `parseFundResponseData` 方法解析基金数据（基金返回格式与股票不同）
- [x] T10 [P1] 在 `TencentAdapter.ts` 的 `fetchBatchQuotes` 中，对 `assetType='fund'` 的请求保留 CNY 原价，不调用 `cnyToUsd()`，返回 `currency: 'CNY'`
- [x] T11 [P1] 编写 TencentAdapter 基金相关单元测试

**检查点**：可以通过 API 获取基金净值，返回 CNY 价格

---

## 第3阶段：交易和持仓（服务层 - P2）

**目的**：支持人民币基金的买入/卖出交易

- [x] T12 [P2] 在 `transactionService.ts` 中，当 `assetType='fund' && market='CN'` 时，交易记录标记 currency='CNY'，金额以人民币分存储
- [x] T13 [P2] 在 `positionService.ts` 中，创建/更新持仓时，基金持仓的 currency 字段设为 'CNY'，averagePriceCents 以人民币分存储
- [x] T14 [P2] 在 `positionService.ts` 的 `getCurrentPositions` 中，返回持仓的 currency 信息
- [x] T15 [P2] 编写交易服务基金相关单元测试

**检查点**：可以创建基金买入/卖出交易，持仓正确记录 CNY 货币

---

## 第4阶段：资产汇总（服务层 - P3/P4）

**目的**：Portfolio 层支持按货币分组汇总

- [x] T16 [P3] 在 `portfolioService.ts` 中，按 currency 分组计算持仓市值（USD 组 + CNY 组）
- [x] T17 [P3] 扩展 Portfolio 返回值，增加 cnyStockValue、cnyStockGain、cnyStockReturnRate、cnyTotalInvestment、hasCnyAssets 等字段
- [x] T18 [P4] 统一总值计算：USD 资产 + CNY 资产 × CNY_TO_USD

**检查点**：API 返回包含按币种分组的资产汇总数据

---

## 第5阶段：前端 UI（P2/P3/P4）

**目标**：交易表单适配基金、币种切换展示、紧凑布局

### 交易表单

- [x] T19 [P] [P2] 在 `add-transaction-dialog.tsx` 中，当选择 assetType='fund' 且 market='CN' 时，显示"人民币计价"提示标识
- [x] T20 [P] [P2] 在 `edit-transaction-dialog.tsx` 中同步上述逻辑

### 持仓列表

- [x] T21 [P3] 在持仓列表组件中，根据 position.currency 展示对应货币符号（¥ 或 $）
- [x] T22 [P3] 为人民币持仓显示美元换算值（灰色小字）

### 资产汇总 — 币种切换展示

- [x] T23 [P4] 在 `AssetPage` 页面级别添加 `CurrencySwitcher` 组件，与 `PriceRefreshButton` 并列放置
- [x] T24 [P4] `AssetDashboard` 接收 `displayCurrency` prop，所有金额根据所选币种统一转换展示（USD↔CNY）
- [x] T25 [P4] 实现紧凑四卡片布局（总余额、现金余额、股票资产、基金资产），有 CNY 资产时 `grid-cols-4`，否则 `grid-cols-3`

### 资产卡片细节

- [x] T25a [P4] AssetTypeCard 中浮动盈亏和投资本金分两行展示，避免窄卡片下文本溢出
- [x] T25b [P4] 资产配置比例条和明细列表使用紧凑布局（CardContent 直接渲染，无 CardHeader）

---

## 第6阶段：完善与质量保证

- [x] T26 运行 `pnpm run lint` 并修复问题
- [x] T27 运行 `pnpm run types:check` 确保类型正确
- [x] T28 运行 `pnpm test` 确保测试通过

---

## 依赖关系

### 阶段依赖

- **第0阶段（准备）**：立即进行
- **第1阶段（Schema/类型）**：依赖准备完成 — 阻塞后续所有阶段
- **第2阶段（价格获取）**：依赖第1阶段
- **第3阶段（交易/持仓）**：依赖第1阶段，可与第2阶段并行
- **第4阶段（资产汇总）**：依赖第2、3阶段
- **第5阶段（前端 UI）**：依赖第3、4阶段
- **第6阶段（质量保证）**：依赖所有阶段

### 并行机会

- T04/T05/T06/T07 可并行
- T08/T09/T10 顺序执行（同一文件）
- T12/T13 可并行（不同文件）
- T19/T20 可并行
- T21/T22 与 T23/T24/T25 可并行
