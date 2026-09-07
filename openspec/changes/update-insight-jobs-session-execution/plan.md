# 实现计划：洞察定时任务会话式执行

**分支**：`feature/update-insight-jobs-session-execution` | **日期**：2026-09-02 | **规范**：`openspec/changes/update-insight-jobs-session-execution/specs/scheduled-tasks/spec.md`
**输入**：来自上述 delta 规范的需求

## 概要

将 `jobType = "insight"` 定时任务从固定 LangGraph 生成流程迁移到会话式 Agent 执行：
每次触发时用 `config.instructions` 作为提示词，通过 `HermesEngine`（headless）执行，并创建一个全新的持久化会话。
复用现有 `agentJobExecutor` 的引擎运行模式，新增会话持久化与产出关联。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, LangChain.js, LangGraph, Drizzle ORM, HermesEngine
**存储**：SQLite (prod), IndexedDB (session 用 Dexie)
**测试**：Vitest, React Testing Library
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：单次洞察执行典型耗时 < 2 分钟（LLM 等待主导），不阻塞 UI
**约束条件**：必须兼容 Electron 定时任务；`config.instructions` 复用现有创建面板字段

## 规范检查

- 检查是否符合 [项目规范](file://openspec/agent/memory/constitution.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/update-insight-jobs-session-execution/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── scheduled-tasks/     # 影响的 capability
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── server/
│   ├── service/
│   │   ├── jobExecutorService.ts   # executeInsightJob 改用会话式执行
│   │   ├── agentJobExecutor.ts     # 支持洞察类型 + 创建/持久化会话
│   │   ├── chatStorageService.ts   # createSession 复用
│   │   └── aiInsightService.ts     # 洞察路径替换，保留旧方法兼容
│   ├── repository/
│   │   └── chat/
│   │       ├── session.ts           # 会话创建
│   │       └── message.ts           # 产出消息写入
│   └── core/
│       └── agents/hermes/engine.ts # HermesEngine 运行（复用）
└── app/(pages)/insight/            # 洞察历史展示对齐
```

**结构决策**：复用 `agentJobExecutor` 的 `HermesEngine` 运行机制，在其上扩展洞察类型与会话持久化；
不新增独立执行引擎，保持与现有 Agent 定时任务一致。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 洞察定时任务按 `config.instructions` 定制提示词并创建全新会话执行 | 连续两次触发得到不同 sessionId，产出随提示词变化 |
| P2 | 洞察产出与会话关联，可从洞察历史跳转回看上下文 | 历史页可点进对应会话 |
| P3 | 历史 `source = scheduled` 洞察兼容不被破坏 | 升级后旧记录仍显示 |

## 技术架构

### 数据流

```
[cron 触发] → [scheduledJobController.executeJob]
              → [jobExecutorService.executeJob (concurrency queue)]
                    → [executeInsightJob]
                          ├→ chatStorageService.createSession (全新会话)
                          ├→ HermesEngine.run(ctx, NoOpEventSink)
                          │     ctx.messages = [{ role:'user', content: config.instructions }]
                          │     ctx.sessionId = 新会话 id
                          ├→ 产出经 chatStorageService.createMessage 落为该会话的助手消息
                          ├→ 用户消息与助手产出自同一 sessionId 可回溯
                          ├→ scheduledJobLogs.result 记录 sessionId 与消息 id
                          └→ notificationService.createNotification
```

### 状态管理
- **服务端**: `scheduledJobLogs` 记录执行状态（pending→running→success/failed）
- **客户端**: 洞察历史沿用现有查询逻辑，新增会话跳转
- **缓存策略**: 无新增缓存

### 外部集成
- **HermesEngine**: 复用 headless 运行，`enableTools=true`
- **chatStorageService**: 每次执行创建会话（`type: 'agent'`，`slug: scheduled-insight-<jobId>-<timestamp>`）；执行产出经 `chatStorageService.createMessage` 落为该会话的助手消息，`config.instructions` 作为用户消息一并写入
- **数据库**: `scheduledJobs.config.instructions` 读取、`chatSessions` 新建、`chatMessages` 写入产出、`scheduledJobLogs` 记录（`result` 含 `sessionId` 与消息 id）

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 复用 Agent 路径替代 Graph | 用户明确要求“每次都是一次新的会话创建”，Graph 流程无会话概念 | 仅注入 prompt 到 Graph 不满足会话要求 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 会话数与洞察产出爆炸（每日产生新会话） | 中 | 会话按任务随 cron 频率生成；可在未来迭代做滚动清理 |
| 执行迁移后旧 `ai_insights` 停止写入 | 中 | 规范明确新旧记录分隔，洞察历史页兼容展示 |
| 未配置 instructions 导致失败 | 低 | 创建面板已预填模板默认指令，且执行前校验 |

## 性能考虑

- 洞察执行耗时受 LLM 主导，不应阻塞 UI；定时路径运行在后台
- 并发限制沿用现有 3 任务并发队列

## 安全考虑

- 执行上下文必须来自 `scheduledJobs.userId`，不依赖前端 session 推断用户（与现有 Internal Auth 规则一致）
- 洞察任务关联账户必须校验属于任务 `userId`

## 测试策略

- **单元测试**: `executeInsightJob` 读取 instructions、创建会话、产出关联、缺 instructions 失败分支、会话创建失败分支
- **集成测试**: `scheduled-jobs/:id/execute` 对洞察类型触发会话式执行并写 `scheduledJobLogs`
- **端到端测试**: 连续两次跑同一任务得到不同 sessionId，历史页可跳转会话