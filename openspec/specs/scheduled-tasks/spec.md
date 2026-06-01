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

### Requirement: AI 分析能力与自动化配置的产品边界

系统 SHALL 将 AI 洞察、AI 报告和定时任务的产品职责清晰分离：AI 洞察承载轻量分析结果，AI 报告承载结构化长文沉淀，定时任务承载自动化触发规则和执行日志。

#### Scenario: 定时任务页只管理自动化规则

- **GIVEN** 用户打开 `/setting/scheduled-jobs`
- **WHEN** 页面加载完成
- **THEN** 系统展示定时任务规则列表、启用状态、下次执行时间、最近执行结果和执行日志入口
- **AND** 页面 MAY 展示最近执行结果摘要和跳转链接
- **AND** 页面 MUST NOT 展示完整 AI 洞察正文
- **AND** 页面 MUST NOT 展示完整 AI 报告正文

#### Scenario: 内容消费回到洞察和报告页面

- **GIVEN** 一个定时任务成功生成 AI 洞察或提交 AI 报告生成请求
- **WHEN** 用户在定时任务页查看该任务的最近执行结果
- **THEN** 洞察类结果提供跳转到 AI 洞察历史或对应洞察详情的入口
- **AND** 报告类结果提供跳转到报告列表或对应报告详情的入口
- **AND** 用户在洞察页消费轻量分析结果，在报告页消费和编辑长文报告

#### Scenario: 使用任务模板创建自动化规则

- **GIVEN** 用户创建新的定时任务
- **WHEN** 系统展示创建入口
- **THEN** 主流程 SHALL 展示面向用户的任务模板，如“每日 AI 投资洞察”“每周投资复盘”“每月资产报告”
- **AND** 系统内部 MAY 将模板映射为 `jobType = "insight"`、`jobType = "report_weekly"` 或 `jobType = "report_monthly"`
- **AND** 主流程 SHOULD NOT 直接要求用户理解 `jobType` 枚举

#### Scenario: 用户直接新建定时任务

- **GIVEN** 用户打开定时任务页
- **WHEN** 用户点击“新建定时任务”
- **THEN** 系统 SHALL 打开同一个新建定时任务面板
- **AND** 面板 SHALL 默认选择一个可用任务类型
- **AND** 用户 SHALL 能在面板内切换任务类型、修改任务名称、计划时间、通知方式、关联账户和自然语言说明
- **AND** 用户不必先点击固定模板卡片才能创建任务

#### Scenario: 创建面板支持自然语言任务说明

- **GIVEN** 用户选择了一个任务模板
- **WHEN** 系统打开新建定时任务面板
- **THEN** 面板 SHALL 展示任务模板、通知方式、任务名称、计划时间、关联账户和“让 AI 帮你做什么”说明输入框
- **AND** “让 AI 帮你做什么”输入框 SHALL 允许用户用自然语言描述分析重点、报告偏好或需要关注的风险
- **AND** 系统 SHALL 将该说明保存到 `scheduledJobs.config.instructions`
- **AND** 系统 SHALL 将通知方式保存到 `scheduledJobs.config.notificationChannel`
- **AND** MVP 阶段通知方式 MAY 仅支持 `app`
- **AND** 面板 MUST NOT 暗示系统支持任意 Agent 工作流；任务执行范围仍受当前任务模板约束

#### Scenario: 内容页提供自动化设置入口但不重复配置能力

- **GIVEN** 用户位于 AI 洞察页或 AI 报告页
- **WHEN** 用户点击“自动分析设置”或“定期生成设置”
- **THEN** 系统跳转到 `/setting/scheduled-jobs` 并预选对应任务模板
- **AND** AI 洞察页和 AI 报告页 MUST NOT 各自实现独立的周期配置表单
- **AND** 调度周期、启停、日志和删除能力统一由定时任务页管理

---

### Requirement: 可配置定时任务规则存储

系统 SHALL 允许用户创建、读取、更新、删除定时任务配置，每项配置包含任务名称、cron 调度表达式、任务类型、关联参数、启用状态和所属用户。

#### Scenario: 创建定时任务成功

- **GIVEN** 用户已登录且拥有至少一个投资账户
- **WHEN** 用户提交创建请求，包含：
  - `name`："每周投资周报"
  - `cronExpression`："0 9 * * 1"（每周一 9:00）
  - `jobType`：`report_weekly`
  - `accountId`：关联账户 ID（nullable，部分任务类型无账户关联）
  - `config`：JSON 对象，如 `{ includeBenchmark: true }`
  - `isEnabled`：true
  - `timeoutMs`：300000（5 分钟，nullable，默认 300000）
- **THEN** 系统在 `scheduledJobs` 表中创建记录
- **AND** `userId` 自动设为当前用户 ID
- **AND** `nextRunAt` 由 Service 层通过 `new Cron(cronExpression).nextRun()` 动态计算（不存入数据库），在所有返回任务详情的 API 响应中附带此字段
- **AND** 返回新创建的任务详情（包含计算后的 `nextRunAt`）
- **AND** 如果应用在运行中，Electron 主进程调度器通过 IPC 热重载通道感知新任务并注册 cron

#### Scenario: 创建定时任务时 cron 表达式非法

- **GIVEN** 用户提交创建请求
- **WHEN** `cronExpression` 为 `"invalid cron"`
- **THEN** 系统返回 `400 BAD_REQUEST`，错误码 `INVALID_CRON_EXPRESSION`
- **AND** 不创建数据库记录

#### Scenario: 更新定时任务并热重载

- **GIVEN** 已存在一个启用状态的定时任务，cron 为 `"0 9 * * 1"`
- **WHEN** 用户将 cron 更新为 `"0 15 * * *"`（每天 15:00）
- **THEN** 数据库记录更新成功
- **AND** 前端通过 `window.electronAPI.reloadScheduledJob(jobId)` 发送 IPC 消息
- **AND** Electron 主进程通过 `ipcMain.handle('scheduler-reload-job')` 接收通知
- **AND** 主进程调度器取消旧 cron 任务，重新注册新 cron 任务
- **AND** 无需重启应用即可生效

#### Scenario: 删除定时任务

- **GIVEN** 已存在一个定时任务
- **WHEN** 用户删除该任务
- **THEN** 系统软删除数据库记录（设置 `deletedAt` 为当前时间）
- **AND** 前端发送 IPC 热重载通知
- **AND** 主进程调度器取消对应 cron 任务
- **AND** 已产生的执行日志保留，不受影响

---

### Requirement: 数据库存储结构

系统 SHALL 在 SQLite 中新增 `scheduledJobs` 和 `scheduledJobLogs` 两张表，并使用 Drizzle ORM 管理。

#### `scheduledJobs` 表定义

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `integer` | PK, autoIncrement | 自增主键 |
| `userId` | `integer` | NOT NULL, FK → users.id | 所属用户，索引 `idx_scheduled_jobs_user_id` |
| `name` | `text` | NOT NULL | 任务名称 |
| `cronExpression` | `text` | NOT NULL | cron 表达式（如 `"0 9 * * 1"`） |
| `jobType` | `text` | NOT NULL, enum | 枚举：`insight`/`report_weekly`/`report_monthly` |
| `accountId` | `integer` | nullable, FK → accounts.id | 关联账户（可选） |
| `config` | `text` | mode: 'json' | 任务类型特定配置对象（如 `{ includeBenchmark: true }`） |
| `timeoutMs` | `integer` | NOT NULL, default 300000 | 任务执行超时（毫秒，默认 5 分钟） |
| `isEnabled` | `integer` | NOT NULL, default 1, boolean mode | 是否启用 |
| `lastRunAt` | `integer` | mode: 'timestamp', nullable | 上次执行时间 |
| `createdAt` | `integer` | NOT NULL, mode: 'timestamp', $defaultFn | 创建时间 |
| `updatedAt` | `integer` | NOT NULL, mode: 'timestamp', $defaultFn | 更新时间 |
| `deletedAt` | `integer` | mode: 'timestamp', nullable | 软删除时间 |

**索引**：
- `idx_scheduled_jobs_user_id`：ON (userId) — 按用户查询任务列表
- `idx_scheduled_jobs_user_enabled`：ON (userId, isEnabled) — 查询用户的启用任务
- `idx_scheduled_jobs_deleted_at`：ON (deletedAt) — 软删除过滤

#### `scheduledJobLogs` 表定义

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `integer` | PK, autoIncrement | 自增主键 |
| `jobId` | `integer` | NOT NULL, FK → scheduledJobs.id | 关联任务 |
| `userId` | `integer` | NOT NULL, FK → users.id | 所属用户（冗余，优化日志查询） |
| `status` | `text` | NOT NULL, enum | 枚举：`pending`/`running`/`success`/`failed`/`missed`；报告类任务的 `success` 表示报告生成请求已成功提交。状态变更时同步更新 `updatedAt` |
| `startedAt` | `integer` | NOT NULL, mode: 'timestamp' | 开始时间 |
| `completedAt` | `integer` | mode: 'timestamp', nullable | 完成时间 |
| `result` | `text` | mode: 'json', nullable | 执行结果摘要（如生成报告 ID、洞察数量等） |
| `errorMessage` | `text` | nullable | 错误信息 |
| `metadata` | `text` | mode: 'json', nullable | 扩展元数据（如耗时、并发队列位置等） |
| `createdAt` | `integer` | NOT NULL, mode: 'timestamp', $defaultFn | 创建时间 |
| `updatedAt` | `integer` | NOT NULL, mode: 'timestamp', $defaultFn | 更新时间（状态流转 pending→running→success/failed 时更新） |

**索引**：
- `idx_scheduled_job_logs_job_id`：ON (jobId) — 按任务查日志
- `idx_scheduled_job_logs_user_id`：ON (userId) — 按用户查日志
- `idx_scheduled_job_logs_status`：ON (status) — 按状态过滤

#### Scenario: 表向后兼容

- **GIVEN** 现有 `scheduledTaskLogs` 表包含每日快照和价格同步的执行历史
- **WHEN** 新增 `scheduledJobs` 和 `scheduledJobLogs` 表
- **THEN** `scheduledTaskLogs` 表结构完全不变
- **AND** 现有 `useScheduler` hook 和 `/api/scheduled` 路由继续正常工作
- **AND** 新旧两张日志表独立管理，查询互不干扰

---

### Requirement: Electron 主进程定时调度

系统 SHALL 在 Electron 主进程中维护一个基于 `croner` 的调度引擎，通过 HTTP API 调用后端执行任务。

#### Scenario: 应用启动时加载并注册任务

- **GIVEN** 数据库中有 3 个启用的定时任务
- **WHEN** Electron 应用启动且 server 成功启动后（`waitForServer` 返回）
- **THEN** 主进程调度器通过 HTTP GET `http://127.0.0.1:${port}/api/scheduled-jobs?enabled=true` 读取所有启用的任务
- **AND** 请求头携带 `X-Internal-Auth: ${INTERNAL_AUTH_TOKEN}`
- **AND** 返回结果包含每个任务自己的 `userId`，用于后续执行时建立用户上下文
- **AND** 为每个任务调用 `new Croner(cronExpression, handler)` 注册调度
- **AND** 在控制台输出：`[Scheduler] Registered job "每周投资周报" (id=1, cron="0 9 * * 1", nextRunAt=...)`

#### Scenario: cron 触发时调用后端执行

- **GIVEN** 存在一个 cron 为 `"0 15 * * *"` 的定时任务
- **WHEN** 到达每天 15:00
- **THEN** 主进程调度器通过 HTTP POST `http://127.0.0.1:${port}/api/scheduled-jobs/1/execute` 调用后端
- **AND** 请求头携带 `X-Internal-Auth: ${INTERNAL_AUTH_TOKEN}`
- **AND** 后端根据 `jobId` 读取 `scheduledJobs.userId`，不得通过缺省用户或当前前端 session 推断用户
- **AND** 等待后端响应（超时 5 分钟，可在 `config` 中按任务类型覆盖）
- **AND** 如果后端返回成功，记录成功日志并弹出系统通知
- **AND** 如果后端返回失败或超时，记录失败日志并弹出失败通知

#### Scenario: 禁用任务后不再触发

- **GIVEN** 存在一个启用的定时任务
- **WHEN** 用户在 UI 中将该任务禁用（`isEnabled = false`）
- **THEN** 前端通过 IPC 通知主进程
- **AND** 主进程调度器取消对应的 `Croner` 实例
- **AND** 即使到达 cron 时间点也不会触发
- **AND** 用户重新启用后，调度器重新注册

---

### Requirement: 主进程鉴权

系统 SHALL 为 Electron 主进程与后端之间的内部 HTTP 通信提供鉴权机制。

#### Scenario: 启动时生成内部鉴权 Token

- **WHEN** Electron 应用启动
- **THEN** 主进程生成一个随机 `INTERNAL_AUTH_TOKEN`（如 `crypto.randomUUID()`）
- **AND** 写入 `process.env.INTERNAL_AUTH_TOKEN`
- **AND** UtilityProcess server 继承该环境变量
- **AND** 该 token 不持久化到磁盘，仅存在于本次进程生命周期

#### Scenario: 内部 API 校验 Token

- **GIVEN** 主进程调用 `/api/scheduled-jobs/:id/execute`
- **WHEN** 请求头包含 `X-Internal-Auth: <token>`
- **THEN** 后端中间件校验 token 是否与 `process.env.INTERNAL_AUTH_TOKEN` 匹配
- **AND** 匹配通过则允许访问 Internal Auth 白名单端点
- **AND** 执行任务时用户作用域来自 `scheduledJobs.userId`，而不是 `authService.getCurrentUserId()` 的默认用户回退
- **AND** 不匹配则返回 `401 UNAUTHORIZED`

#### Scenario: 鉴权方式覆盖

以下表格明确 `scheduled-jobs` 相关 API 端点接受的鉴权方式：

| Endpoint | Session Auth | Internal Auth |
|----------|:---:|:---:|
| `GET /api/scheduled-jobs` | ✓ | ✓ |
| `POST /api/scheduled-jobs` | ✓ | — |
| `PUT /api/scheduled-jobs/:id` | ✓ | — |
| `DELETE /api/scheduled-jobs/:id` | ✓ | — |
| `POST /api/scheduled-jobs/:id/execute` | ✓ (手动触发) | ✓ (定时触发) |
| `GET /api/scheduled-jobs/:id/logs` | ✓ | ✓ |

> 说明：`Internal Auth` 仅由 Electron 主进程调度器在定时触发和启动加载时使用。用户在前端手动操作时统一走 Session Auth。

#### Scenario: 内部执行保持用户隔离

- **GIVEN** 数据库中存在用户 A 和用户 B，且用户 B 拥有一个 `report_weekly` 任务
- **WHEN** 主进程通过 Internal Auth 调用用户 B 的任务执行接口
- **THEN** JobExecutor 使用该任务记录中的 `userId = 用户 B`
- **AND** 如果任务关联 `accountId`，系统校验该账户属于用户 B
- **AND** 不会读取或写入用户 A 的账户、报告、洞察或任务日志

---

### Requirement: 通用任务执行器

系统 SHALL 提供一个通用任务执行器（JobExecutor），根据任务的 `jobType` 路由到对应的现有业务服务，并统一记录执行结果。

#### Scenario: 提交周报生成任务

- **GIVEN** 一个 `jobType = "report_weekly"` 的定时任务，关联 account_id = 1
- **WHEN** JobExecutor 收到执行请求
- **THEN** 调用 `ReportService.generateReport({ accountId: "1", type: "weekly" })`
- **AND** 将报告生成请求提交成功视为本次定时任务执行成功
- **AND** 将执行结果记录到 `scheduledJobLogs`，状态从 `running` → `success`
- **AND** 在 `result` 字段中记录生成的报告 ID 和 `reportStatus: "pending"`
- **AND** 系统通知文案表达为“报告已开始生成”，不得表达为“报告已生成完成”

#### Scenario: 执行 AI 洞察任务

- **GIVEN** 一个 `jobType = "insight"` 的定时任务
- **WHEN** JobExecutor 收到执行请求
- **THEN** 获取当前用户所有持仓和组合信息
- **AND** 调用 `AIInsightsService.generateAIInsights(positions, portfolio)`
- **AND** 将生成的洞察保存到对应的数据存储
- **AND** 记录执行日志，状态从 `running` → `success`

#### Scenario: 执行任务时业务服务抛出异常

- **GIVEN** 一个定时任务在执行过程中
- **WHEN** 底层业务服务（如 ReportService）抛出异常
- **THEN** JobExecutor 捕获异常
- **AND** 将 `scheduledJobLogs` 中该次执行状态从 `running` → `failed`
- **AND** 记录错误堆栈到 `errorMessage`
- **AND** 不影响其他任务的后续调度
- **AND** 主进程收到 HTTP 失败响应后弹出失败通知

#### Scenario: 并发任务限制

- **GIVEN** 系统中配置了 5 个在同一时间点触发的定时任务
- **WHEN** 到达触发时间点
- **THEN** JobExecutor 使用自实现并发队列限制同时执行的任务数为 3
- **AND** 第 4、5 个任务排队等待，前一个完成后依次执行
- **AND** 队列满时主进程 HTTP 调用等待而非丢弃
- **AND** 单个任务的 `timeoutMs` 超时计时从其**实际开始执行**时算起，排队等待时间不计入

---

### Requirement: 任务执行结果通知

系统 SHALL 在定时任务执行完成后，通过 Electron 系统通知告知用户执行结果。

#### Scenario: 任务执行成功通知

- **GIVEN** 一个 "每日 AI 洞察" 定时任务执行完成
- **WHEN** 执行状态为 `success`
- **THEN** 主进程调度器弹出系统通知：
  - title："定时任务完成"
  - body："每日 AI 洞察 执行成功，共生成 4 条洞察"
- **AND** 点击通知时唤起应用主窗口

#### Scenario: 报告任务提交成功通知

- **GIVEN** 一个 "每周投资周报" 定时任务成功提交报告生成请求
- **WHEN** 执行状态为 `success` 且 `result.reportStatus = "pending"`
- **THEN** 主进程调度器弹出系统通知：
  - title："定时任务已开始"
  - body："每周投资周报 已开始生成，完成后可在报告列表查看"
- **AND** 点击通知时唤起应用主窗口

#### Scenario: 任务执行失败通知

- **GIVEN** 一个 "每周投资周报" 定时任务执行失败
- **WHEN** 执行状态为 `failed`
- **THEN** 主进程调度器弹出系统通知：
  - title："定时任务失败"
  - body："每周投资周报 执行失败，点击打开应用查看详情"
- **AND** 点击通知时唤起应用主窗口

---

### Requirement: 应用退出时优雅关闭

系统 SHALL 在应用退出时取消所有已注册的 cron 任务，防止进程残留。

#### Scenario: 正常退出应用

- **GIVEN** 主进程调度器注册了 3 个 cron 任务
- **WHEN** 用户退出应用（`app.on('before-quit')` 触发）
- **THEN** 调用 `scheduler.gracefulShutdown()` 取消所有 `Croner` 实例
- **AND** 等待正在执行中的任务完成（最多等待 10 秒）
- **AND** 清理 `Map<number, Croner>` 内存映射
- **AND** 允许应用正常退出

---

### Requirement: 唤醒后 Catch-up

系统 SHALL 检测系统睡眠期间错过的任务 trigger，并在唤醒后记录为 `missed` 状态。

#### Scenario: 睡眠期间错过任务

- **GIVEN** 存在一个 cron 为 `"0 15 * * *"` 的任务
- **AND** 系统在 14:58 进入睡眠
- **AND** 系统在 16:05 唤醒
- **WHEN** 主进程收到 `power-monitor` resume 事件
- **THEN** 计算睡眠期间 missed 的 trigger 时间点（15:00）
- **AND** 在 `scheduledJobLogs` 中创建记录，状态为 `missed`
- **AND** 不自动补执行（避免休眠后大量任务同时触发）
- **AND** 标记 missed 后，正常等待下一次 cron 触发

---

### Requirement: 现有调度器与新调度器共存

系统 SHALL 保持现有的 `useScheduler` hook 和 `SchedulerService` 不变，与新的可配置定时任务系统并存。

#### Scenario: 应用启动时同时初始化两类调度

- **WHEN** 应用启动
- **THEN** 系统首先执行原有的 `checkAndRunTasks`（`daily_snapshot` + `price_sync`），由前端 `useScheduler` hook 驱动
- **AND** 同时 Electron 主进程从 `scheduledJobs` 表加载所有启用的可配置任务，注册到 `croner` 调度器
- **AND** 本次可配置任务不得包含 `daily_snapshot` 或 `price_sync`
- **AND** 两者互相独立，失败不影响另一方
- **AND** `scheduledTaskLogs` 和 `scheduledJobLogs` 分别记录执行历史

#### Scenario: 未来迁移硬编码任务为可配置任务

- **GIVEN** 当前 `daily_snapshot` 和 `price_sync` 仍由 `useScheduler` 驱动
- **WHEN** 团队决定后续迭代将其迁移为可配置任务
- **THEN** 必须通过新的 OpenSpec 变更新增 `jobType: 'daily_snapshot'` 和 `jobType: 'price_sync'` 的可配置任务项
- **AND** 停止前端 `useScheduler` 的自动触发逻辑
- **AND** 迁移完成后，`scheduledTaskLogs` 中的旧历史记录保留，仅停止写入新记录

---

### Requirement: Agent 工具管理定时任务

系统 SHALL 在 Agent Chat 中提供工具，允许 AI Agent 帮用户创建、查询、修改定时任务。工具遵循项目既有模式：business 层 → `zod schema` + `langchainTool`/`claudeTool` 双导出 → `createSdkMcpServer` 注册。

#### Scenario: Agent 帮用户创建定时任务

- **GIVEN** 用户在 Chat 中说："帮我每周一早上 9 点生成投资周报"
- **WHEN** Agent 调用 `createScheduledJobClaudeTool`（或 Hermes 对应工具）
- **THEN** 工具调用 `src/server/core/business/scheduledJob.ts` 中的 `createScheduledJobBiz`
- **AND** 工具使用当前登录用户作为任务 `userId`
- **AND** 解析用户意图，提取：
  - `name`："投资周报"
  - `cronExpression`："0 9 * * 1"
  - `jobType`："report_weekly"
  - 关联当前默认账户
- **AND** 创建定时任务
- **AND**  Agent 回复："已为您创建定时任务'投资周报'，每周一上午 9:00 自动生成周报，下次执行时间为 XXXX-XX-XX 09:00。"

#### Scenario: Agent 查询现有定时任务

- **GIVEN** 用户询问："我设置了哪些定时任务？"
- **WHEN** Agent 调用 `listScheduledJobsClaudeTool`
- **THEN** 调用 `src/server/core/business/scheduledJob.ts` 中的 `listScheduledJobsBiz`
- **AND** 返回当前用户的所有定时任务摘要
- **AND** Agent 用自然语言总结（如"您目前设置了 2 个定时任务：每日 AI 洞察、每周投资周报"）

---

