# 实现计划：可配置定时任务系统

**分支**：`feat/cron` | **日期**：2026-05-26 | **规范**：`openspec/changes/add-configurable-scheduled-jobs/specs/scheduled-tasks/spec.md`
**输入**：来自 `/specs/scheduled-tasks/spec.md` 的功能规范

## 概要

构建一个用户可配置的通用定时任务系统，整合 AI 洞察、周报/月报等可自动化能力。现有快照和价格同步继续由旧调度器负责，本次不迁移，避免重复执行。核心架构为：
- **配置层**：SQLite 存储任务规则，支持 CRUD，用户隔离
- **调度层**：Electron 主进程 `croner` 解析 cron 并精准触发，通过 HTTP 调用后端
- **执行层**：后端 `JobExecutor` 路由到现有业务服务，自实现并发队列（并发数=3）
- **交互层**：前端设置页 + Agent 工具 + IPC 热重载通道

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20 / Electron >= 30
**主要依赖**：Next.js 16, React 19, croner, Drizzle ORM, LangChain.js
**存储**：SQLite (prod)
**测试**：Vitest, React Testing Library
**目标平台**：Electron 桌面端（本次不支持纯 Web 模式）
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：任务配置 CRUD API < 200ms，任务执行通知延迟 < 5s
**约束条件**：
- 必须兼容 Electron 主进程与 UtilityProcess server 的分离架构
- 系统睡眠/锁屏期间可能错过 trigger，支持唤醒后 catch-up
- `scheduledTaskLogs` 表结构不可破坏
- Internal Auth 只能证明请求来自 Electron 主进程，不能代表用户；执行器必须从 `scheduledJobs.userId` 建立用户上下文
- `ReportService.generateReport()` 当前为异步提交语义，定时任务成功表示报告任务已提交，不表示报告内容已完成生成
- 使用 `croner`（纯 JS、零原生依赖），避免 `node-schedule` 维护性风险
- 不使用 `p-queue`，自实现轻量并发队列（避免 ESM/CJS 冲突）

## 规范检查

- [ ] 检查是否符合 [项目规范](file://openspec/project.md)
- [ ] 检查 TypeScript 严格模式约束
- [ ] 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-configurable-scheduled-jobs/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── scheduled-tasks/
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
drizzle/
└── schema.ts                      # 新增 scheduledJobs、scheduledJobLogs 表
electron/
├── main.ts                        # 启动时初始化调度器、注册 IPC handlers、优雅退出
├── scheduler.ts                   # 主进程调度模块（新增）
└── preload.ts                     # 新增 IPC bridge（调度器重载通道）
src/
├── types/
│   └── scheduledJob.ts            # 共享类型定义
├── app/
│   ├── api/
│   │   └── scheduled-jobs/        # CRUD API + 执行 + 日志
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── execute/
│   │           │   └── route.ts
│   │           └── logs/
│   │               └── route.ts
│   └── (pages)/
│       └── setting/
│           └── scheduled-jobs/    # 前端设置页面
│               ├── page.tsx
│               └── components/
└── server/
    ├── repository/
    │   ├── scheduledJobRepository.ts    # 定时任务配置数据访问（新增）
    │   └── scheduledJobLogRepository.ts # 定时任务日志数据访问（新增）
    ├── service/
    │   ├── jobExecutorService.ts  # 通用任务执行器（新增）
    │   └── scheduledJobService.ts # 配置与日志服务（新增）
    ├── core/business/
    │   └── scheduledJob.ts        # 业务逻辑层（新增）
    ├── controller/
    │   └── scheduledJobController.ts
    └── core/agents/
        └── langchain/tools/
            └── scheduledJobTool.ts
```

**结构决策**：
- 调度核心放在 `electron/scheduler.ts`，因为主进程是唯一适合做 cron 调度的地方
- 主进程与后端通信采用 **HTTP + IPC 混合**：
  - **启动加载**：`waitForServer` → HTTP GET `/api/scheduled-jobs?enabled=true`（Internal Auth）→ 返回所有启用任务，执行时以每条任务自身的 `userId` 为准
  - **热重载**：前端 CRUD → `ipcRenderer.invoke('scheduler-reload-job', jobId)` → preload bridge → `ipcMain.handle('scheduler-reload-job')` → 主进程重新拉取 + 重新注册
- 业务执行放在 `src/server/service/jobExecutorService.ts`，复用现有 ReportService / AIInsightsService
- 新增 `src/server/core/business/scheduledJob.ts`，Agent 工具先调 biz 层再调 service，与 `taskTool.ts` 模式一致
- 前端页面放在 `/setting/scheduled-jobs/`（与现有设置路由一致）

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户可以在设置页配置定时任务（如每周一 9 点生成周报），任务在 Electron 主进程中按时触发 | 配置后等待到 cron 时间点，检查系统通知是否弹出，数据库日志是否有记录 |
| P2 | 用户可以通过 Agent 对话创建和管理定时任务 | 在聊天中让 Agent "帮我每天收盘后生成 AI 洞察"，验证任务是否创建成功 |
| P3 | 用户可以在设置页查看任务的执行历史，并手动触发执行 | 点击"立即执行"按钮，验证任务是否执行并记录日志 |
| P4 | 系统支持唤醒后 catch-up（睡眠期间错过的任务标记为 missed） | 模拟系统睡眠后唤醒，检查日志中是否有 missed 标记 |

## 技术架构

### 数据流

```
[用户在前端配置任务] → POST /api/scheduled-jobs → ScheduledJobService → SQLite
                              ↓
                    (after CRUD succeeds)
                    ipcRenderer.invoke('scheduler-reload-job')
                              ↓
                    preload.ts expose 'scheduler-reload-job'
                              ↓
                    ipcMain.handle('scheduler-reload-job')
                              ↓
                    electron/scheduler.ts 重新 HTTP GET 任务列表
                              ↓
                    croner 注册/更新/取消定时任务
                              ↓
                    [ cron 触发 ] → HTTP POST 127.0.0.1/api/scheduled-jobs/:id/execute
                              ↑
                    携带 X-Internal-Auth: <token>
                              ↓
                    JobExecutor → 从 job.userId 建立执行上下文 → 路由到 ReportService / AIInsightsService
                              ↓
                    记录日志到 scheduledJobLogs → IPC 返回结果
                              ↓
                    主进程 new Notification() 通知用户
```

### 主进程通信协议

| 场景 | 方向 | 协议 | 详情 |
|------|------|------|------|
| 启动加载任务 | 主进程 → 后端 | HTTP GET | `/api/scheduled-jobs?enabled=true`（Internal Auth Token 鉴权） |
| 定时触发执行 | 主进程 → 后端 | HTTP POST | `/api/scheduled-jobs/:id/execute`（Internal Auth Token 鉴权，执行用户来自 job 记录，超时 5 分钟） |
| 热重载通知 | 前端 → 主进程 | IPC | `ipcRenderer.invoke('scheduler-reload-job', jobId)` |
| 执行结果通知 | 后端 → 主进程 | IPC | 主进程 HTTP 调用后根据响应状态决定通知内容 |
| 唤醒 catch-up | OS → 主进程 | Electron event | `powerMonitor.on('resume', () => checkMissedJobs())` |
| 优雅退出 | OS → 主进程 | Electron event | `app.on('before-quit', () => scheduler.gracefulShutdown())` |

### 鉴权方案

当前系统以桌面应用为主，但数据库和服务层已有用户隔离字段。鉴权和用户上下文必须拆开：
- Electron 主进程启动时生成一个随机 `INTERNAL_AUTH_TOKEN`（如 `crypto.randomUUID()`），写入 `process.env`
- Server 的 UtilityProcess 继承该环境变量
- 主进程调用后端 API 时携带 header：`X-Internal-Auth: ${INTERNAL_AUTH_TOKEN}`
- 后端中间件校验该 header，通过则只允许访问 Internal Auth 白名单端点
- Internal Auth 请求不得调用 `authService.getCurrentUserId()` 来推断用户；`execute` 必须先按 jobId 读取任务，再使用 `scheduledJobs.userId` 和 `accountId` 做权限校验与业务执行
- 该 token 不持久化到磁盘，仅存在于本次进程生命周期中

### 状态管理
- **服务端**: 状态存储在 SQLite（`scheduledJobs` 表），Electron 主进程内存中维护 `croner` 的 `Cron` 实例映射（`Map<number, Cron>`）
- **客户端**: 设置页直接使用 React state + SWR（`useSWR` 缓存任务列表）
- **缓存策略**: 任务列表使用 SWR 缓存，执行日志按时间分页
- **`nextRunAt` 动态计算**: 不存入数据库，由 `scheduledJobService` 在返回任务详情时通过 `import { Cron } from 'croner'; new Cron(cronExpression).nextRun()` 动态计算并附加到响应 DTO 中。前端、Agent 工具和主进程调度器均消费此字段

### 外部集成
- **croner**: Electron 主进程的 cron 解析与调度引擎（纯 JS、零依赖、ESM+CJS 双模式）
- **Electron Notification**: 任务执行完成后的系统通知
- **现有业务服务**: `ReportService`、`AIInsightsService` — 尽量复用，仅通过 `JobExecutor` 路由调用
- **异步报告生成**: `ReportService.generateReport()` 返回 `pending` 表示报告生成已提交。JobExecutor 记录任务执行 `success` 时，`result` 必须包含 `reportId` 和 `reportStatus: "pending"`，通知文案使用“已开始生成”而不是“生成完成”。

## 复杂性跟踪

> **仅在规范检查有必须证明的违规时填写**

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 引入 Electron 主进程调度模块 | 必须在主进程做 cron 调度，UtilityProcess server 可能在前端关闭后被回收；前端 setInterval 在标签页休眠/页面关闭时不精确 | 前端轮询方案（`useScheduler`）已在现有代码中验证不可靠 |
| 新增 `scheduled_job_logs` 表而非复用 `scheduledTaskLogs` | 现有 `scheduledTaskLogs` schema 硬编码 `taskType: 'daily_snapshot' \| 'price_sync'`，且与旧版本幂等逻辑深度耦合 | 扩展旧表会导致迁移复杂且破坏已有定时任务的查询逻辑 |
| 自实现并发队列而非使用 `p-queue` | `p-queue` v7+ 为 ESM-only，与 electron `tsconfig.json` 的 `"module": "commonjs"` 冲突；v6 维护停滞 | 自实现队列仅需 ~30 行代码，无额外依赖 |
| HTTP + IPC 混合通信 | 启动加载必须用 HTTP（依赖 server 就绪），热重载需要 IPC（跨进程即时通知） | 纯 HTTP 无法解决热重载实时性；纯 IPC 无法解决 server 未就绪时的启动加载 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `croner` 在 Electron 打包后行为异常 | 低 | `croner` 纯 JS 无原生依赖；打包后在 `dist-electron/` 中 bundled 测试 |
| 系统睡眠导致任务 missed | 中 | 主进程监听 `power-monitor` resume 事件，唤醒后检查 missed trigger 并记录日志；不自动补执行避免雪崩 |
| 大量任务同时触发导致后端压力过大 | 中 | JobExecutor 自实现队列限制并发数为 3 |
| 用户配置非法 cron 表达式 | 低 | 创建/更新时 Zod 校验 + `croner` 解析验证 |
| 应用退出时 pending job 泄漏 | 低 | `app.on('before-quit')` 调用 `scheduler.gracefulShutdown()` 取消所有 cron job |
| Web 浏览器模式无 Electron 主进程 | 中 | 本次仅支持 Electron 桌面端；Web 模式暂不启用可配置定时任务（未来迭代） |
| Internal Auth 误用默认用户 | 高 | Internal Auth 只做来源鉴权；执行用户必须来自 `scheduledJobs.userId`，并在 execute/logs 测试中覆盖多用户隔离 |
| 报告生成异步导致成功状态误导 | 中 | 记录“提交成功”而非“生成完成”；通知和 result 字段明确 `reportStatus: pending` |

## 性能考虑

- 任务配置 CRUD API 响应时间 < 200ms
- 主进程启动时加载任务到调度器 < 500ms（假设任务数 < 50）
- 任务执行并发限制：3（自实现队列）
- 执行日志分页查询：每页 20 条，支持时间范围过滤
- 日志保留策略：默认保留最近 90 天，超期自动清理（JobExecutor 执行后触发）

## 安全考虑

- API 鉴权：常规路由走 `authService` session 鉴权；内部 API（主进程调用）走 `X-Internal-Auth` token 鉴权
- 用户隔离：Session Auth 查询使用当前用户 `userId`；Internal Auth 加载调度可读取所有启用任务，但执行和日志写入必须使用任务记录自带 `userId`
- 账户隔离：如果任务带 `accountId`，执行前必须校验该账户属于 `scheduledJobs.userId`
- `config` JSON 字段严格类型校验，防止注入
- Internal auth token 不持久化、不记录日志

## 测试策略

- **单元测试**: `jobExecutorService.ts` 的路由逻辑、`scheduledJobService.ts` 的 CRUD、`scheduledJob.ts` business 层、Internal Auth 用户上下文
- **集成测试**: API Routes 端到端（创建任务 → 立即执行 → 查询日志），覆盖 Session Auth 和 Internal Auth 两条路径
- **手动测试**: Electron 打包后验证主进程调度器、系统通知、热重载 IPC、唤醒 catch-up
