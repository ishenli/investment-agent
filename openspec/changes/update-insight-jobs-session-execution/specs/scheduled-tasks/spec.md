# scheduled-tasks Delta

## MODIFIED Requirements

### Requirement: 通用任务执行器

系统 SHALL 提供一个通用任务执行器（JobExecutor），根据任务的 `jobType` 路由到对应的现有业务服务，并统一记录执行结果。洞察类（`insight`）定时任务执行走会话式 Agent 路径，使用该任务的 `config.instructions` 作为本轮提示词，并在每次执行时创建一个全新会话。

#### Scenario: 提交周报生成任务

- **GIVEN** 一个 `jobType = "report_weekly"` 的定时任务，关联 account_id = 1
- **WHEN** JobExecutor 收到执行请求
- **THEN** 调用 `ReportService.generateReport({ accountId: "1", type: "weekly" })`
- **AND** 将报告生成请求提交成功视为本次定时任务执行成功
- **AND** 将执行结果记录到 `scheduledJobLogs`，状态从 `running` → `success`
- **AND** 在 `result` 字段中记录生成的报告 ID 和 `reportStatus: "pending"`
- **AND** 系统通知文案表达为“报告已开始生成”，不得表达为“报告已生成完成”

#### Scenario: 执行会话式 AI 洞察任务

- **GIVEN** 一个 `jobType = "insight"` 的定时任务，其 `config.instructions` 已由用户在创建/编辑时填写
- **WHEN** JobExecutor 收到执行请求
- **THEN** 系统通过 `chatStorageService.createSession` 为本次执行创建一个全新的持久化会话
- **AND** 将 `config.instructions` 作为该会话的用户提示词传入 `HermesEngine`（headless）执行
- **AND** 执行上下文携带该任务的 `userId` 与 `accountId`，不依赖前端 session 推断用户
- **AND** 将引擎执行产出与会话关联保存，供用户回看本次洞察的完整上下文
- **AND** 将执行结果记录到 `scheduledJobLogs`，状态从 `running` → `success`
- **AND** 在 `result` 字段中记录本次执行对应的 `sessionId` 与产出摘要
- **AND** 系统通知文案指向该次洞察会话/洞察列表

#### Scenario: 洞察任务未配置提示词

- **GIVEN** 一个 `jobType = "insight"` 的定时任务但其 `config.instructions` 为空
- **WHEN** JobExecutor 收到执行请求
- **THEN** 系统返回执行失败
- **AND** 将 `scheduledJobLogs` 中该次执行状态从 `running` → `failed`
- **AND** 记录错误信息说明缺少指令描述（`config.instructions`）
- **AND** 不产生新会话，不影响其他任务调度

#### Scenario: 洞察会话创建失败

- **GIVEN** 一个 `jobType = "insight"` 的定时任务已配置 `config.instructions`
- **WHEN** `chatStorageService.createSession` 抛出异常（如 slug 冲突、数据库写入失败）
- **THEN** JobExecutor 捕获异常并将 `scheduledJobLogs` 中该次执行状态从 `running` → `failed`
- **AND** 记录错误堆栈到 `errorMessage`
- **AND** 不继续执行 Agent 引擎，也不触发成功通知
- **AND** 不影响其他任务的后续调度

#### Scenario: 执行任务时业务服务抛出异常

- **GIVEN** 一个定时任务在执行过程中
- **WHEN** 底层业务服务（如 ReportService）或 Agent 引擎抛出异常
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

## ADDED Requirements

### Requirement: 洞察定时任务的会话式执行与可定制提示词

系统 SHALL 允许每个洞察类定时任务通过其 `config.instructions` 定制每次执行的分析提示词，并在每次定时触发时创建一个全新的会话，将提示词作为该会话的用户输入，由 Agent 引擎 headless 执行，保证每次运行都是独立的、随提示词与最新数据演化的分析。

#### Scenario: 每次触发创建一个全新会话

- **GIVEN** 一个启用的 `jobType = "insight"` 定时任务，`cronExpression = "0 8 * * *"`
- **WHEN** 定时器在连续两个触发日各触发一次
- **THEN** 系统在每次触发时都通过 `chatStorageService.createSession` 创建一个不重复的全新会话
- **AND** 两次执行对应两个不同的 `sessionId`
- **AND** 每次执行都使用最新的持仓与组合数据，并将当次 `config.instructions` 作为提示词
- **AND** 前一次执行不影响后一次执行的内容与状态

#### Scenario: 洞察产出持久化与会话回看

- **GIVEN** 一个启用的洞察类定时任务已成功执行并创建一个全新的 `sessionId`
- **WHEN** Agent 引擎完成执行并产出分析文本
- **THEN** 系统通过 `chatStorageService.createMessage` 将产出的分析文本落为对应该 `sessionId` 的一条助手消息
- **AND** 将 `config.instructions` 对应的用户消息一并写入该会话
- **AND** 该次执行的 `sessionId` 与消息 id 记录到 `scheduledJobLogs.result`
- **AND** 洞察历史页能够从该次执行记录跳转到对应会话，展示完整对话上下文与生成分析

#### Scenario: 历史 scheduled 洞察兼容

- **GIVEN** 数据库中已存在 `source = "scheduled"` 且 `jobId` 关联的洞察记录（由旧实现产生）
- **WHEN** 系统升级到会话式执行后
- **THEN** 旧 `ai_insights` 记录保留、只读，不被删除或改写
- **AND** 洞察历史页仍能展示旧记录
- **AND** 新执行的洞察通过会话路径产生，不再写入 `ai_insights` 表
- **AND** 洞察历史页对新旧两类记录做聚合展示，旧记录来自 `ai_insights`，新记录来自会话式执行的产出，两者互不覆盖

### Requirement: 洞察产出持久化模型

系统 SHALL 将会话式洞察执行的产出持久化到该次新建的会话中（写入 `chatSessions` 关联的 `chatMessages`），并在 `scheduledJobLogs.result` 记录会话与消息引用，确保每次洞察产出可追溯、可回看，且与旧的 `ai_insights` 记录相互独立。

#### Scenario: 产出作为会话消息持久化

- **GIVEN** 洞察定时任务执行并创建了全新会话 `sessionId`
- **WHEN** Agent 引擎返回分析产出
- **THEN** 系统通过 `chatStorageService.createMessage` 将该产出作为助手消息写入 `sessionId` 对应的会话
- **AND** 用户消息（`config.instructions`）与助手产出在同一会话下可完整回溯
- **AND** 会话的 meta 标题反映该任务名称与执行日期

#### Scenario: 执行日志关联会话

- **GIVEN** 一次洞察定时任务成功执行
- **WHEN** 该执行写入 `scheduledJobLogs`
- **THEN** `scheduledJobLogs.result` 记录 `sessionId` 与消息 id
- **AND** 洞察历史页/执行日志页可据此跳转到对应会话回看