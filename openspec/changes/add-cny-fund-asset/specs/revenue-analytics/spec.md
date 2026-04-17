## ADDED Requirements

### Requirement: Currency Switchable Portfolio Display
系统 MUST 在资产汇总和持仓展示中支持币种切换功能，用户可在 USD 和 CNY 之间切换查看所有资产。

#### Scenario: 币种切换器位于页面级别
- **GIVEN** 用户进入资产管理页面
- **WHEN** 页面渲染完成
- **THEN** 系统必须（MUST）在页面 Tab 栏右侧展示 `CurrencySwitcher` 组件，与 `PriceRefreshButton` 并列
- **THEN** 默认选中 USD 币种
- **THEN** `displayCurrency` 状态由 `AssetPage` 管理并通过 prop 传递给 `AssetDashboard`

#### Scenario: 切换为 USD 视角
- **GIVEN** 用户同时持有美元资产和人民币基金
- **WHEN** 用户选择 USD 币种
- **THEN** 系统必须（MUST）将所有金额统一转换为美元展示
- **THEN** 人民币资产通过 `EXCHANGE_RATES.CNY_TO_USD` 常量转换为美元
- **THEN** 所有金额使用美元格式化（`$` 符号，`en-US` locale）

#### Scenario: 切换为 CNY 视角
- **GIVEN** 用户同时持有美元资产和人民币基金
- **WHEN** 用户选择 CNY 币种
- **THEN** 系统必须（MUST）将所有金额统一转换为人民币展示
- **THEN** 美元资产通过 `USD_TO_CNY` 常量转换为人民币
- **THEN** 所有金额使用人民币格式化（`¥` 符号，`zh-CN` locale）

#### Scenario: 紧凑四卡片布局
- **GIVEN** 用户持有人民币基金资产（`hasCnyAssets = true`）
- **WHEN** 用户查看资产概览
- **THEN** 系统必须（MUST）以单行四列网格（`grid-cols-4`）展示：总余额、现金余额、股票资产、基金资产
- **THEN** 每张资产类型卡片中，浮动盈亏和投资本金必须（MUST）分两行展示

#### Scenario: 仅有 USD 资产时的布局
- **GIVEN** 用户仅持有美元计价资产，没有人民币基金（`hasCnyAssets = false`）
- **WHEN** 用户查看资产概览
- **THEN** 系统必须（MUST）以单行三列网格（`grid-cols-3`）展示：总余额、现金余额、股票资产
- **THEN** 不展示基金资产卡片

#### Scenario: 持仓列表区分货币
- **GIVEN** 用户持有美元计价资产和人民币基金
- **WHEN** 用户查看持仓列表
- **THEN** 系统必须（MUST）为每个持仓根据 `position.currency` 展示原始货币的市值（如 ¥12,345.00 或 $1,234.00）
- **THEN** 系统必须（MUST）为人民币持仓额外显示美元换算值
- **THEN** 系统必须（MUST）使用 `EXCHANGE_RATES.CNY_TO_USD` 常量进行换算

#### Scenario: 基金持仓盈亏以人民币展示
- **GIVEN** 用户持有人民币基金，买入均价为 1.2000 元/份，当前净值为 1.3500 元/份
- **WHEN** 用户查看该基金的持仓详情
- **THEN** 系统必须（MUST）以人民币展示市值、成本、浮动盈亏
- **THEN** 系统必须（MUST）正确计算收益率：(1.3500 - 1.2000) / 1.2000 = 12.5%

#### Scenario: 资产配置比例展示
- **GIVEN** 用户持有股票、基金和现金
- **WHEN** 用户查看资产配置
- **THEN** 系统必须（MUST）以统一币种（当前 displayCurrency）计算各类资产的占比
- **THEN** 系统必须（MUST）展示组合比例条（股票蓝色、基金橙色、现金绿色）
- **THEN** 系统必须（MUST）展示各类资产的金额和百分比明细
