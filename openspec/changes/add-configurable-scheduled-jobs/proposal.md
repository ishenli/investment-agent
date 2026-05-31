# Change: Add Configurable Scheduled Jobs

> **Change ID**: `add-configurable-scheduled-jobs`  
> **Date**: 2026-05-26  
> **Author**: AI Assistant  
> **Status**: Draft (Pending Review)

## Why

当前系统的定时任务（`daily_snapshot`、`price_sync`）是硬编码的，用户无法自定义。随着系统能力的扩充（AI 洞察分析、周报/月报生成），用户需要一个可配置的定时任务中心，将现有能力按需编排为自动化工作流。例如：

- 每天收盘后自动生成 AI 投资洞察
- 每周一上午 9 点自动生成上周投资周报
- 每月 1 号自动生成上月月报
- 保留原有的每日快照和价格同步，由现有调度器继续负责；迁移到可配置任务放到后续变更

调研现有代码后，`SchedulerService` 仅支持两种硬编码任务的幂等执行，没有通用任务注册和调度机制。本变更旨在构建一个用户可配置、Electron 主进程驱动、后端可扩展的通用定时任务系统。

同时，随着 AI 洞察、AI 报告和定时任务都具备“生成分析结果”的入口，产品层面已经出现能力重叠。本变更需要同步完成信息架构收敛：**AI 洞察是轻量分析结果，AI 报告是结构化长期沉淀，定时任务是自动化触发器**。定时任务不应成为新的内容消费页，而应作为设置/自动化中心，负责规则、启停、下次执行时间和执行日志；洞察和报告内容仍分别回到各自页面消费。

## What Changes

- **新增 `scheduled_jobs` 表**：存储用户可配置的定时任务规则（名称、cron 表达式、任务类型、配置参数、启用状态、用户隔离）
- **新增 `scheduled_job_logs` 表**：记录每个可配置任务的执行历史（开始时间、状态、结果、错误信息）
- **新增依赖**：`croner`（纯 JS cron 调度器，替代 `node-schedule`，零原生依赖）
- **自实现轻量并发队列**：并发数为 3，替代 `p-queue`（避免 Electron `commonjs` 配置与 `p-queue` v7+ ESM-only 的冲突）
- **新增 Electron 主进程调度器**（`electron/scheduler.ts`）：
  - 使用 `croner` 解析 cron 表达式
  - 应用启动时通过 HTTP API 从后端加载所有启用的任务并注册到调度器（复用已有 `waitForServer`）
  - 任务触发时通过 HTTP API 调用后端执行（携带 `X-Internal-Auth` token）
  - 执行完成或异步任务提交成功后通过系统托盘通知告知用户
  - 支持配置变更时的热重载：通过 `ipcMain` / `preload.ts` / `ipcRenderer` 通道，前端 CRUD 后通知主进程重新拉取任务列表
  - 应用退出时 `app.on('before-quit')` 调用 `scheduler.gracefulShutdown()` 取消所有 pending job
  - 支持唤醒后 catch-up：`power-monitor` resume 时检查 missed trigger 并记录日志
- **新增 `JobExecutor` 服务**（`src/server/service/jobExecutorService.ts`）：
  - 通用任务执行路由器，根据 `jobType` 路由到现有业务服务
  - 复用 `ReportService.generateReport()`、`AIInsightsService.generateAIInsights()` 等已有能力
  - 通过任务记录中的 `userId` 和 `accountId` 显式执行用户隔离，不依赖 `authService.getCurrentUserId()` 的默认用户回退
  - 统一的执行日志记录，支持自实现并发队列（默认并发数=3）
- **新增 Business 层**（`src/server/core/business/scheduledJob.ts`）：
  - 框架无关的业务逻辑（任务配置 CRUD、执行调度逻辑）
  - 供 Agent 工具调用，保持与 `taskTool.ts` / `transactionTool.ts` 一致的架构模式
- **新增 REST API**（`/api/scheduled-jobs`，独立端点，不改动 `/api/scheduled`）：
  - `GET/POST/PUT/DELETE /api/scheduled-jobs` — 定时任务配置 CRUD
  - `POST /api/scheduled-jobs/:id/execute` — 立即执行指定任务
  - `GET /api/scheduled-jobs/:id/logs` — 查询任务执行历史
  - 新增 `/api/internal/scheduler/reload` — 内部 API，主进程 IPC 触发后调用
- **新增前端设置页面**（`/setting/scheduled-jobs`）：
  - 任务列表（状态、下次执行时间、最近执行结果）
  - 提供独立“新建定时任务”入口，用户无需先选择模板卡片即可打开创建面板
  - 添加/编辑任务面板采用“任务模板 + 自然语言说明”形式：用户选择任务模板、通知方式、任务名称、计划时间、关联账户，并用自然语言描述希望 AI 完成的分析重点
  - 执行日志面板
  - 手动触发执行按钮
  - 页面定位为“自动化规则管理”，不展示完整 AI 洞察内容或报告正文，仅提供跳转到洞察/报告结果页的入口
- **产品边界收敛**：
  - AI 洞察页承载“现在有什么值得注意”的轻量分析流，保留立即分析和历史洞察
  - AI 报告页承载周报/月报等长文沉淀，保留手动生成、进度查看、编辑和数据来源追溯
  - 定时任务页承载“什么时候自动帮我做”的自动化规则，不重复承载洞察/报告内容消费
  - 创建任务时优先使用面向用户的模板（如“每日 AI 投资洞察”“每周投资复盘”“每月资产报告”），而不是直接暴露 `jobType` 枚举
  - 自然语言任务说明写入 `scheduledJobs.config.instructions`，作为后续 AI 洞察/报告生成的用户偏好输入；本次不扩展为任意 Agent 定时工作流
  - 通知方式写入 `scheduledJobs.config.notificationChannel`，MVP 仅支持 `app`，为后续邮件/消息渠道预留
  - AI 洞察页和 AI 报告页可提供“自动分析设置/定期生成设置”入口，深链到定时任务创建流程
- **新增 Agent 工具**：
  - `createScheduledJob` / `listScheduledJobs` / `updateScheduledJob` / `deleteScheduledJob`
  - 工具定义遵循既有模式：`business` 层 → `langchainTool`/`claudeTool` 双导出 → `createSdkMcpServer` 注册
  - Agent 可通过对话帮用户创建定时任务（如"帮我每周一收盘后生成周报"）
- **平滑迁移策略**：
  - 现有 `scheduledTaskLogs` 表**原封不动**，新增 `scheduledJobLogs` 独立管理
  - 现有 `useScheduler` hook 与 `/api/scheduled` 路由**继续使用**，负责 `daily_snapshot` + `price_sync`
  - 本次可配置任务仅支持 `insight`、`report_weekly`、`report_monthly`，避免与旧调度器重复执行
  - 未来迭代通过单独 OpenSpec 变更将 `daily_snapshot`/`price_sync` 迁移为可配置任务，届时统一废弃 `useScheduler`

### 不在本次范围内的未来扩展
- 任务执行失败后的重试策略与指数退避
- 任务依赖链（如"价格同步完成后执行快照"）
- 多用户/多设备间的任务配置同步
- push 通知替代系统托盘通知
- 非 Electron 浏览器模式下的降级调度方案（本次仅支持 Electron 桌面端）

## Impact

- **新增 Specs**:
  - `specs/scheduled-tasks/spec.md` — delta 更新，新增通用定时任务需求
- **修改 Specs**:
  - `specs/scheduled-tasks/spec.md` — 扩展现有 capability
- **受影响代码区域**:
  - `drizzle/schema.ts` — 新增 `scheduledJobs`、`scheduledJobLogs` 表
  - `drizzle/migrations/` — 新增 migration 文件
  - `electron/main.ts` — 启动时初始化主进程调度器、注册 IPC handlers、优雅退出
  - `electron/scheduler.ts` — 新增主进程调度模块
  - `electron/preload.ts` — 新增 IPC bridge（调度器重载通道）
  - `src/server/core/business/scheduledJob.ts` — 新增 business 层
  - `src/server/service/jobExecutorService.ts` — 新增通用任务执行器
  - `src/server/service/scheduledJobService.ts` — 新增配置与日志服务
  - `src/server/controller/scheduledJobController.ts` — 新增控制器
  - `src/app/api/scheduled-jobs/` — 新增 API Routes
  - `src/app/api/internal/scheduler/reload/route.ts` — 新增内部重载 API
  - `src/app/(pages)/setting/scheduled-jobs/` — 新增前端设置页面
  - `src/server/core/agents/` — Agent 工具集新增 `scheduled_job` 相关工具
- **Schema 版本**：新增 2 个表 + 6 个索引，向后兼容，无破坏性变更；`scheduledTaskLogs` 表结构不变
- **新增依赖**：`croner`（cron 调度器）

## 边界与术语

| 术语 | 定义 |
|------|------|
| AI 洞察 | 轻量、短周期的分析结果，用于提示当前持仓风险、机会、异动和组合变化；内容消费发生在洞察页 |
| AI 报告 | 周报/月报等结构化、可编辑的长文分析沉淀；内容消费和编辑发生在报告页 |
| 定时任务（Scheduled Job） | 用户可配置的周期性自动化任务，由 cron 表达式驱动 |
| 自动化规则中心 | 定时任务页的产品定位，只管理触发规则、启停、下次执行时间、执行日志和结果跳转，不承载完整洞察/报告正文 |
| 任务类型（Job Type） | 本次新增任务的执行目标：`insight`（AI 洞察）、`report_weekly`、`report_monthly`；`daily_snapshot` 和 `price_sync` 仍由旧调度器负责 |
| 执行日志（Job Log） | 单次任务执行的开始时间、完成时间、状态（`pending`/`running`/`success`/`failed`/`missed`）、结果、错误信息的记录。异步报告生成任务提交成功时记录为 `success`，并在 `result` 中标记 `reportStatus: "pending"` |
| 主进程调度器（Main Process Scheduler） | Electron 主进程中基于 `croner` 的调度引擎，通过 HTTP 调用后端执行 |
| 热重载（Hot Reload） | 用户在 UI 中添加/修改/删除任务后，主进程调度器通过 IPC 通道感知变更、无需重启即可更新排程 |
| Internal Auth Token | 主进程与后端通信时使用的鉴权 token，仅证明请求来自主进程；用户作用域必须来自 `scheduledJobs.userId` |
| 自实现并发队列 | 简单的 `Promise.all` + 信号量实现，限制并发数为 3 |
