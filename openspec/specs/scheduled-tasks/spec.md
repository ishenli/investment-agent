# scheduled-tasks Specification

## Purpose
TBD - created by archiving change add-scheduled-tasks. Update Purpose after archive.
## Requirements
### Requirement: 启动时任务检查

系统 SHALL 在应用启动时自动检查并执行遗漏的定时任务。

#### Scenario: 首次打开应用执行今日任务

- **WHEN** 用户首次打开应用且今天尚未执行任何定时任务
- **THEN** 系统自动执行以下任务：
  - 创建所有账户的投资组合快照
  - 同步所有持仓股票的价格历史
- **AND** 任务执行状态记录到 `scheduledTaskLogs` 表

#### Scenario: 已执行任务跳过

- **WHEN** 用户再次打开应用且今天已执行过定时任务
- **THEN** 系统跳过任务执行
- **AND** 返回今日已执行的任务状态

### Requirement: 每日投资组合快照

系统 SHALL 每日自动创建投资组合快照，记录账户的完整持仓状态。

#### Scenario: 创建每日快照成功

- **WHEN** 系统执行每日快照任务
- **THEN** 为每个账户创建一条快照记录
- **AND** 快照包含：总市值、现金余额、持仓明细、基准价值（SPY）
- **AND** 快照来源标记为 `scheduled`

#### Scenario: 快照创建幂等性

- **WHEN** 同一天多次执行快照任务
- **THEN** 仅保留最新的一条快照记录（UPSERT）
- **AND** 不会产生重复记录

#### Scenario: 无持仓时跳过快照

- **WHEN** 账户没有任何持仓（quantity = 0）
- **THEN** 系统跳过该账户的快照创建
- **AND** 记录跳过原因到任务日志

### Requirement: 价格历史同步

系统 SHALL 定期同步所有持仓股票的历史价格数据（OHLC）。

#### Scenario: 同步价格历史成功

- **WHEN** 系统执行价格同步任务
- **THEN** 获取所有账户的持仓股票代码
- **AND** 调用 HistoryService 同步每个股票的历史价格
- **AND** 价格数据存储到 `assetPriceHistory` 表

#### Scenario: 价格同步部分失败

- **WHEN** 部分股票价格同步失败（如 API 不可用）
- **THEN** 系统记录失败的股票列表到任务日志
- **AND** 任务状态标记为 `partial`
- **AND** 不影响其他股票的同步

#### Scenario: 价格同步幂等性

- **WHEN** 同一股票同一天多次同步价格
- **THEN** 仅保留一份价格数据
- **AND** 不会产生重复记录

### Requirement: 遗漏任务补执行

系统 SHALL 支持补执行过去遗漏的定时任务。

#### Scenario: 补执行近期遗漏任务

- **WHEN** 用户几天未打开应用
- **AND** 存在遗漏的定时任务（在补执行天数上限内）
- **THEN** 系统自动补执行遗漏的任务
- **AND** 为每个遗漏的日期创建快照和同步价格

#### Scenario: 超过补执行上限

- **WHEN** 遗漏任务超过配置的天数上限（默认 7 天）
- **THEN** 系统仅补执行上限范围内的任务
- **AND** 记录跳过的日期到任务日志

### Requirement: 任务执行日志

系统 SHALL 记录所有定时任务的执行状态。

#### Scenario: 记录任务执行开始

- **WHEN** 任务开始执行
- **THEN** 在 `scheduledTaskLogs` 表创建记录
- **AND** 状态为 `started`（隐含，startedAt 字段）

#### Scenario: 记录任务执行成功

- **WHEN** 任务执行完成且无错误
- **THEN** 更新任务日志状态为 `success`
- **AND** 记录 `completedAt` 时间戳
- **AND** 记录执行详情到 `metadata` 字段

#### Scenario: 记录任务执行失败

- **WHEN** 任务执行过程中发生错误
- **THEN** 更新任务日志状态为 `failed` 或 `partial`
- **AND** 记录错误信息到 `errorMessage` 字段
- **AND** 记录 `completedAt` 时间戳

### Requirement: 前端触发机制

系统 SHALL 通过前端应用触发定时任务检查。

#### Scenario: 应用初始化触发检查

- **WHEN** 前端应用初始化完成
- **THEN** 调用 `/api/scheduled/check-and-run` 接口
- **AND** 异步执行任务检查，不阻塞 UI 渲染

#### Scenario: 后台定时检查

- **WHEN** 应用持续运行超过检查间隔（默认 1 小时）
- **THEN** 自动触发任务检查
- **AND** 执行未完成的任务

### Requirement: 任务状态查询

系统 SHALL 提供任务执行状态查询接口。

#### Scenario: 查询最近任务状态

- **WHEN** 调用 `/api/scheduled/status` 接口
- **THEN** 返回最近的任务执行记录
- **AND** 包含任务类型、执行日期、状态、执行时间等信息

