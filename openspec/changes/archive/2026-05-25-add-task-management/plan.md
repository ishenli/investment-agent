# 实现计划：任务管理系统（Task Management System）

**分支**：`feature/add-task-management` | **日期**：2026-05-25  **规范**：[add-task-management/proposal.md](file://openspec/changes/add-task-management/proposal.md)  
**输入**：来自 `openspec/changes/add-task-management/specs/task-management/spec.md` 的功能规范

---

## 概要

为投资 Agent 增加独立的任务管理 capability，将 AI 对话中生成的投资建议自动转化为可追踪、可执行的任务项。核心覆盖：数据模型（SQLite + Drizzle ORM）、后端 API（BaseController 模式）、前端 UI（看板 + 列表视图）、Agent 工具集成（`task_create`/`task_list`/`task_update`）。

第一阶段（MVP）交付：任务 CRUD、状态流转（pending/in_progress/completed/cancelled/expired）、前端页面、Agent 工具集成。第二阶段（Phase 2）交付：价格触发器、实时监测、过期自动标记。

---

## 技术上下文

| 维度 | 值 |
|------|-----|
| **语言** | TypeScript 5.6+ / Node.js 20+ |
| **运行时** | Next.js 16 App Router (SSR + Client) |
| **前端** | React 19 + Tailwind CSS + shadcn/ui |
| **状态管理** | React `useState` + Context（当前页面级） |
| **数据库** | SQLite (prod) via Drizzle ORM |
| **样式** | Tailwind CSS + `@renderer/components/ui` |
| **国际化** | `react-i18next`，文案存储于 `src/locales/` |
| **测试** | `npx tsc --noEmit` 类型检查（当前测试策略） |
| **Agent 框架** | LangGraph + OpenAI Function Calling |
| **性能目标** | 页面首屏 < 500ms，API 响应 < 200ms |
| **兼容性** | Electron 桌面端 + 浏览器端 |

---

## 规范检查

- ✅ 符合项目 [Constitution](file://openspec/agent/memory/constitution.md) 中的 TypeScript 严格模式要求
- ✅ 遵循现有 `@server/base/decorators` + `BaseController` + `BaseBizController` 三层架构
- ✅ Drizzle schema 定义兼容现有软删除（`deletedAt`）、时间戳（`createdAt`/`updatedAt`）惯例
- ✅ Delta 格式严格遵循 `## ADDED Requirements` + `#### Scenario:` 格式

---

## 项目结构

### 文档（此变更）

```text
openspec/changes/add-task-management/
├── proposal.md
├── plan.md                  ← 此文件
├── tasks.md
└── specs/
    ├── task-management/
    │   └── spec.md         ← 全新 capability 的完整 spec
    ├── agent-management/
    │   └── spec.md         ← Agent 工具集成 delta
    └── chat-api/
        └── spec.md         ← 聊天上下文透传 delta
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── api/
│   │   └── tasks/
│   │       ├── route.ts             # GET list / POST create
│   │       └── [id]/
│   │           └── route.ts         # GET by id / PUT update / DELETE by id
│   └── (pages)/
│   └── (pages)/
│       └── tasks/                 # 任务管理页面
│           ├── page.tsx
│           └── components/
│               ├── TaskBoard.tsx      # 看板视图
│               ├── TaskList.tsx       # 列表视图
│               ├── TaskCard.tsx       # 任务卡片
│               ├── TaskDetail.tsx     # 任务详情/编辑
│               └── TaskFilters.tsx    # 搜索+筛选
├── server/
│   ├── controller/
│   │   └── taskController.ts      # TaskBizController
│   └── core/
│       └── agents/
│           └── hermes/
│               └── registerBusinessTools.ts  # 新增 task_create/task_list/task_update 工具（直接在 registerBusinessTools.ts 中内联定义，与现有 28 个业务工具一致）
├── drizzle/
│   ├── schema.ts                  # 新增 tasks 表
│   └── migrations/                # 需要生成 migration
└── locales/
    ├── zh-CN/task.json            # 新增国际化
    └── en-US/task.json
```

**结构决策**：
- 任务 API 路由独立 `/api/tasks`，不与现有 API 耦合
- 前端页面独立路由 `/tasks`，侧边栏增加导航入口
- Agent 工具直接在 `registerBusinessTools.ts` 新增 3 个工具，复用已有的 DB 服务模式

---

## 需求拆分

### User Stories

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户可以在任务页面查看所有任务（按看板/列表切换），并拖拽修改状态 | 打开 `/tasks`，看到任务卡片，拖拽状态改变后刷新数据正确 |
| P1 | AI Agent 在聊天中识别建议后，建议用户创建任务，用户一键确认 | 在聊天中提示「是否将此建议创建为任务？」，确认后任务列表出现该任务 |
| P2 | 用户可以手动创建任务，填写标题、描述、截止日期、关联股票、优先级 | 点击「新建任务」按钮，弹出表单，提交后在看板 `pending` 列出现 |
| P2 | 用户可以编辑/删除任务，任务支持搜索和按状态/优先级/日期筛选 | 在任务页面使用搜索框和筛选标签，列表正确过滤 |
| P3 | 条件型任务（价格触发器）能在前端展示触发条件，并在标注为完成时询问执行结果 | 查看条件型任务的详情页，看到「当 X < Y 时触发」并记录执行备注 |

---

## 技术架构

### 数据流

```
[用户操作] → [Next.js API Route /tasks] → [TaskBizController]
                                            ↓
                                      [Drizzle ORM + SQLite]
                                            ↓
                                    [Response JSON]
                                            ↓
[Agent Chat] → [task_create 工具] → [直接写入 tasks 表]
                    ↓
            [LangGraph tool executor]
```

### 状态管理

- **服务端**：无服务端状态，请求即查即返回
- **客户端**：页面级 `useState` + `useEffect` 拉取数据（复用已有 Setting Tool 页面的取数模式）。Phase 2 如需跨页面共享任务状态，可引入 Zustand store
- **缓存策略**：当前无前端全局缓存，每次页面 mount 时 `fetch('/api/tasks')`

### 外部集成

- **价格触发器（Phase 2）**：复用现有 `stock_get_price` 工具的定时轮询逻辑，检查是否满足触发条件
- **Agent 工具集成**：在 `registerBusinessTools.ts` 中新增 `task_create`、`task_list`、`task_update`
- **i18n**：新增 `task.json` 文案文件，键命名空间统一为 `task.*`
- **自动过期**：复用现有 `scheduled-tasks` capability（`scheduledTaskLogs` 表 + daily snapshot 机制），在每日定时检查中将超期 pending 任务标记为 expired。无需独立实现调度器

---

## 复杂性跟踪

| 引入的复杂性 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|-------------|---------|--------------------------|
| 新增独立 `tasks` 表（而非扩展 `notes`） | 任务和笔记概念本质不同：笔记是静态记录，任务是行动项且需要状态流转、过期机制、条件触发 | 扩展 notes 会导致概念混淆，status/duedate/linkedSymbol 等字段无法被笔记业务合理解释 |
| 价格触发条件字段（`triggerPrice`, `triggerDirection`） | MVP 就需要预留基础设施，Phase 2 直接复用 | 如果不预留，Phase 2 需要再做一次 schema 迁移 |
| Agent 工具集成（3 个新工具） | AI 必须能主动创建和管理任务，否则闭环无法实现 | 纯手动创建无需此复杂度，但会丧失「建议 → 行动」的核心价值 |

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Schema 变更 + Migration 在 Electron 打包环境失败 | 高 | 复用现有 `DatabaseManager.migrate()` 逻辑，测试 dev + prod 双环境 |
| Agent 创建任务时缺少用户上下文（当前用户是谁）| 中 | 复用 `notes` 表的 `userId` 关联模式，Agent 通过 `chatSessionId` 反查用户 |
| 前端看板拖拽无现成库 | 低 | 项目无现成 DnD 库，Phase 1 MVP 可先使用「按钮改变状态」代替拖拽，Phase 2 引入 `@dnd-kit` |
| 任务表数据量增长快（每个 Agent 对话都可能产生任务） | 低 | 设置合理的默认分页（20 条/页）、自动归档已完成 30 天以上的任务 |

---

## 性能考虑

- 任务页面默认加载 **最近 50 条未完成任务**，已完成任务分页懒加载
- API 响应目标 **< 200ms**（SQLite 本地查询，无网络开销）
- 看板视图按状态分组由前端 `useMemo` 计算，减少重渲染

---

## 安全考虑

- 所有 Task API 路由需要 `authService` 校验用户身份（复用现有 `BaseController` 中的认证）
- 用户只能操作 `userId = currentUser` 的任务（Service 层过滤）
- Agent 工具创建任务时，强制指定 `userId` 为当前会话用户

---

## 测试策略

- **编译检查**：`npx tsc --noEmit`（主要验证类型安全）
- **手动验证**：
  1. 打开 `/tasks` 页面，新建/编辑/删除任务验证 CRUD
  2. 在 Agent 聊天中触发建议，验证「一键创建任务」流程
  3. 修改系统时间，验证过期任务自动标记
