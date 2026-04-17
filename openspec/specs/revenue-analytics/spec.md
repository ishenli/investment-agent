# revenue-analytics Specification

## Purpose
TBD - created by archiving change implement-revenue-analytics-real-data. Update Purpose after archive.
## Requirements
### Requirement: Revenue History Data Interface
The system MUST provide a revenue history time series data interface that supports querying returns and drawdown data by time period and granularity.

#### Scenario: 查询周级别收益历史
- **GIVEN** 用户选择时间范围为 30 天
- **WHEN** 用户请求周级别收益率和回撤数据
- **THEN** 系统必须返回指定时间段内每周的收益率和回撤数据点

#### Scenario: 查询月级别收益历史
- **GIVEN** 用户选择时间范围为 365 天或全部时间
- **WHEN** 用户请求月级别收益率和回撤数据
- **THEN** 系统必须返回指定时间段内每月的收益率和回撤数据点

#### Scenario: API 响应格式
- **WHEN** 系统返回收益历史数据
- **THEN** 每个数据点必须包含时间标签、收益率和回撤值
- **THEN** 所有数值百分比必须以小数形式表示（如 0.025 表示 2.5%）

### Requirement: Revenue Metrics Calculation
The system MUST calculate real revenue metrics based on transaction records and position data, including annualized return, Sharpe ratio, maximum drawdown, and volatility.

#### Scenario: 计算年化收益率
- **GIVEN** 账户中有交易记录和持仓数据
- **WHEN** 系统计算年化收益率
- **THEN** 必须使用复合年化增长率公式：(1 + 总收益率)^(365/投资天数) - 1

#### Scenario: 计算波动率
- **GIVEN** 有历史收益率序列数据
- **WHEN** 系统计算波动率
- **THEN** 必须计算收益率的标准差，年化因子为 sqrt(252)（假设每年252个交易日）

#### Scenario: 计算夏普比率
- **GIVEN** 有投资组合收益率、无风险利率和波动率
- **WHEN** 系统计算夏普比率
- **THEN** 必须使用公式：(年化收益率 - 无风险利率) / 年化波动率
- **THEN** 无风险利率默认值应设为 2.5%（可根据市场调整）

#### Scenario: 计算最大回撤
- **GIVEN** 有账户净值随时间变化的数据
- **WHEN** 系统计算最大回撤
- **THEN** 必须找出净值曲线从峰值到谷底的最大跌幅
- **THEN** 回撤值必须表示为负值（如 -0.085 表示 -8.5%）

### Requirement: Revenue Analytics UI Integration
The frontend revenue analytics component MUST integrate real revenue history data, replacing all hardcoded mock data.

#### Scenario: 显示真实收益率曲线
- **GIVEN** 用户访问收益分析页面
- **WHEN** 系统加载数据并渲染图表
- **THEN** 收益率柱状图必须显示从 API 获取的真实数据
- **THEN** 图表必须响应时间范围选择器的变化

#### Scenario: 显示真实回撤曲线
- **GIVEN** 用户访问收益分析页面
- **WHEN** 系统加载数据并渲染图表
- **THEN** 回撤折线图必须显示从 API 获取的真实数据
- **THEN** 回撤数据线必须使用红色表示负值

#### Scenario: 真实计算衍生指标
- **GIVEN** 用户访问收益分析页面
- **WHEN** 系统显示概览指标卡片
- **THEN** 年化收益率、夏普比率、波动率、最大回撤必须显示真实计算值
- **THEN** 所有指标必须根据当前时间范围动态更新

### Requirement: Error Handling and Loading States
The system MUST provide appropriate error handling and loading states during data loading and when calculations fail.

#### Scenario: 显示加载状态
- **WHEN** 正在从 API 获取收益数据
- **THEN** 必须显示骨架屏（Skeleton）占位符
- **THEN** 骨架屏必须模拟实际的卡片和图表布局

#### Scenario: API 请求失败处理
- **WHEN** API 请求失败或返回错误
- **THEN** 必须显示友好的错误提示信息
- **THEN** 错误提示应告知用户稍后重试

#### Scenario: 无数据情况处理
- **WHEN** 账户在选定时间段内没有交易记录
- **THEN** 必须显示"暂无数据"的空状态提示
- **THEN** 指标卡片应显示为"-"或"0.00%"

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

