# report-generation Specification

## Purpose
TBD - created by archiving change enhance-report-generation. Update Purpose after archive.
## Requirements
### Requirement: Performance Calculation
系统 MUST 提供准确的投资业绩计算功能，支持指定时间范围内的收益率分析。

#### Scenario: Calculate Weekly Performance
- **GIVEN** 用户账户存在历史持仓数据
- **WHEN** 系统调用 `calculatePerformance(accountId, startDate, endDate)`
- **THEN** 系统 MUST 返回期初净值（startValue）
- **THEN** 系统 MUST 返回期末净值（endValue）
- **THEN** 系统 MUST 计算绝对收益（changeAmount = endValue - startValue）
- **THEN** 系统 MUST 计算收益率（changePercentage = changeAmount / startValue * 100）
- **THEN** 系统 MUST 返回基准收益率用于对比

#### Scenario: Calculate Performance with Benchmark Comparison
- **GIVEN** 用户配置了基准指数（默认 SPY）
- **WHEN** 系统计算业绩
- **THEN** 系统 MUST 获取基准指数同期收益率
- **THEN** 系统 MUST 计算超额收益（excessReturn = portfolioReturn - benchmarkReturn）

#### Scenario: Handle Missing Historical Snapshot
- **GIVEN** 指定日期没有历史快照
- **WHEN** 系统获取期初/期末净值
- **THEN** 系统 MUST 使用最近可用日期的快照
- **THEN** 系统 MUST 记录实际使用的日期

#### Scenario: Calculate Time-Weighted Return with Cash Flows
- **GIVEN** 报告周期内存在资金变动（入金/出金）
- **WHEN** 系统计算收益率
- **THEN** 系统 MUST 获取周期内所有资金变动记录（deposit/withdrawal 类型交易）
- **THEN** 系统 MUST 计算时间加权收益率（TWR）
- **THEN** TWR 计算公式 MUST 为：∏(1 + R_i) - 1，其中 R_i 为每段期间收益率
- **THEN** 每段期间收益率 R_i = (期末净值 - 期初净值 - 期间现金流) / (期初净值 + 期间现金流 × 时间权重)
- **THEN** 系统 MUST 同时返回简单收益率和 TWR 供对比

#### Scenario: Record Cash Flow Info in Report
- **GIVEN** 报告周期内存在资金变动
- **WHEN** 系统生成报告数据
- **THEN** 系统 MUST 汇总周期内总入金金额（totalDeposit）
- **THEN** 系统 MUST 汇总周期内总出金金额（totalWithdrawal）
- **THEN** 系统 MUST 计算净现金流（netCashFlow = totalDeposit - totalWithdrawal）
- **THEN** 系统 MUST 在报告中说明资金变动对收益的影响

---

### Requirement: Portfolio Snapshot Management
系统 MUST 支持投资组合快照的创建和查询，用于历史业绩计算。

#### Scenario: Create Daily Snapshot
- **GIVEN** 用户账户有持仓数据
- **WHEN** 系统调用 `createSnapshot(accountId, date)`
- **THEN** 系统 MUST 记录当日总市值（totalValue）
- **THEN** 系统 MUST 记录现金余额（cashBalance）
- **THEN** 系统 MUST 记录持仓明细快照（positions JSON）
- **THEN** 系统 MUST 记录基准价值（benchmarkValue）

#### Scenario: Get Nearest Snapshot
- **GIVEN** 用户账户存在多个历史快照
- **WHEN** 系统调用 `getNearestSnapshot(accountId, targetDate)`
- **THEN** 系统 MUST 返回目标日期前最近的快照
- **THEN** 系统 MUST 优先返回目标日期当天的快照

#### Scenario: Prevent Duplicate Snapshots
- **GIVEN** 用户账户某日期已存在快照
- **WHEN** 系统尝试创建相同日期的快照
- **THEN** 系统 MUST 更新现有快照而非创建新记录

---

### Requirement: Real-time Data Injection
系统 MUST 在报告生成时注入实时行情数据，确保分析基于最新市场信息。

#### Scenario: Enrich Positions with Real-time Quotes
- **GIVEN** 用户账户有当前持仓
- **WHEN** 系统调用 `enrichWithRealtimeData(positions)`
- **THEN** 系统 MUST 批量获取所有持仓的实时行情
- **THEN** 系统 MUST 为每个持仓添加实时价格（realtimePrice）
- **THEN** 系统 MUST 为每个持仓添加涨跌幅（priceChangePercent）
- **THEN** 系统 MUST 记录行情更新时间（lastQuoteUpdate）

#### Scenario: Handle Quote API Failure
- **GIVEN** 行情 API 调用失败或超时
- **WHEN** 系统获取实时行情
- **THEN** 系统 MUST 回退使用缓存价格或最近快照价格
- **THEN** 系统 MUST 记录数据非实时的警告

#### Scenario: Quote Data Caching
- **GIVEN** 行情数据有 5 分钟缓存有效期
- **WHEN** 系统在有效期内再次请求相同股票行情
- **THEN** 系统 MUST 返回缓存的行情数据
- **THEN** 系统 MUST NOT 发起新的 API 调用

---

### Requirement: Data Freshness Validation
系统 MUST 验证数据的时效性并在报告中标注数据来源。

#### Scenario: Validate Data Freshness
- **GIVEN** 报告生成需要多种数据源
- **WHEN** 系统聚合数据完成
- **THEN** 系统 MUST 计算每个数据源的陈旧度（staleness）
- **THEN** 系统 MUST 生成数据来源摘要（dataSourceSummary）
- **THEN** 系统 MUST 对陈旧数据（> 1 小时）标记警告

#### Scenario: Report Data Source Summary
- **GIVEN** 报告使用多种数据源
- **WHEN** 报告生成完成
- **THEN** 系统 MUST 在报告中包含数据来源说明
- **THEN** 说明 MUST 包含数据类型、来源、更新时间
- **THEN** 说明 MUST 包含数据新鲜度评分（0-1）

---

### Requirement: Structured AI Report Generation
系统 MUST 使用 Claude Agent SDK 或 LangChain 生成报告内容，支持通过 agentType 参数切换。

#### Scenario: Generate Report with Claude Agent SDK
- **GIVEN** 系统已完成数据聚合
- **WHEN** 系统调用 `generateAIReportContent(reportData, modelSlug)`
- **THEN** 系统 MUST 创建临时工作区目录 `temp/report-generation/{reportId}/`
- **THEN** 系统 MUST 将报告数据写入工作区文件：
  - `context.md` - 账户业绩和持仓摘要（Markdown 格式）
  - `positions.json` - 持仓明细（JSON 格式）
  - `transactions.json` - 交易记录（JSON 格式）
  - `notes.json` - 用户笔记（JSON 格式）
  - `market-events.json` - 市场事件（JSON 格式）
- **THEN** 系统 MUST 调用 Claude Agent SDK 的 `query()` 函数
- **THEN** SDK 配置 MUST 包含：
  - `apiKey` - 从 modelProviderResolver 获取
  - `baseURL` - 从 modelProviderResolver 获取
  - `model` - 模型标识（modelSlug）
  - `cwd` - 工作区路径
  - `allowedTools: ["Read", "Glob", "Grep", "WebSearch"]`
  - `permissionMode: "acceptEdits"`
  - `maxTurns: 20` - 限制执行轮次
  - `maxBudgetUsd: 0.5` - 限制单次成本
- **THEN** 系统 MUST 在报告生成完成后清理工作区目录
- **THEN** 输出 MUST 包含完整的 Markdown 格式报告

#### Scenario: Agent Workspace File Structure
- **GIVEN** Agent 需要读取报告数据
- **WHEN** 工作区创建完成
- **THEN** `context.md` MUST 包含账户业绩概览和持仓摘要（Markdown 格式）
- **THEN** JSON 文件 MUST 包含完整的结构化数据
- **THEN** Agent MUST 能够通过 Read 工具读取所有文件
- **THEN** Agent MUST 能够通过 Grep 工具搜索笔记内容

#### Scenario: Agent Tool Usage Guidance
- **GIVEN** Agent 执行报告生成任务
- **WHEN** Agent 调用工具
- **THEN** Agent 可使用 **Read** 工具读取数据文件
- **THEN** Agent 可使用 **Glob** 工具查找文件
- **THEN** Agent 可使用 **Grep** 工具搜索笔记关键词
- **THEN** Agent 可使用 **WebSearch** 工具搜索最新市场新闻
- **THEN** systemPrompt MUST 包含工具使用指南和分析原则

#### Scenario: Model Configuration Reuse
- **GIVEN** 系统需要获取模型配置
- **WHEN** 调用 `getModelConfig(modelSlug)` 方法
- **THEN** 系统 MUST 复用 `modelProviderResolver` 的逻辑
- **THEN** 如果指定模型不存在，系统 MUST 回退到默认模型
- **THEN** 返回配置 MUST 包含 `apiKey`、`baseUrl`、`modelSlug`

#### Scenario: Workspace Cleanup After Generation
- **GIVEN** 报告生成完成或失败
- **WHEN** `generateAIReportContent()` 方法执行结束
- **THEN** 系统 MUST 在 finally 块中调用 `workspaceManager.cleanup(reportId)`
- **THEN** 工作区目录 MUST 被递归删除
- **THEN** 如果删除失败，系统 MUST 记录警告但不抛出异常

#### Scenario: Agent Execution Budget Control
- **GIVEN** Agent 正在生成报告
- **WHEN** Token 消耗达到 `maxBudgetUsd` 限制
- **THEN** Claude Agent SDK MUST 停止执行
- **THEN** 系统 MUST 返回已生成的部分内容（如果有）
- **THEN** 系统 MUST 记录预算超限日志

#### Scenario: Agent Execution Turn Limit
- **GIVEN** Agent 正在生成报告
- **WHEN** 执行轮次达到 `maxTurns` 限制
- **THEN** Claude Agent SDK MUST 停止执行
- **THEN** 系统 MUST 返回最终结果（即使未完全完成）
- **THEN** 系统 MUST 记录轮次超限日志

#### Scenario: Backward Compatibility with Existing API
- **GIVEN** 前端调用 `POST /api/report` 接口
- **WHEN** 请求体包含 `accountId`、`type`、`modelSlug`（可选）
- **THEN** API 接口签名 MUST 保持不变
- **THEN** 响应格式 MUST 保持不变（reportId、status、content）
- **THEN** `analysis_reports` 表结构 MUST 保持不变
- **THEN** 生成的报告内容格式 MUST 与原有格式兼容（Markdown，相同章节结构）

---

### Requirement: Tool Enhancement for Report Generation
系统 MUST 提供增强的 AI 工具以支持精准数据查询。

#### Scenario: Enhanced Note Query with Time Filter
- **GIVEN** AI 需要查询用户笔记
- **WHEN** 调用 `noteQueryTool` 并指定时间范围
- **THEN** 工具 MUST 支持 startDate 和 endDate 参数
- **THEN** 工具 MUST 仅返回指定时间范围内的笔记
- **THEN** 工具 MUST 支持按股票代码（symbols）过滤

#### Scenario: Structured Search Results
- **GIVEN** AI 使用 Tavily 搜索互联网信息
- **WHEN** 调用 `TravilySearchTool`
- **THEN** 返回结果 MUST 包含摘要（summary）
- **THEN** 返回结果 MUST 包含来源列表（sources）
- **THEN** 每个来源 MUST 包含标题、URL、发布日期、相关性评分
- **THEN** 返回结果 MUST 限制在 5 条以内

---

### Requirement: Report Generation Progress Tracking
系统 MUST 支持报告生成进度的追踪和展示。

#### Scenario: Track Generation Progress
- **GIVEN** 报告生成是异步过程
- **WHEN** 系统处理报告生成
- **THEN** 系统 MUST 更新 generationProgress 字段（0-100）
- **THEN** 系统 MUST 更新 generationStage 字段描述当前阶段
- **THEN** 阶段包括：数据聚合、业绩计算、AI 生成、格式化

#### Scenario: Query Generation Progress
- **GIVEN** 用户查看报告详情页
- **WHEN** 报告正在生成中
- **THEN** 前端 MUST 显示当前进度百分比
- **THEN** 前端 MUST 显示当前阶段描述
- **THEN** 系统 MUST 每 2 秒轮询更新状态

---

### Requirement: Benchmark Data Fetching
系统 MUST 支持获取基准指数的历史价格数据，用于业绩对比分析。

#### Scenario: Fetch Benchmark Historical Price
- **GIVEN** 用户配置基准指数为 SPY
- **WHEN** 系统计算基准收益率
- **THEN** 系统 MUST 从 Finnhub API 获取基准指数的历史收盘价
- **THEN** 系统 MUST 使用 `/api/v1/stock/candle` 端点获取日线数据
- **THEN** 系统 MUST 缓存基准价格数据（24 小时有效期）
- **THEN** 缓存键格式 MUST 为 `benchmark:{symbol}:{date}`

#### Scenario: Handle Missing Benchmark Data
- **GIVEN** 基准数据不可用（API 失败且无缓存）
- **WHEN** 计算业绩对比
- **THEN** 系统 MUST 跳过基准对比计算
- **THEN** 系统 MUST 在报告中标注"基准数据不可用"
- **THEN** 系统 MUST 将 benchmarkReturn 和 excessReturn 设置为 null
- **THEN** 系统 MUST NOT 因基准数据缺失而完全失败

#### Scenario: Benchmark API Rate Limiting
- **GIVEN** Finnhub API 有速率限制（60 请求/分钟）
- **WHEN** 批量获取多个日期的基准数据
- **THEN** 系统 MUST 优先使用缓存数据
- **THEN** 系统 MUST 批量请求多个日期（单次请求最多 365 天）
- **THEN** 如果触发限流，系统 MUST 等待 1 秒后重试（最多 3 次）

#### Scenario: Calculate Benchmark Return
- **GIVEN** 报告时间范围为 startDate 到 endDate
- **WHEN** 系统计算基准收益率
- **THEN** 系统 MUST 获取 startDate 的基准收盘价（startPrice）
- **THEN** 系统 MUST 获取 endDate 的基准收盘价（endPrice）
- **THEN** 系统 MUST 计算收益率：(endPrice - startPrice) / startPrice * 100
- **THEN** 如果日期为非交易日，系统 MUST 使用最近交易日的收盘价

---

### Requirement: Snapshot Scheduling
系统 MUST 支持自动化的每日快照创建，确保历史业绩计算有数据基础。

#### Scenario: Initialize Snapshot Scheduler on App Startup
- **GIVEN** 应用启动完成
- **WHEN** Electron 主进程初始化完成
- **THEN** 系统 MUST 检查当天是否已创建快照
- **THEN** 如果当天无快照且为交易日，系统 MUST 立即创建快照
- **THEN** 系统 MUST 启动后台定时检查器

#### Scenario: Background Periodic Check
- **GIVEN** 应用正在运行
- **WHEN** 后台定时器触发（每 1-4 小时）
- **THEN** 系统 MUST 检查当天是否需要创建快照
- **THEN** 系统 MUST 仅在交易日的收盘后时段创建快照
- **THEN** 创建操作 MUST 是幂等的（同一天不重复创建）

#### Scenario: Trading Day Validation
- **GIVEN** 系统准备创建快照
- **WHEN** 检查当前日期
- **THEN** 系统 MUST 验证当前是否为交易日（非周末、非节假日）
- **THEN** 如果是非交易日，系统 MUST 跳过快照创建
- **THEN** 系统 MUST 支持配置不同市场的交易日历（美股、A股等）

#### Scenario: Snapshot Time Window
- **GIVEN** 快照应在收盘后创建
- **WHEN** 系统检查当前时间
- **THEN** 对于美股账户，系统 MUST 仅在美东时间 17:00 后创建快照
- **THEN** 对于A股账户，系统 MUST 仅在北京时间 15:30 后创建快照
- **THEN** 如果当前时间未到收盘时间，系统 MUST 等待下次检查

#### Scenario: Backfill Missing Snapshots
- **GIVEN** 用户多日未打开应用
- **WHEN** 系统检测到历史快照断档
- **THEN** 系统 MUST 识别缺失的交易日快照
- **THEN** 系统 MUST 尝试使用历史行情数据回填快照（如果数据可用）
- **THEN** 如果无法回填，系统 MUST 记录缺失并提示用户

#### Scenario: Idempotent Snapshot Creation
- **GIVEN** 同一天多次调用快照创建
- **WHEN** 系统创建快照
- **THEN** 如果当天快照已存在，系统 MUST 更新现有记录而非创建新记录
- **THEN** 系统 MUST 记录更新时间和更新原因

#### Scenario: Handle Snapshot Creation Failure
- **GIVEN** 快照创建过程中发生错误（数据库写入失败、网络超时等）
- **WHEN** 系统尝试创建快照
- **THEN** 系统 MUST 记录详细错误日志（包含 accountId、日期、错误原因）
- **THEN** 系统 MUST 在下次定时检查时重试（最多 3 次）
- **THEN** 如果 3 次重试均失败，系统 MUST 记录永久性错误日志
- **THEN** 系统 MUST 继续运行，不影响其他功能

#### Scenario: Concurrent Snapshot Creation for Multiple Accounts
- **GIVEN** 应用管理多个账户
- **WHEN** 定时器触发快照创建
- **THEN** 系统 MUST 为每个账户独立创建快照
- **THEN** 单个账户快照失败 MUST NOT 影响其他账户
- **THEN** 系统 MUST 使用数据库事务确保单个账户快照的原子性
- **THEN** 系统 MUST 限制并发数（最多 3 个账户同时创建）

#### Scenario: Snapshot Retry Tracking
- **GIVEN** 快照创建失败需要重试
- **WHEN** 系统记录重试状态
- **THEN** 系统 MUST 在 notes 字段记录重试次数和原因
- **THEN** 系统 MUST 将 source 设置为 'scheduled'
- **THEN** 重试间隔 MUST 为：第 1 次 1 分钟、第 2 次 5 分钟、第 3 次 15 分钟

---

### Requirement: Backward Compatibility with Report Editing
系统 MUST 确保新生成的报告与现有手动编辑功能完全兼容。

#### Scenario: Edit Structured Report Content
- **GIVEN** 用户生成了包含结构化输出的报告
- **WHEN** 用户通过 EditReportDrawer 手动编辑报告内容
- **THEN** 系统 MUST 允许编辑完整的 Markdown 内容
- **THEN** 编辑后的报告 MUST 保留 `dataSourceSummary` 元数据
- **THEN** 系统 MUST 在数据库中设置 `isManuallyEdited` 标记为 true

#### Scenario: Preserve Metadata After Manual Edit
- **GIVEN** 报告包含 `generationProgress`、`dataSourceSummary` 等元数据
- **WHEN** 用户通过编辑功能修改报告
- **THEN** 系统 MUST 保留所有元数据字段
- **THEN** 系统 MUST 更新 `updatedAt` 时间戳
- **THEN** 系统 MUST 保持 `generationProgress` 为 100
- **THEN** 系统 MUST 保持 `generationStage` 为 '已完成'

#### Scenario: Display Manual Edit Warning
- **GIVEN** 报告已被手动编辑（isManuallyEdited = true）
- **WHEN** 用户查看报告详情页
- **THEN** 系统 MUST 在报告顶部显示提示："此报告已手动编辑，数据来源信息可能已过时"
- **THEN** 提示 MUST 使用黄色警告样式
- **THEN** 提示 MUST 包含最后编辑时间

#### Scenario: Structured Output Compatibility
- **GIVEN** 报告使用 StructuredOutputParser 生成（包含 summary、marketOverview 等章节）
- **WHEN** 用户手动编辑报告
- **THEN** 系统 MUST 不验证编辑后的内容是否符合结构化格式
- **THEN** 系统 MUST 允许用户自由修改章节结构
- **THEN** 系统 MUST 允许用户删除或新增章节

#### Scenario: Extend Report Schema for Editing Metadata
- **GIVEN** 需要记录编辑历史
- **WHEN** 系统设计数据库 Schema
- **THEN** `analysis_reports` 表 MUST 新增 `isManuallyEdited` 字段（boolean，默认 false）
- **THEN** 表 MUST 新增 `lastEditedAt` 字段（timestamp，可为 null）
- **THEN** 表 MUST 新增 `editCount` 字段（integer，默认 0）

---

### Requirement: Report Data Integrity
系统 MUST 确保报告核心数据的一致性和准确性。

#### Scenario: Validate Report Data Before Generation
- **GIVEN** 系统准备生成报告
- **WHEN** 数据聚合完成
- **THEN** 系统 MUST 验证至少有一条持仓数据
- **THEN** 系统 MUST 验证时间范围有效（startDate < endDate）
- **THEN** 系统 MUST 记录数据完整性日志

#### Scenario: Handle Incomplete Data
- **GIVEN** 部分数据源不可用
- **WHEN** 系统聚合数据
- **THEN** 系统 MUST 使用可用数据继续生成
- **THEN** 系统 MUST 在报告中标注缺失的数据类型
- **THEN** 系统 MUST NOT 因部分数据缺失而完全失败

---

### Requirement: 报告生成模型选择功能

用户在生成投资报告时 SHALL 能够选择要使用的 AI 模型。

#### Scenario: 报告生成页面显示模型选择器

- **GIVEN** 用户在报告生成页面
- **WHEN** 页面加载完成
- **THEN** 系统 SHALL 显示模型选择下拉框
- **AND** 下拉框 SHALL 列出用户配置的所有可用模型
- **AND** 默认选中用户的默认模型

#### Scenario: 选择模型生成报告

- **GIVEN** 用户已选择一个模型
- **AND** 用户选择了报告类型（周报/月报）
- **WHEN** 用户点击"生成报告"按钮
- **THEN** 系统 SHALL 调用 `POST /api/report` 接口
- **AND** 请求体 SHALL 包含 `modelSlug` 字段（用户选择的模型标识）
- **AND** 系统使用选中的模型生成投资报告

#### Scenario: 异步报告生成中的模型选择

- **GIVEN** 用户发起报告生成请求
- **WHEN** 报告异步生成过程中
- **THEN** 系统 SHALL 在 `processReportGeneration` 中使用指定的模型
- **AND** 报告内容 SHALL 基于选中模型的输出

### Requirement: 报告生成 API 支持模型参数

`POST /api/report` 接口 SHALL 支持可选的 `modelSlug` 参数。

#### Scenario: 报告生成 API 接受模型参数

- **GIVEN** 客户端发送 POST 请求到 `/api/report`
- **WHEN** 请求体包含 `modelSlug` 字段
- **THEN** 系统 SHALL 在 `generateAIReportContent` 中使用指定的模型
- **AND** 日志 SHALL 记录使用的模型

#### Scenario: 报告生成 API 未提供模型参数

- **GIVEN** 客户端发送 POST 请求到 `/api/report`
- **WHEN** 请求体不包含 `modelSlug` 字段
- **THEN** 系统 SHALL 使用用户的默认模型生成报告
- **AND** 系统行为与修改前保持一致

### Requirement: 报告生成服务层支持模型选择

`ReportService` SHALL 支持在生成 AI 报告内容时指定模型。

#### Scenario: 服务层接受模型参数

- **GIVEN** `generateAIReportContent` 方法被调用
- **WHEN** 传入 `modelSlug` 参数
- **THEN** 方法 SHALL 调用 `chatModelOpenAI(modelSlug)` 获取指定模型
- **AND** 使用指定模型执行 LangChain Agent

#### Scenario: 服务层未传入模型参数

- **GIVEN** `generateAIReportContent` 方法被调用
- **WHEN** 未传入 `modelSlug` 参数
- **THEN** 方法 SHALL 调用 `chatModelOpenAI()` 获取默认模型
- **AND** 行为与修改前保持一致

### Requirement: Report Workspace Management
系统 MUST 提供工作区管理功能，用于 Agent 读取报告数据。

#### Scenario: Create Workspace
- **GIVEN** 系统需要生成报告
- **WHEN** 调用 `ReportWorkspaceManager.createWorkspace(reportId, reportData)`
- **THEN** 系统 MUST 创建目录 `{projectRoot}/temp/report-generation/{reportId}/`
- **THEN** 系统 MUST 写入 `context.md` 文件（包含业绩和持仓摘要）
- **THEN** 系统 MUST 写入 `positions.json` 文件（结构化持仓数据）
- **THEN** 系统 MUST 写入 `transactions.json` 文件（交易记录）
- **THEN** 系统 MUST 写入 `notes.json` 文件（用户笔记）
- **THEN** 系统 MUST 写入 `market-events.json` 文件（市场事件）
- **THEN** 系统 MUST 返回工作区路径

#### Scenario: Build Context File
- **GIVEN** 系统需要构建 context.md 文件
- **WHEN** 调用 `buildContextFile(reportData)`
- **THEN** 文件 MUST 包含账户业绩数据章节
- **THEN** 文件 MUST 包含持仓详情章节
- **THEN** 文件 MUST 包含数据来源信息章节
- **THEN** 文件 MUST 说明其他数据文件的用途
- **THEN** 格式 MUST 为 Markdown

#### Scenario: Cleanup Workspace
- **GIVEN** 报告生成完成或失败
- **WHEN** 调用 `ReportWorkspaceManager.cleanup(reportId)`
- **THEN** 系统 MUST 递归删除工作区目录
- **THEN** 如果删除失败（权限、文件占用等），系统 MUST 仅记录警告
- **THEN** 系统 MUST NOT 因清理失败而抛出异常

#### Scenario: Workspace Path Isolation
- **GIVEN** Agent 运行在工作区中
- **WHEN** Agent 尝试访问文件
- **THEN** Agent MUST 仅能访问 `cwd` 目录下的文件
- **THEN** Agent MUST NOT 能访问项目其他目录（如源码、数据库文件）

---

