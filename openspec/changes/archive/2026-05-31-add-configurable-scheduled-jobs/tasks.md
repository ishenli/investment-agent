# 任务：可配置定时任务系统

**输入**：来自 `openspec/changes/add-configurable-scheduled-jobs/specs/scheduled-tasks/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/[capability]/route.ts` |
| Service | `src/server/service/[capability]Service.ts` |
| Controller | `src/server/controller/[capability]Controller.ts` |
| Business | `src/server/core/business/[capability].ts` |
| Graph | `src/server/core/agents/langchain/graphs/[capability]Graph.ts` |
| Store | `src/app/store/[capability]/store.ts` |
| Components | `src/app/(pages)/setting/[capability]/components/` |
| Types | `src/types/[capability].ts` |

---

## 第0阶段：准备（设计与验证）

- [ ] T00 创建变更目录结构 `openspec/changes/add-configurable-scheduled-jobs/` <!-- id: 0 -->
- [ ] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [ ] T02 编写 spec delta 规范变更 <!-- id: 2 -->
- [ ] T03 运行 `openspec validate add-configurable-scheduled-jobs --strict` 验证 <!-- id: 3 -->

---

## 第1阶段：设置（基础设施）

**目的**：类型定义、数据库 schema、依赖安装

- [ ] T004 在 `src/types/scheduledJob.ts` 中定义共享类型（ScheduledJob, ScheduledJobLog, JobType, CreateJobInput, UpdateJobInput, JobLogStatus 等；本次 JobType 仅包含 `insight`/`report_weekly`/`report_monthly`） <!-- id: 4 -->
- [ ] T005 [P] 安装依赖：`pnpm add croner`（cron 调度器，替代 node-schedule；验证 `next build` standalone 产物中可正常 import） <!-- id: 5 -->
- [ ] T006 [P] 更新 `drizzle/schema.ts` 新增 `scheduledJobs` 表和 `scheduledJobLogs` 表（含 userId、软删除、完整字段定义） <!-- id: 6 -->
- [ ] T007 [P] 运行 `drizzle-kit generate` 生成 migration 文件 <!-- id: 7 -->
- [ ] T008 [P] 运行 `drizzle-kit migrate` 应用 migration <!-- id: 8 -->

---

## 第2阶段：基础（服务层 + Business 层）

**目的**：核心业务逻辑、主进程调度器、任务执行器

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [ ] T009A [P] 新建 `src/server/repository/scheduledJobRepository.ts` — 封装 `scheduledJobs` 表的数据访问操作（继承 BaseIntRepository，含 CRUD、按 userId 查询、按启用状态过滤、软删除） <!-- id: 57 -->
- [ ] T009B [P] 新建 `src/server/repository/scheduledJobLogRepository.ts` — 封装 `scheduledJobLogs` 表的数据访问操作（继承 BaseIntRepository，含按 jobId/userId 查日志、分页、时间范围过滤、90 天清理） <!-- id: 58 -->
- [ ] T009 新建 `src/server/core/business/scheduledJob.ts` — 框架无关业务逻辑（create/list/update/delete scheduled job；execute scheduled job 的 biz 入口） <!-- id: 9 -->
- [ ] T010 新建 `src/server/service/scheduledJobService.ts` — 任务配置 CRUD + 日志查询（调用 Repository 层）；在返回任务详情时通过 `new Cron(cronExpression).nextRun()` 动态计算 `nextRunAt` 字段附加到响应中 <!-- id: 10 -->
- [ ] T011 新建 `src/server/service/jobExecutorService.ts` — 通用任务执行路由器（从 `scheduledJobs.userId` 建立执行上下文，路由到 ReportService / AIInsightsService） <!-- id: 11 -->
- [ ] T012 新建 `electron/scheduler.ts` — Electron 主进程调度模块（加载任务、注册 croner、HTTP 触发后端、系统通知、唤醒 catch-up、优雅退出） <!-- id: 12 -->
- [ ] T013 修改 `electron/main.ts` — 在 server 成功启动后初始化主进程调度器；注册 `scheduler-reload-job` IPC handler；`app.on('before-quit')` 调用 `scheduler.gracefulShutdown()`；生成 `INTERNAL_AUTH_TOKEN` 写入 process.env <!-- id: 13 -->
- [ ] T014 修改 `electron/preload.ts` — 新增 IPC bridge：`scheduler-reload-job` 通道供前端调用 <!-- id: 14 -->
- [ ] T015 在 `src/server/base/` 新增 Internal Auth Token helper，校验 `X-Internal-Auth` header；Internal Auth 只做来源鉴权，不得调用默认用户回退 <!-- id: 15 -->
- [ ] T015A 在执行器和服务层中实现用户隔离：Internal Auth 执行时从 job 记录读取 `userId`，并校验 `accountId` 属于该用户 <!-- id: 54 -->

**检查点**：
- `tsc --noEmit` 无新增编译错误
- 手动测试：Electron 启动后调度器能从后端加载现有任务并注册到 croner

---

## 第3阶段：API

- [ ] T016 新建 `src/app/api/scheduled-jobs/route.ts` — GET（列表+分页+过滤）/ POST（创建） <!-- id: 16 -->
- [ ] T017 新建 `src/app/api/scheduled-jobs/[id]/route.ts` — PUT（更新）/ DELETE（软删除） <!-- id: 17 -->
- [ ] T018 新建 `src/app/api/scheduled-jobs/[id]/execute/route.ts` — POST 立即执行（支持 Session Auth 手动触发和 Internal Auth 定时触发，两者都必须以 job 所属用户执行） <!-- id: 18 -->
- [ ] T019 新建 `src/app/api/scheduled-jobs/[id]/logs/route.ts` — GET 执行日志（分页+时间范围） <!-- id: 19 -->
- [ ] T020 新建 `src/app/api/internal/scheduler/reload/route.ts` — POST 内部 API：通知后端 reload 已完成（可选，用于日志/审计） <!-- id: 20 -->
- [ ] T021 新建 `src/server/controller/scheduledJobController.ts` — 业务控制器 <!-- id: 21 -->
- [ ] T022 所有 API 添加 Zod 请求校验和统一错误处理 <!-- id: 22 -->

**检查点**：API 能通过 curl / Postman 完整测试 CRUD + execute + logs

---

## 第4阶段：User Story 1 - 前端设置页管理定时任务 (优先级：P1) 🎯 MVP

**目标**：用户可以在设置页创建、编辑、启用/禁用、删除定时任务
**独立测试**：打开设置页 → 添加一个 "每5分钟执行" 的测试任务 → 等待触发 → 检查系统通知和执行日志

### 实现

- [ ] T023 [P] [US1] 新建 `src/app/(pages)/setting/scheduled-jobs/page.tsx` 设置页面骨架 <!-- id: 23 -->
- [ ] T024 [P] [US1] 新建 `src/app/(pages)/setting/scheduled-jobs/components/JobList.tsx` — 任务列表组件（状态、下次执行时间、最近结果、启用开关） <!-- id: 24 -->
- [ ] T025 [P] [US1] 新建 `src/app/(pages)/setting/scheduled-jobs/components/JobForm.tsx` — 添加/编辑表单（任务模板、通知方式、名称、计划时间、关联账户、自然语言说明；主流程不直接暴露 `jobType` 枚举，并将说明写入 `config.instructions`） <!-- id: 25 -->
- [ ] T026 [P] [US1] 新建 `src/app/(pages)/setting/scheduled-jobs/components/JobLogs.tsx` — 执行日志面板（时间、状态、耗时、错误信息） <!-- id: 26 -->
- [ ] T027 [US1] 新建 `src/app/(pages)/setting/scheduled-jobs/components/CronInput.tsx` — cron 表达式输入组件，优先评估 `react-cron-generator` 等开源方案，不满足再自研（简化版：分钟/小时/日/月/周几） <!-- id: 27 -->
- [ ] T028 [US1] 在设置侧边栏 `settings-sidebar.tsx` 中添加 "定时任务" 入口（同步修改 `SettingsCategory` union type + `settingsItems` 数组 + `pathname.split('/').pop()` 路由映射逻辑） <!-- id: 28 -->
- [ ] T029 [US1] 实现"立即执行"按钮及加载状态；报告类任务成功文案显示“已开始生成”，不显示“已完成生成” <!-- id: 29 -->
- [ ] T030 [US1] 前端 CRUD 操作成功后调用 `window.electronAPI.reloadScheduledJob(jobId)` 触发 IPC 热重载 <!-- id: 30 -->
- [ ] T030A [US1] 确保定时任务页仅展示自动化规则、执行摘要和结果跳转；完整 AI 洞察内容回到洞察页，完整报告内容回到报告页 <!-- id: 59 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - Agent 工具集成 (优先级：P2)

**目标**：用户可以通过 Agent 对话创建和管理定时任务
**独立测试**：在 Chat 中让 Agent "帮我每天收盘后生成 AI 洞察"，验证任务是否创建成功

### 实现

- [ ] T031 [P] [US2] 新建 `src/server/core/agents/langchain/tools/scheduledJobTool.ts` — LangChain Tool + Claude Tool 双模式（create/list/update/delete），调用 `src/server/core/business/scheduledJob.ts` 而非直接调 service <!-- id: 31 -->
- [ ] T032 [P] [US2] 更新 `src/server/core/agents/langchain/tools/index.ts` 导出 scheduledJobTool <!-- id: 32 -->
- [ ] T033 [P] [US2] 更新 `src/server/core/agents/claude/buildTools.ts` 注册 Claude Tools <!-- id: 33 -->
- [ ] T034 [P] [US2] 更新 `src/server/core/agents/hermes/registerBusinessTools.ts` 注册 Hermes Tools <!-- id: 34 -->
- [ ] T035 [US2] Agent 工具返回人类友好的任务摘要（包含下次执行时间 human-readable 描述） <!-- id: 35 -->

**检查点**：在 Chat 中能用自然语言让 Agent 管理定时任务

---

## 第6阶段：User Story 3 - 执行历史与手动触发 (优先级：P3)

**目标**：用户查看执行历史并手动触发，系统通知用户执行结果
**独立测试**：点击"立即执行" → 等待 10-60 秒 → 系统通知弹出 → 日志面板显示成功/失败

### 实现

- [ ] T036 [US3] `jobExecutorService` 集成后端执行日志记录到 `scheduledJobLogs`（含 `pending` → `running` → `success`/`failed` 状态流转；报告类任务 `success` 表示提交成功，`result.reportStatus = "pending"`） <!-- id: 36 -->
- [ ] T037 [US3] `electron/scheduler.ts` 任务完成后调用 `new Notification()` 弹出系统通知 <!-- id: 37 -->
- [ ] T038 [US3] 通知内容根据任务类型和结果动态生成（成功/失败/部分失败），点击通知唤起应用主窗口 <!-- id: 38 -->
- [ ] T039 [US3] 前端 JobLogs 组件支持自动刷新和手动刷新 <!-- id: 39 -->
- [ ] T040 [US3] `jobExecutorService` 添加日志自动清理：保留最近 90 天，超期自动删除 <!-- id: 40 -->

---

## 第7阶段：User Story 4 - 唤醒后 Catch-up (优先级：P4)

**目标**：系统睡眠期间错过的任务被检测到并标记
**独立测试**：配置一个高频任务（每 1 分钟），让电脑睡眠 5 分钟，唤醒后检查日志是否有 missed 标记

### 实现

- [ ] T041 [US4] `electron/scheduler.ts` resume 事件处理：计算睡眠期间 missed 的 trigger 时间点 <!-- id: 41 -->
- [ ] T042 [US4] 对 missed 的任务在 `scheduledJobLogs` 中记录 `status: 'missed'` <!-- id: 42 -->
- [ ] T043 [US4] 前端任务详情页显示 missed 计数和最后一次 missed 时间 <!-- id: 43 -->

---

## 第8阶段：完善与质量保证

**目的**：跨用例的改进和质量检查

- [ ] T044 运行 `npm run lint` 并修复问题 <!-- id: 44 -->
- [ ] T045 运行 `npm run types:check` 确保类型正确 <!-- id: 45 -->
- [ ] T046 运行 `npm test` 确保测试通过 <!-- id: 46 -->
- [ ] T047 Electron 打包后手动验证主进程调度器工作正常（croner 在 dist-electron/ 中的行为） <!-- id: 47 -->
- [ ] T048 编写 `scheduledJobService` 单元测试 <!-- id: 48 -->
- [ ] T049 编写 `jobExecutorService` 单元测试（mock 各业务服务，覆盖多用户隔离和 accountId 归属校验） <!-- id: 49 -->
- [ ] T050 编写 `scheduledJob.ts` business 层单元测试 <!-- id: 50 -->
- [ ] T050A 编写 API 集成测试：Session Auth 创建/手动执行，Internal Auth 定时执行，非法 token 返回 401 <!-- id: 55 -->
- [ ] T050B 编写报告类任务测试：`ReportService.generateReport()` 返回 pending 时，日志记录 success + `result.reportStatus = "pending"` <!-- id: 56 -->

---

## 第9阶段：归档准备

- [ ] T051 更新所有 TODO 状态为完成 <!-- id: 51 -->
- [ ] T052 验证所有场景在 spec.md 中已实现 <!-- id: 52 -->
- [ ] T053 运行 `openspec validate add-configurable-scheduled-jobs --strict` 最终验证 <!-- id: 53 -->

---

## 依赖关系

### 阶段依赖

```
第0阶段（设计） → 第1阶段（基础设施） → 第2阶段（服务层+Business层） → 第3阶段（API）
                                                                          ↓
                                            第4阶段（前端 P1） ←──────────┘
                                                                          ↓
                                            第5阶段（Agent P2） ←─────────┘
                                                                          ↓
                                            第6阶段（通知 P3） ←──────────┘
                                                                          ↓
                                            第7阶段（catch-up P4） ←──────┘
                                                                          ↓
                                            第8阶段（QA）
                                                                          ↓
                                            第9阶段（归档）
```

### 并行机会

- T009A（scheduledJobRepository）与 T009B（scheduledJobLogRepository）可并行，且与 T012（主进程调度器）并行
- T009（business 层）与 T010（service 层）与 T011（执行器）依赖 T009A/T009B 完成后可并行
- T013（main.ts 修改）依赖 T012（scheduler.ts）完成
- T014（preload.ts）与 T015（鉴权中间件）可以并行
- T023-T030（前端组件）在 API 完成后可内部并行
- T031-T035（Agent 工具）在 API + business 层完成后可并行
- T048-T050（单元测试）可与服务层实现并行

## 关键检查点总结

| 检查点 | 验证标准 |
|--------|---------|
| CP1（第2阶段后） | `electron/scheduler.ts` 能在 Electron 启动时通过 HTTP 加载并注册任务到 croner |
| CP2（第3阶段后） | API CRUD + execute + logs 全部通过 curl 测试，Internal Auth 鉴权生效 |
| CP3（第4阶段后） | 用户能在设置页完整管理定时任务，手动触发能执行并记录日志，IPC 热重载生效 |
| CP4（第5阶段后） | Agent 能通过对话帮用户创建定时任务 |
| CP5（第8阶段后） | `tsc --noEmit` 无新增错误，`npm test` 全部通过 |
