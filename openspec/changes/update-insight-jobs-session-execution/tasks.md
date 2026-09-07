# 任务：洞察定时任务会话式执行

**输入**：来自 `openspec/changes/update-insight-jobs-session-execution/specs/scheduled-tasks/spec.md` 的 delta 规范
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`
- 代码规范：`npm run lint`

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
| Graph | `src/server/core/graph/[capability]Graph.ts` |
| Store | `src/renderer/store/[capability]Store.ts` |
| Components | `src/components/[ComponentName]/` |
| Types | `src/shared/types/` |

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/update-insight-jobs-session-execution/`
- [x] T01 编写 proposal.md 描述变更意图和影响
- [x] T02 编写 spec delta 规范变更
- [x] T03 运行 `openspec validate update-insight-jobs-session-execution --strict` 验证

---

## 第1阶段：设置（基础设施）

**目的**：类型定义与执行上下文准备

- [x] T01 [P] 在 `src/server/service/agentJobExecutor.ts` 中扩展洞察执行上下文类型（含 `jobType`、`sessionId`、`userId`、`accountId`） <!-- id: 1 -->
- [x] T02 [P] 确认 `chatStorageService.createSession` 的 `CreateSessionParams` 满足洞察会话创建（slug 唯一、type=agent、config/meta） <!-- id: 2 -->
  - `CreateSessionParams = Omit<NewChatSession, 'id'|'createdAt'|'updatedAt'|'userId'>` 满足需求
  - 会话 config 使用最小 AgentConfig（model=default, provider=openai, params={}, systemRole=''）
  - slug 使用 `scheduled-insight-<jobId>-<timestamp>` 保证并发唯一

---

## 第2阶段：基础（服务层）

**目的**：核心执行逻辑，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [x] T03 重构 `src/server/service/jobExecutorService.ts` 的 `executeInsightJob`：改为会话式 Agent 执行 <!-- id: 3 -->
  - 读取 `job.config.instructions` 作为提示词
  - 通过 `chatStorageService.createSession` 创建全新会话（slug 含 `scheduled-insight-<jobId>-<timestamp>` 保证唯一）
  - 调用 `HermesEngine`（headless）执行，携带任务 `userId` 与 `accountId`
  - 产出经 `chatStorageService.createMessage` 落为该会话的助手消息，`config.instructions` 作为用户消息一并写入
  - 会话 id 与消息 id 记录到 `scheduledJobLogs` 的 `result`
- [x] T04 [P] 扩展 `src/server/service/agentJobExecutor.ts` 支持洞察类型执行与会话 + 消息持久化 <!-- id: 4 -->
  - 新增 `executeInsightAgentJob`：建会话 → 写用户消息 → 引擎执行 → 写助手消息
  - 通知链接指向 `/chat?session=<sessionId>`，data 带 sessionId / userMessageId / insightMessageId
  - 抽出 `runEngine` / `buildSystemPrompt` / `toSummary` 复用，`executeAgentJob` 同步简化
- [x] T05 [P] 保留 `aiInsightService` 旧方法供兼容，编写单元测试覆盖：读取 instructions、创建会话、产出落消息、缺 instructions 失败分支、会话创建失败分支 <!-- id: 5 -->
  - `src/server/service/__tests__/agentJobExecutor.test.ts`（5 个用例，全部通过）
  - `aiInsightService.createInsights` / `AIInsightsService.generateAIInsights` 保留给手动生成流程（`source='manual'`）

**检查点**：洞察执行逻辑就绪，可触发并通过通知回看

---

## 第3阶段：API

- [x] T06 确认/调整 `POST /api/scheduled-jobs/:id/execute` 对 `insight` 类型的用户作用域与账户校验 <!-- id: 6 -->
  - `ScheduledJobController.executeJob` 已通过 `getJobById(jobId, userId)`（`findByIdAndUserId`）做归属校验
  - 执行上下文使用 `job.userId` / `job.accountId`，不依赖前端 session 推断用户
- [x] T07 添加错误处理（缺 instructions、会话创建失败、引擎异常）与日志记录 <!-- id: 7 -->
  - 缺 instructions / 会话创建失败 / 引擎异常均在 executor 抛出，经 `executeJob` 统一标记 `failed` 并记录 `errorMessage`
  - 失败时不创建成功通知；不产生新会话（缺指令时）
- [x] T08 编写 API 集成测试：洞察类型触发走会话式执行，断言同时执行产生不同 `sessionId` 且 `scheduledJobLogs.result` 记录会话引用 <!-- id: 8 -->
  - `src/server/service/__tests__/jobExecutorService.test.ts`（5 个用例，覆盖两条执行不同 sessionId、result 记录、失败分支、队列释放）

---

## 第4阶段：User Story 1 - 会话式洞察执行 (优先级：P1) 🎯 MVP

**目标**：洞察定时任务用 `config.instructions` 定制提示词，每次触发创建全新会话
**独立测试**：连续两次跑同一任务得到不同 sessionId，执行日志 `success`

### 实现

- [x] T09 [US1] 在 `jobExecutorService.ts` 中实现 `executeInsightJob` 会话式分支 <!-- id: 9 -->
- [x] T10 [US1] 在 `agentJobExecutor.ts` 中实现洞察类型执行管道 <!-- id: 10 -->
- [x] T11 [US1] 创建/更新会话后保证 slug 唯一（`scheduled-insight-<jobId>-<timestamp>`） <!-- id: 11 -->
  - 时间戳到毫秒，测试断言 `/^scheduled-insight-42-\d+$/`
- [x] T12 [US1] 验证执行结果 `result` 字段记录 `sessionId` 与产出摘要 <!-- id: 12 -->
  - `JobExecutionResult` 新增 `sessionId` / `insightMessageId` 字段

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - 洞察历史关联会话 (优先级：P2)

**目标**：从洞察历史/执行日志可跳转回看该次会话上下文
**独立测试**：历史页可点进对应会话

### 实现

- [x] T13 [US2] 在洞察历史/执行日志展示中关联本次执行 `sessionId` 的跳转入口 <!-- id: 13 -->
  - 新增 `GET /api/insight-history` 聚合接口；`InsightHistory.tsx` 对 `source='agent'` 记录渲染「查看会话」按钮，`Link` 指向 `/chat?session=<id>`
- [x] T14 [US2] 验证跳转后展示该会话完整对话上下文 <!-- id: 14 -->
  - chat 页通过 `?session=`（SessionHydration）加载会话；会话内含用户指令消息 + 助手产出消息

---

## 第6阶段：User Story 3 - 历史兼容 (优先级：P3)

**目标**：旧 `source = scheduled` 洞察记录不被破坏
**独立测试**：升级后旧记录仍在洞察历史页展示

### 实现

- [x] T15 [US3] 洞察历史查询逻辑兼容新旧两条写入路径（`ai_insights` 旧记录 + 会话式新产出聚合展示） <!-- id: 15 -->
  - `AiInsightService.getInsightHistory` 聚合：`ai_insights`（manual/scheduled）+ 会话式（agent，来自 chatSessions slug 前缀 + 每条会话最新助手消息）
  - 配套 repository：`sessionRepository.findScheduledInsightSessionsByUserId`、`messageRepository.findAssistantMessagesBySessionIds`（避免 N+1）
- [x] T16 [US3] 验证升级后旧记录完整显示、不被删除改写，且新旧记录在历史页聚合展示不互相覆盖 <!-- id: 16 -->
  - `src/server/service/__tests__/aiInsightService.test.ts`（6 个用例：聚合倒序、source/type 过滤、分页、会话查询降级）

### 用户后续补充：旧定时洞察清理（超出原 spec 范围，产品决策）

- [x] 提供「清理旧定时洞察」能力：`DELETE /api/ai-insights` → `AiInsightController.cleanScheduledInsights` → `AiInsightService.cleanLegacyScheduledInsights` → `aiInsightRepository.deleteByUserIdAndSource(userId, 'scheduled')`
- [x] 洞察历史页新增「清理旧定时洞察」按钮（有确认提示），仅删除 `source='scheduled'` 的旧 `ai_insights` 残留，手动生成与会话式记录保留
- [x] 测试：`aiInsightService.test.ts` 新增 2 个清理用例（按用户删 scheduled、无残留返回 0），全量 934 用例通过

---

## 第7阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [x] T17 运行 `npm run lint` 并修复问题 <!-- id: 17 -->
  - 通过 eslint 校验新增文件；项目存量 68 errors / 1202 warnings 为基线，本次改动未新增
- [x] T18 运行 `npm run types:check` 确保类型正确 <!-- id: 18 -->
- [x] T19 运行 `npm test` 确保测试通过 <!-- id: 19 -->
  - 69 个测试文件 / 932 用例通过（8 跳过）
- [x] T20 更新洞察相关用户文档（如需要） <!-- id: 20 -->
  - 无既有用户文档涉及定时任务/洞察，无需更新

---

## 第8阶段：归档准备

- [x] T21 更新所有 TODO 状态为完成 <!-- id: 21 -->
- [x] T22 验证所有场景在 spec.md 中已实现 <!-- id: 22 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置 - 阻塞 API/UI
- **API（第3阶段）**：依赖基础阶段
- **User Stories**：依赖 API 和基础阶段
- **完善**：依赖期望的 US 完成

### 并行机会

- 类型定义与执行上下文可并行
- 服务层与 Agent 执行器存在依赖，需顺序
- 洞察历史兼容（US3）可在 US1 后并行