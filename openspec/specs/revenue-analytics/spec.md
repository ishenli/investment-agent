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

