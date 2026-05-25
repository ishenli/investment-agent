# 任务清单：独立任务管理系统（Task Management System）

**输入**：来自 `openspec/changes/add-task-management/specs/task-management/spec.md` 的设计文档
**前置条件**：`plan.md`（已确认通过）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 编译检查：`npx tsc --noEmit`
- 格式化：`npm run lint`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

---

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

---

## 第0阶段：准备（设计与验证）

- [ ] T00 创建变更目录结构 `openspec/changes/add-task-management/` <!-- id: 0 -->
- [ ] T01 编写 `proposal.md` 描述变更意图和影响 <!-- id: 1 -->
- [ ] T02 编写 `plan.md` 技术设计文档 <!-- id: 2 -->
- [ ] T03 编写 `tasks.md` 实现任务清单 <!-- id: 3 -->
- [ ] T04 编写所有 spec delta 文件：
  - `specs/task-management/spec.md`（全新 capability）
  - `specs/agent-management/spec.md`（Agent 工具集成 delta）
  - `specs/chat-api/spec.md`（聊天上下文透传 delta）
  <!-- id: 4 -->
- [ ] T05 运行 `openspec validate add-task-management --strict` 验证通过 <!-- id: 5 -->

---

## 第1阶段：数据库 + 类型定义（Foundation）

**目的**：数据模型是前后端的共同契约，必须最先完成

**⚠️ 关键**：此阶段完成前不应开始 API/UI 工作

- [ ] T06 在 `drizzle/schema.ts` 新增 `tasks` 表定义：
  - id, userId, title, description
  - status (pending | in_progress | completed | cancelled | expired)
  - type (one_time | price_trigger | monitoring | date_driven)
  - priority (low | medium | high | urgent)
  - linkedSymbols (JSON 数组), triggerPrice, triggerDirection, triggerExecutedAt
  - dueDate, completedAt, executionNotes
  - sourceType (agent_chat | analysis_report | manual), sourceId
  - createdAt, updatedAt, deletedAt（软删除）
  - 索引：idx_tasks_user_id, idx_tasks_user_status, idx_tasks_due_date, idx_tasks_deleted_at
  <!-- id: 6 -->
- [ ] T07 生成 Drizzle migration：`npx drizzle-kit generate` <!-- id: 7 -->
- [ ] T08 在 `src/types/task.ts` 定义共享类型：`Task`, `TaskStatus`, `TaskType`, `TaskPriority`, `CreateTaskInput`, `UpdateTaskInput`, `TaskFilters` 等 <!-- id: 8 -->
- [ ] T09 在 `src/server/repository/taskRepository.ts` 实现 Repository 层：CRUD + 搜索/分页/按状态分组 + 软删除 + 过期任务查询 <!-- id: 9 -->

**检查点**：Schema 创建完成，Repository 可通过单元/集成测试读写数据

---

## 第2阶段：后端服务 + 控制器

**目的**：核心业务逻辑和数据访问，必须在 UI 前完成

- [ ] T10 [P] 在 `src/server/service/taskService.ts` 实现 Service 层：
  - `createTask`, `updateTask`, `deleteTask`, `getTaskById`
  - `listTasks(filters, pagination)` — 支持搜索词、状态过滤、优先级过滤、日期范围
  - `getTasksByStatus(userId)` — 按状态分组（用于看板视图）
  - `markExpiredTasks()` — 将超期 pending 任务自动改为 expired
  <!-- id: 10 -->
- [ ] T11 [P] 在 `src/server/controller/taskController.ts` 实现 `TaskBizController`，继承 `BaseBizController`，暴露 `create/update/delete/list/getById/markExpired` 方法 <!-- id: 11 -->
- [ ] T12 在 `src/app/api/tasks/route.ts` 和 `src/app/api/tasks/[id]/route.ts` 实现 Next.js API Route：
  - `GET /api/tasks?status=&priority=&search=&limit=&offset=` → 列表查询（支持过滤和分页）
  - `POST /api/tasks` → 创建任务（body: CreateTaskInput）
  - `GET /api/tasks/[id]` → 获取单个任务详情
  - `PUT /api/tasks/[id]` → 更新任务（支持 partial body，包含状态变更）
  - `DELETE /api/tasks/[id]` → 软删除任务
  <!-- id: 12 -->

**检查点**：通过 Postman / curl 可完整测试 Task API CRUD

---

## 第3阶段：Agent 工具集成

**目的**：Agent 闭环能力，允许 AI 在对话中创建和管理任务

- [ ] T13 在 `src/server/core/agents/hermes/registerBusinessTools.ts` 新增 3 个工具：
  - `task_create` — 创建任务（复用 taskService.createTask）
  - `task_list` — 查询当前用户的任务列表
  - `task_update` — 更新任务状态或内容
  <!-- id: 13 -->
- [ ] T14 在 `registerBusinessTools.ts` 中新增 3 个工具的同时，在 `src/server/core/tools/toolMetadata.ts`（或统一工具定义文件）为 `task_create`/`task_list`/`task_update` 补充参数定义和描述，保持与 Phase 1 工具展示系统的元数据来源一致 <!-- id: 14 -->
- [ ] T15 在 Agent Prompt 中新增「投资建议 → 任务建议」指令：当 Agent 给出建议时，主动询问用户是否需要创建为任务 <!-- id: 15 -->

**检查点**：在聊天窗口中，AI 可建议创建任务，用户确认后任务出现在列表

---

## 第4阶段：前端页面（User Story 1 - 任务看板/列表）🎯 MVP

**目标**：用户可在 `/tasks` 页面查看和管理所有任务
**独立测试**：打开 `/tasks`，验证新建/编辑/删除/搜索/筛选/状态切换

### 实现

- [ ] T16 [P] 在 `src/app/(pages)/tasks/page.tsx` 创建任务页面主入口，包含：
  - Tab 切换（看板视图 | 列表视图）
  - 新建任务按钮
  - 搜索栏 + 筛选标签（全部、待办、进行中、已完成、已取消）
  <!-- id: 16 -->
- [ ] T17 [P] [US1] 在 `src/app/(pages)/tasks/components/TaskBoard.tsx` 实现看板视图：
  - 按状态分 4 列（Pending / In Progress / Completed / Cancelled）
  - 每列显示任务卡片
  - Phase 1 使用「拖拽按钮」或「状态下拉选择」代替原生拖拽（项目无 DnD 库）
  <!-- id: 17 -->
- [ ] T18 [P] [US1] 在 `src/app/(pages)/tasks/components/TaskList.tsx` 实现列表视图：
  - 表格列：状态图标、标题、关联资产、优先级、截止日期、操作按钮
  - 支持排序（按日期、优先级）
  <!-- id: 18 -->
- [ ] T19 [P] [US1] 在 `src/app/(pages)/tasks/components/TaskCard.tsx` 实现卡片组件：
  - 显示状态 Badge、优先级颜色、关联资产标签、截止日期
  - 点击打开详情抽屉/弹窗
  <!-- id: 19 -->
- [ ] T20 [P] [US1] 在 `src/app/(pages)/tasks/components/TaskEditor.tsx` 实现统一任务编辑器组件（支持 mode='create' | 'view' | 'edit'）：
  - `create` 模式：弹出表单，字段包括标题*、描述、类型选择、关联股票输入、触发条件（条件型任务）、优先级选择、截止日期选择器
  - `view` 模式：展示完整字段（标题、描述、状态、类型、条件、来源、执行备注等），可切换到 edit
  - `edit` 模式：与 create 同表单，预填充数据，支持更新和删除
  <!-- id: 20 -->
- [ ] T21 [US1] 在页面中集成加载/错误/空状态处理 <!-- id: 21 -->
- [ ] T22 [US1] 验证响应式布局（桌面端为主） <!-- id: 22 -->

**检查点**：US1 功能完整可用（通过手动测试验证）

---

## 第5阶段：前端筛选与 URL 持久化（User Story 2）

**目标**：用户可通过搜索和多维度筛选快速定位任务
**独立测试**：在任务页面使用搜索框和筛选标签，列表正确过滤

### 实现

- [ ] T23 [P] [US2] 在 `src/app/(pages)/tasks/components/TaskFilters.tsx` 实现筛选栏：
  - 搜索框（标题+描述模糊匹配）
  - 状态多选筛选
  - 优先级多选筛选
  - 日期范围筛选
  <!-- id: 23 -->
- [ ] T24 [US2] （Phase 2 / P3）将筛选条件同步到 URL query（支持刷新后保持筛选状态） <!-- id: 24 -->

---

## 第6阶段：条件型任务展示（User Story 3 - Phase 2 预留）

**目标**：条件型任务可在前端展示触发条件，并在完成时记录执行备注
**独立测试**：查看一个条件型任务详情，看到「当 AAPL < $200 时执行」，标注完成后出现执行备注输入框

- [ ] T26 [US3] 在 `TaskCard` / `TaskDetail` 中为条件型任务展示触发条件文字（如「价格触发：当 AAPL < $200 时执行买入」） <!-- id: 26 -->
- [ ] T27 [US3] 在任务状态变更为 completed 时，弹出「投资执行备注」模态框，记录用户实际执行结果 <!-- id: 27 -->

---

## 第7阶段：国际化与文案

- [ ] T28 在 `src/locales/zh-CN/task.json` 和 `src/locales/en-US/task.json` 添加所有任务相关文案 <!-- id: 28 -->
- [ ] T29 在组件中使用 `useTranslation('task')` 替换所有硬编码中文 <!-- id: 29 -->

---

## 第8阶段：完善与质量保证

**目的**：跨功能改进和质量检查

- [ ] T30 运行 `npx tsc --noEmit` 并修复类型错误 <!-- id: 30 -->
- [ ] T31 运行 `npm run lint` 并修复代码风格问题 <!-- id: 31 -->
- [ ] T32 在侧边栏导航增加「任务」入口（确认路由 `/tasks` 可访问） <!-- id: 32 -->
- [ ] T33 验证 `npm run build` 打包通过（注意 Electron 二进制下载瓶颈可本地处理） <!-- id: 33 -->
- [ ] T34 撰写 CHANGELOG.md 片段（MVP 交付说明） <!-- id: 34 -->
- [ ] T35 performance check：滚动 50+ 任务时无卡顿 <!-- id: 35 -->

---

## 第9阶段：归档准备

- [ ] T36 更新所有 TODO 状态为完成 <!-- id: 36 -->
- [ ] T37 验证所有场景在 spec.md 中已实现 <!-- id: 37 -->
- [ ] T38 运行 `openspec validate add-task-management --strict` 确认变更通过验证 <!-- id: 38 -->
- [ ] T39 将 `changes/add-task-management/` 归档到 `changes/archive/YYYY-MM-DD-add-task-management/` <!-- id: 39 -->

---

## 依赖关系

### 阶段依赖

```
T00-T05 (准备)
    ↓
T06-T09 (数据库+类型) ───────────────────┐
    ↓                                    │
T10-T12 (后端服务+API)                    │
    ↓                                    │
T13-T15 (Agent 工具)                     │
    ↓                                    │
T16-T22 (前端页面 US1) ←─────────────────┘
    ↓
T23-T24 (前端筛选)
    ↓
T26-T27 (条件型任务 US3)
    ↓
T28-T29 (i18n)
    ↓
T30-T39 (QA + 归档)
```

### 并行机会

- T06（Schema）和 T08（类型定义）可并行
- T10（Service）和 T09（Repository）可并行（需接口先定义）
- T16（页面框架）和 T17/T18（看板/列表组件）可并行
- T28-T29（i18n）可与其他 UI 任务并行
- **注意**：T15（Agent Prompt）依赖 T13（工具注册），T14 与 T13 可并行
