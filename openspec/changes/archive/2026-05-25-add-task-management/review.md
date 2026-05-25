# Review: add-task-management

> **Reviewer**: AI Code Reviewer  
> **Date**: 2026-05-25  
> **Overall Verdict**: ✅ Approved with Required Changes (Minor)

---

## A) Spec 质量

### A1. 需求清晰度与可验证性

| Spec 文件 | 评分 | 评价 |
|-----------|------|------|
| `task-management/spec.md` | ⭐⭐⭐⭐ | 核心 CRUD 场景清晰、可测试；状态流转定义明确 |
| `agent-management/spec.md` | ⭐⭐⭐⭐ | 四个 Scenario 覆盖了工具注册和主要使用场景 |
| `chat-api/spec.md` | ⭐⭐⭐½ | SSE 事件格式清晰，但"避免重复任务"的 Scenario 用了 SHOULD 而非 SHALL，难以严格测试 |

**优点**：
- 每个 Requirement 都有至少一个 Scenario，符合 OpenSpec 规范要求
- 使用了 `#### Scenario: Name` 的正确格式
- CRUD 场景覆盖了 create / read / update / delete / list + filter
- 安全场景（401 未认证、跨用户隔离返回 404）设计周全

**问题**：

1. **[MUST FIX] Task Status Lifecycle — 缺少完整状态转换矩阵**  
   Spec 只举例了 `pending → in_progress` 和 `completed → pending (禁止)`，但未定义：
   - `expired` 状态的可达性（只能由系统自动触发？用户能否手动设为 expired？）
   - `cancelled` 能否恢复为 `pending`（即"取消后重新激活"场景）
   - `in_progress → cancelled` 是否允许
   
   **建议**：增加一个 `#### Scenario: Full transition matrix` 或文档化合法/非法转换图。

2. **[SHOULD FIX] 自动过期触发机制不明确**  
   Scenario 提到 "nightly scheduler or a background job"，但项目已有 `scheduled-tasks` capability（启动时执行、每日快照等）。应明确：
   - 是复用 `scheduled-tasks` 的基础设施，还是独立实现？
   - 触发频率：仅每日一次，还是每次 API 请求时顺便检查？

3. **[MINOR] chat-api/spec.md 的 "Task Context Awareness" 使用 SHOULD**  
   `"the Agent SHOULD reference the existing task"` — 这是否为可选行为？如果是核心需求应改为 SHALL。如果确实是 nice-to-have 可保留 SHOULD 但建议注明此场景为非强制。

4. **[MINOR] 缺少批量操作场景**  
   用户可能需要批量删除/批量标记完成（如选中多个已过期任务清理），当前无覆盖。作为 MVP 可暂不实现，但建议在 spec 中标注为 "Future consideration"。

### A2. Scenario 格式合规性

✅ 全部使用 `#### Scenario: Name` 格式  
✅ 使用 **WHEN** / **THEN** / **GIVEN** / **AND** 结构化描述  
✅ 没有使用 `- **Scenario:**` 或 `### Scenario:` 等错误格式

### A3. 边界情况覆盖

| 边界情况 | 是否覆盖 | 说明 |
|----------|---------|------|
| 未认证访问 | ✅ | 401 Unauthorized |
| 跨用户隔离 | ✅ | 返回 404 防止 ID 枚举 |
| 软删除 | ✅ | deletedAt 填充，查询自动排除 |
| 并发状态更新 | ❌ | 两个客户端同时更新同一任务状态未讨论 |
| 空数据（零任务） | ❌ | 前端空状态在 tasks.md T21 提到，但 spec 无场景 |
| 输入校验（超长标题、XSS） | ❌ | 未定义字段长度限制和内容净化规则 |
| 分页边界（offset > total） | ❌ | 未定义返回空数组还是报错 |

**建议**：至少补充「输入校验失败」和「并发状态冲突」两个 Scenario。

### A4. 遗漏的核心场景

1. **Task 关联的资产被删除/不存在时的表现** — `linkedSymbols` 中的 symbol 如果在系统中无对应资产，是否允许创建？
2. **Agent 创建任务失败时的 Chat 响应** — 如果 `task_create` 工具执行失败（如 DB 错误），Agent 应如何向用户反馈？
3. **任务数量上限** — 单用户可创建的任务数是否有限制？MVP 阶段建议加软上限（如 500）。

---

## B) 技术可行性

### B1. Schema 设计

**优点**：
- 遵循现有 `integer('id').primaryKey({ autoIncrement: true })` 惯例
- 软删除 `deletedAt` + `idx_tasks_deleted_at` 索引与现有表一致
- `userId` 外键引用 `users.id`，复用现有模式
- 预留 Phase 2 字段（`triggerPrice`, `triggerDirection`, `triggerExecutedAt`）避免后续 migration

**问题**：

1. **[MUST FIX] `linkedSymbols` 用 JSON 存储不利于查询**  
   如果用户想查"所有关联 AAPL 的任务"，JSON `LIKE '%AAPL%'` 不精确（会匹配到 "AAPLX"）。SQLite 不支持 JSON 数组查询函数。  
   **建议方案**：
   - 方案 A：保持 JSON 但接受模糊匹配限制（MVP 可接受，注释说明）
   - 方案 B：新增 `task_symbols` 关联表（更规范但增加复杂度）
   
   MVP 推荐方案 A，但需在 spec 中注明该限制。

2. **[SHOULD FIX] 缺少 `idx_tasks_source` 索引**  
   `sourceType` + `sourceId` 是来源追踪的关键查询路径（如"查找某次聊天产生的所有任务"），建议加复合索引。

3. **[MINOR] `status` 和 `type` 字段建议使用 enum 约束**  
   参考现有 schema 中 `accounts.market` 的 `text('market', { enum: ['CN', 'US', 'HK'] })` 模式，应对 `status` 和 `type` 也使用 `{ enum: [...] }` 约束。

4. **[OK] `triggerPrice` 类型**  
   建议使用 `real` 类型（浮点价格），与现有 `assetPositions` 中价格字段保持一致。

### B2. API 设计

**优点**：
- 遵循现有 `BaseController` + `BaseBizController` 分层模式
- REST 路由 `/api/tasks` 与现有 `/api/note` 模式一致

**问题**：

1. **[MUST FIX] 路由结构与现有模式不一致**  
   现有项目使用 `src/app/api/note/[id]/route.ts` 处理单个资源操作（PUT/DELETE by ID），但 tasks.md 中描述为 `PUT /api/tasks/:id` 和 `DELETE /api/tasks/:id`。实际 Next.js App Router 需要创建 `src/app/api/tasks/[id]/route.ts` 文件。  
   **已在 tasks.md T12 中提及，但 plan.md 的项目结构图中未体现 `[id]` 子路由**。需要补充。

2. **[SHOULD FIX] PATCH `/api/tasks/:id/status` 是额外端点**  
   现有模式中（如 note）没有使用 PATCH 端点。统一改为 PUT body 中传递 partial update 更符合现有惯例。但如果团队决定引入 PATCH 语义（更 RESTful），需要在 `BaseController` 中确认是否支持。  
   **建议**：Phase 1 使用 PUT with partial body，与 note 保持一致。

3. **[MINOR] 现有 DELETE 使用 request body 而非 URL param**  
   参考 `note/route.ts` 的 DELETE handler 用 `super.getBody(request)` 获取 id，而非 URL param。需确认 tasks 的 DELETE 是走 `/api/tasks/[id]` 还是走 body。建议走 `[id]` 路由（更标准），但需注意与现有模式有微小差异。

### B3. 与现有能力冲突/重复检查

| 检查项 | 结论 |
|--------|------|
| 与 `scheduled-tasks` 重复？ | ❌ 不重复。`scheduled-tasks` 处理系统级定时作业（快照、价格同步），`task-management` 是用户级行动项 |
| 与 `notes` 重复？ | ❌ 概念不同。Notes 是静态记录，Tasks 是有状态流转的行动项（plan.md 已正确论证） |
| Agent 工具与现有 note 工具冲突？ | ❌ 互补关系。note 工具管理知识记录，task 工具管理行动追踪 |
| `chat-api` delta 与 DeepAgents 流式兼容？ | ⚠️ 需确认。现有 `chat-api` spec 有 DeepAgents.js 流式支持，新的 `tool_result` SSE event 需兼容两种实现（LangChain + DeepAgents） |

### B4. 工时估算评估

| 阶段 | tasks.md 估算任务数 | 合理工时（人天） | 评价 |
|------|-------------------|----------------|------|
| 准备（T00-T05） | 6 | 0.5 | ✅ 已完成 |
| 数据库（T06-T09） | 4 | 1 | ✅ 合理 |
| 后端（T10-T12） | 3 | 1.5 | ✅ 合理 |
| Agent 工具（T13-T15） | 3 | 1 | ✅ 合理 |
| 前端 US1（T16-T22） | 7 | 2-3 | ✅ 合理（看板视图较复杂） |
| 前端 US2（T23-T25） | 3 | 1 | ✅ 合理 |
| Phase 2 预留（T26-T27） | 2 | 0.5 | ✅ 轻量 |
| i18n（T28-T29） | 2 | 0.5 | ✅ 合理 |
| QA（T30-T35） | 6 | 1 | ✅ 合理 |
| 归档（T36-T39） | 4 | 0.5 | ✅ 合理 |
| **总计** | **40 任务** | **~10 人天** | ✅ 中等规模，合理 |

**总工时评价**：10 人天（约 2 周单人）是合理的 MVP 交付周期。任务拆分粒度适中，依赖关系清晰。

---

## C) 风险与建议

### C1. 隐藏风险

| # | 风险 | 严重性 | 说明 |
|---|------|--------|------|
| 1 | **plan.md 引用了不存在的 `toolDefinitions.ts`** | 中 | 项目中只有 `registerBusinessTools.ts`，无独立的 toolDefinitions 文件。tasks.md T14 也引用了它。需确认是新建文件还是直接在 `registerBusinessTools.ts` 中定义。 |
| 2 | **状态管理描述与项目实际不符** | 低 | plan.md 写"React useState + Context"，但 project.md 明确使用 Zustand。应统一口径：是否在新页面引入 Zustand store？ |
| 3 | **自动过期的触发时机未绑定到现有基础设施** | 中 | 项目有 `scheduled-tasks` capability（应用启动时触发），任务过期检查应挂载到此机制，否则需独立实现调度器。plan.md 未讨论这一集成。 |
| 4 | **SSE `tool_result` 事件可能与现有前端 chat 解析器冲突** | 中 | 现有 chat-api 已有 tool_calls 流式格式。新增 `tool_result` 事件类型需确保前端 StreamParser 能正确路由到不同渲染组件。 |
| 5 | **Electron 环境下 SQLite migration 的 timing** | 低 | plan.md 已提及此风险。建议在 tasks.md 中显式增加一个 "验证 Electron 打包后 migration 正常执行" 的测试步骤（当前 T33 只验证 build 通过）。 |

### C2. 可简化的部分

1. **Phase 1 去掉 `PATCH /api/tasks/:id/status` 端点**  
   直接用 `PUT /api/tasks/:id` 传 partial body `{ status: 'in_progress' }` 即可。减少一个端点和一条路由，与现有 note 模式一致。

2. **`TaskForm` 和 `TaskDetail` 可合并为一个组件**  
   T20 (TaskDetail) 和 T23 (TaskForm) 功能高度重叠（都是编辑表单 + 展示字段）。建议合并为 `TaskEditor.tsx`，通过 `mode: 'create' | 'edit' | 'view'` props 切换。

3. **Phase 1 不需要 URL query 同步筛选状态（T25）**  
   对于 Electron 桌面端应用，URL query 持久化筛选的价值有限。建议降为 P3 或直接移到 Phase 2。

4. **`task_list` 工具可精简返回字段**  
   Agent 不需要任务的全部字段（如 `deletedAt`, `updatedAt`）。建议定义一个精简的 `TaskSummary` 类型给工具返回，降低 token 消耗。

### C3. 优先级调整建议

| 当前优先级 | 建议调整 | 理由 |
|-----------|---------|------|
| P1: 看板视图 + 拖拽 | 保持 P1，但 MVP 使用按钮切换状态（plan.md 已提及） | ✅ 正确决策 |
| P1: Agent 工具集成 | 保持 P1 | 这是核心差异化价值 |
| P2: 手动创建任务 + 筛选 | **建议提升为 P1** | 没有手动创建，用户无法独立使用任务系统，Agent 不一定每次都会建议 |
| P3: 条件型任务展示 | 保持 P3 | Phase 2 功能，预留字段即可 |
| —: URL 筛选持久化 (T25) | **建议降为 P3** | Electron 桌面端价值有限 |

### C4. 其他建议

1. **补充 API 错误码规范**  
   建议在 spec 中统一定义错误响应格式：
   ```json
   { "success": false, "code": "task_not_found", "message": "..." }
   ```
   与现有 `ResultUtil.error()` 模式对齐。

2. **Agent Prompt 工程需要独立评估**  
   T15（Agent 建议创建任务的 prompt）是行为层面最不确定的部分。建议在实现时添加几个评估用例（利用现有 `agent-evaluation` capability），验证 Agent 在什么条件下会主动建议创建任务、避免过度建议。

3. **考虑 Optimistic UI 更新**  
   看板状态切换如果每次都等 API 返回，体验会有延迟感。建议前端状态先乐观更新，API 失败后 revert。这在 plan.md 中未讨论。

---

## 总结

### 必须修改（Blocking）

| # | 位置 | 修改内容 |
|---|------|---------|
| 1 | `specs/task-management/spec.md` | 补充完整的状态转换矩阵 Scenario（定义所有合法/非法转换） |
| 2 | `plan.md` 项目结构 | 补充 `src/app/api/tasks/[id]/route.ts` 路径 |
| 3 | `plan.md` + `tasks.md` | 确认 `toolDefinitions.ts` 是新建文件还是沿用 `registerBusinessTools.ts` 内联定义 |

### 建议修改（Non-blocking）

| # | 位置 | 修改内容 |
|---|------|---------|
| 4 | `specs/task-management/spec.md` | 增加输入校验失败场景（字段长度、必填项缺失） |
| 5 | `specs/task-management/spec.md` | 明确自动过期机制是复用 `scheduled-tasks` 还是独立实现 |
| 6 | `plan.md` | 状态管理描述改为 Zustand 或说明不使用全局 store 的原因 |
| 7 | `tasks.md` | 将 T25 (URL query 同步) 降级为可选或 Phase 2 |
| 8 | `tasks.md` | 合并 T20 (TaskDetail) 和 T23 (TaskForm) 为一个组件任务 |
| 9 | `specs/chat-api/spec.md` | 确认 `tool_result` SSE event 在 DeepAgents 和 LangChain 双实现下的兼容性 |
| 10 | `plan.md` | 增加与 `scheduled-tasks` capability 的集成说明（任务过期检查挂载方式） |

### 评价总结

这是一个 **高质量的 OpenSpec 提案**，在以下方面表现出色：
- 📐 结构完整：proposal / plan / tasks / specs 四件套齐全
- 🎯 范围清晰：MVP vs Phase 2 的边界划分合理
- 🏗️ 架构对齐：正确复用了项目现有的 Controller/Repository/Service 三层模式
- 🔒 安全考虑：认证、用户隔离、ID 枚举防护均覆盖

主要改进方向是 **状态转换完整性** 和 **与现有基础设施的集成细节**（scheduled-tasks、DeepAgents 流式兼容性）。修改量不大，不影响整体设计。

**建议操作**：完成上述 3 项 Blocking 修改后，即可进入实现阶段。
