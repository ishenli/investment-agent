# Code Review: add-task-management Implementation

> **Reviewer**: Hermes (Manual Review)  
> **Date**: 2026-05-25  
> **Branch**: `feature/add-task-management`  
> **Overall Verdict**: ✅ Approved with Required Changes (4 P0, 4 P1, 5 P2)

---

## 🔴 P0: Blocking Issues (Must Fix Before Merge)

### P0-1. Service Layer Uses `Record<string, unknown>` — Violates Project Constitution
**文件**: `src/server/service/taskService.ts:184`  
**代码**:
```typescript
const updateData: Record<string, unknown> = {};
```
**问题**: 项目约束明确规定：**"Business 层禁止使用 `Record<string, unknown>`，必须使用精确类型"**。
**修复**: 使用 `UpdateTaskData` 或更精确的类型。可先将字段逐个检查和赋值到 `updateData` 对象，然后用 `as UpdateTaskData` （Drizzle schema 导出的 `UpdateTaskData` 已正确定义为 `Partial<Omit<TaskEntity, 'id' | ...>>`）。
**最小修复**:
```typescript
const updateData: UpdateTaskData = {};
// ...条件赋值后再传给 Repository
```

### P0-2. JSON 字段 `linkedSymbols` 类型断言不安全
**文件**: `src/server/service/taskService.ts:44`  
**代码**:
```typescript
linkedSymbols: (entity.linkedSymbols as string[]) ?? [],
```
**问题**: `linkedSymbols` 在 SQLite 中存储为 JSON 列。Drizzle SQLite 驱动反序列化 `json()` 字段为 `unknown`。如果数据库中存的是 `null` 或 `undefined`，该断言可能导致运行时错误。此外，`null` 的 `?? []` 不会触发（因为 `null as string[]` 被断言覆盖）。
**修复**:
```typescript
linkedSymbols: Array.isArray(entity.linkedSymbols) ? entity.linkedSymbols : [],
```

### P0-3. `taskRepository.findExpiredPendingTasks()` 缺少软删除过滤
**文件**: `src/server/repository/taskRepository.ts:159-166`  
**代码**:
```typescript
async findExpiredPendingTasks(): Promise<TaskEntity[]> {
  const now = new Date();
  return this.findMany(
    and(
      eq(tasks.status, 'pending'),
      lte(tasks.dueDate, now),
    ),
  );
}
```
**问题**: `findMany` 来自 `BaseIntRepository`，虽然 `enableSoftDelete = true` 应该自动过滤 `deletedAt IS NULL`，但 `findExpiredPendingTasks()` 通过 `this.findMany()` 调用，如果 `BaseIntRepository` 的实现中 `findMany` 对条件使用了 `sql` 拼接而未自动添加 `deletedAt` 条件，则已删除任务也会被标记为 `expired`。
**修复**: 显式添加 `isNull(tasks.deletedAt)` 条件确保安全。

### P0-4. Agent 工具 Schema 缺少 `sourceType` / `sourceId`，无法追踪来源
**文件**: `src/server/core/agents/hermes/registerBusinessTools.ts:248-273`  
**问题**: `taskCreateSchema` 只包含 `title`, `description`, `type`, `priority`, `linked_symbols`, `due_date` —— **缺少 `sourceType` 和 `sourceId`**。这意味着 Agent 调用 `task_create` 时，-created 的任务永远是 `manual` 类型（Service 层的默认值），无法达到 spec 中要求的 "`sourceType = 'agent_chat'`" 追踪。
**修复**: 在 `taskCreateSchema` 中增加 `sourceType` 和 `sourceId` 字段，并在 `createTaskBiz` wrapper 中设置默认值。

---

## 🟡 P1: Serious Issues (Should Fix)

### P1-1. `(db as any)` 绕过类型系统（3 处）
**文件**: `src/server/repository/taskRepository.ts:175, 192, 208`  
**代码**:
```typescript
await (db as any).update(tasks).set({ ... }).where(...)
```
**问题**: 使用 `as any` 会丧失 Drizzle ORM 的类型安全和自动补全。如果表结构变更（如重命名字段），这些调用不会触发编译错误。
**修复**: 移除 `as any`，如果类型问题来自 Drizzle 的已知行为，应通过正确的类型导入解决，而非强制 `any`。Drizzle `db` 的类型应在 `@server/lib/db.ts` 中精确定义。

### P1-2. i18n namespace错配风险：`task.json` vs `components.json`
**文件**: `src/app/components/app-sidebar.tsx`  
**问题**: 侧边栏导航文案使用了 `components.json` namespace（`sidebar.navMain.taskManagement`）。但功能相关的文案（Task 页面本身）使用了 `task.json`。这导致一个 capability 的 UI 文案分散在两个 namespace 中，维护成本增加。
**建议**: 侧边栏导航文案可保留在 `components.json`（导航系统通用），但确保 `task.json` 不使用 `components.` 前缀。**最低优先级可接受**。

### P1-3. 搜索空字符串通配符问题
**文件**: `src/server/repository/taskRepository.ts:82-88`  
**代码**:
```typescript
if (options?.search) {
  conditions.push(or(
    like(tasks.title, `%${options.search}%`),
    like(tasks.description, `%${options.search}%`),
  )!);
}
```
**问题**: 如果 `options.search = ""`（空字符串），`if (options?.search)` 为 `false`，不会执行。但如果 `options.search = " "`（空格），条件会触发，产生 `like(title, '% %')`，行为虽正确但无意义。更严重的是：这是一个**SQL 注入风险**——`options.search` 直接拼入 LIKE pattern，用户传入 `%'; DROP TABLE...` 可能造成 SQL 注入。**（修正：Drizzle 参数化查询会阻止 SQL 注入，但空值和通配符性能风险需要关注）**
**修复**: 在传入前对 search 值做 trim 和长度验证。

### P1-4. TaskBoard 中状态转换矩阵与 Service 层不一致
**文件**: `src/app/(pages)/tasks/components/TaskBoard.tsx:38-47`  
**代码**:
```typescript
const transitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['pending', 'in_progress'],
  expired: [],
};
```
**问题**: Board 前端硬编码了独立的状态转换表，但没有 `expired`（因为 `expired` 是系统自动设置的，前端看板不显示 `expired` 列）。这与 `task.ts` 中的 `VALID_STATUS_TRANSITIONS` 不完全一致（那里面包含 `expired` 作为合法转换目标）。
**风险**: 如果未来修改状态规则，只有 Service 层的矩阵会生效，前端看板可能提供非法的状态选项。
**修复**: 前端 `TaskBoard` 应导入 `VALID_STATUS_TRANSITIONS` 并只过滤出客户端可用的选项，而非维护独立的矩阵。

---

## 🟢 P2: Improvements (Optional)

### P2-1. `searchDebounceRef` 使用了 NodeJS.Timeout 类型
**文件**: `src/app/(pages)/tasks/page.tsx:53`  
**代码**: `const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);`  
**问题**: 在浏览器端运行时，`setTimeout` 返回 `number` 而非 `NodeJS.Timeout`，类型上不准确。不过 TypeScript 的 DOM 类型定义通常可以兼容 `NodeJS.Timeout`。
**修复**: 改为 `useRef<ReturnType<typeof setTimeout> | null>(null);`

### P2-2. `dueDate` 的 `new Date().toISOString().slice(0, 10)` 在时区边界可能有 1 天偏差
**文件**: `src/app/(pages)/tasks/components/TaskEditor.tsx:76`  
**代码**:
```typescript
setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
```
**问题**: 用户的系统时区可能在 +8（北京时间），但 `toISOString()` 返回 UTC 时间。如 `2024-06-01T00:00:00+08:00` 会被切成 `2024-05-31`，导致日期显示错乱。
**修复**: 使用本地时区格式化的工具函数（如 `date-fns` 的 `format` 或简单 `getFullYear/getMonth/getDate`）。

### P2-3. `TaskEditor` 中 `triggerPrice` 无 `NaN` 验证
**文件**: `src/app/(pages)/tasks/components/TaskEditor.tsx:110, 124`  
**代码**: `Number(triggerPrice)`  
**问题**: 如果用户输入非数字（如 `"abc"`），`Number("abc")` 产生 `NaN`，提交给后端后 `triggerPrice: NaN` 在 JSON 序列化时可能产生 `"null"` 或 `"NaN"`。
**修复**: 在 `handleSubmit` 中增加 `!isNaN(Number(triggerPrice))` 检查。

### P2-4. `handleSave` 中缺少 try/catch 的错误反馈
**文件**: `src/app/(pages)/tasks/page.tsx:141-175`  
**问题**: `handleSave` 中 `fetch` 调用有 `catch`（使用 `showMessage('error', ...)`），但 `handleStatusChange` 也使用了同样的模式，只是两者都同时调整状态并立刻调用 `fetchData()`，如果 `fetchData()` 失败（网络问题），loading 状态却没有正确 reset。实际上 loading 是在 `fetchData()` 内部处理的，如果 `handleStatusChange` 中的 `fetchData` 失败，`setLoading(false)` 会被调用。
**结论**: 这不是一个严重问题。P2 标记为 **信息提醒**。

### P2-5. `findExpiredPendingTasks` 的 `lte(tasks.dueDate, now)` 不精确
**文件**: `src/server/repository/taskRepository.ts:159-166`  
**问题**: `lte(dueDate, new Date())` 中 `new Date()` 包含当前的小时/分钟/秒，这可能导致一些边界情况（如任务截止时间是今天午夜，但当前时间是下午 3 点）。预期正确但可能过于严格。
**建议**: 对于"过期"定义，更精确的方式是只比较日期部分（不含时分秒）。不过这取决于业务定义，当前实现合理。

---

## 总结与建议操作

### 必须修复（P0）
1. `taskService.ts:184` — `Record<string, unknown>` → `UpdateTaskData`
2. `taskService.ts:44` — `as string[]` → `Array.isArray()` 安全断言
3. `taskRepository.ts:159-166` — 显式添加 `isNull(tasks.deletedAt)`
4. `registerBusinessTools.ts:248-273` — 补充 `sourceType`/`sourceId` 到 taskCreateSchema

### 强烈建议修复（P1）
5. 移除 3 处 `(db as any)` 或提供合理的类型 workaround
6. 将 TaskBoard 中的硬编码状态矩阵替换为导入 `VALID_STATUS_TRANSITIONS`
7. 搜索输入做 `trim()` + 长度验证

### 可选优化（P2）
8. `NodeJS.Timeout` 改为 `ReturnType<typeof setTimeout>`
9. `dueDate` 时区安全格式化
10. `triggerPrice` 增加 `NaN` 验证

---

## 正面评价

✅ **类型安全**：无隐式 `any`，类型定义前后端共享  
✅ **架构一致**：正确遵循 `BaseBizController` → `BaseController` → `API Route` 三层  
✅ **软删除**：完整的 `deletedAt` + `BaseIntRepository` 集成  
✅ **i18n**：90+ 键完整覆盖中英文  
✅ **组件拆分**：TaskBoard/TaskList/TaskCard/TaskEditor 职责清晰  
✅ **状态转换**：Service 层正确验证，非法转换返回明确错误信息  
✅ **空值处理**：`description`、`dueDate`、`executionNotes`、`sourceId` 的空字符串在多处被正确转为 `null`  
✅ **输入校验**：标题长度、必填字段、状态值有效性均在前端和 Controller 有验证
