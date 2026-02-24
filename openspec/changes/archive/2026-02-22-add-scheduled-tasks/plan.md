# 实现计划：定时任务系统（前端触发）

**分支**：`add-scheduled-tasks` | **日期**：2026-02-16 | **规范**：`specs/scheduled-tasks/spec.md`
**输入**：前端触发的定时任务系统，适用于 Electron 客户端应用

## 概要

为 Electron + Next.js 客户端应用实现定时任务系统，采用前端触发方案，在用户打开应用时自动检查并执行遗漏的任务，同时在应用运行期间定期检查新任务。核心任务包括每日收盘价历史同步和投资组合快照创建。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Drizzle ORM
**存储**：SQLite (用户数据目录 `~/.investment-agent/sqlite.db`)
**测试**：Vitest, React Testing Library
**目标平台**：桌面应用 (Electron) + Web
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：任务检查响应 < 100ms，不影响应用启动速度
**约束条件**：
- 必须兼容 Electron 多进程架构
- 不能在 Electron 主进程直接调用 Server 代码
- 任务幂等性设计（可重复执行不产生副作用）

## 规范检查

- ✅ 符合项目规范（使用 Drizzle ORM、Zod 验证）
- ✅ TypeScript 严格模式兼容
- ✅ 遵循现有 Controller-Service 架构模式

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-scheduled-tasks/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── scheduled-tasks/     # 新增 capability
        └── spec.md          # 功能规范
```

### 源代码（项目根目录）

```text
src/
├── app/
│   └── api/
│       └── scheduled/       # 新增：定时任务 API
│           └── route.ts     # POST /api/scheduled/check-and-run
├── server/
│   ├── service/
│   │   └── schedulerService.ts   # 新增：调度服务
│   └── lib/
│       └── db.ts            # 扩展：启动检查
├── hooks/
│   └── useScheduler.ts      # 新增：前端 Hook
drizzle/
└── schema.ts                # 扩展：新增 scheduledTaskLogs 表
```

**结构决策**：
- SchedulerService 放在 `src/server/service/` 遵循现有服务层模式
- API 端点放在 `src/app/api/scheduled/` 便于统一管理
- 前端 Hook 放在 `src/hooks/` 复用现有 hooks 目录结构

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户打开应用时自动创建每日快照，无需手动操作 | 打开应用后检查 `portfolioSnapshots` 表有当天记录 |
| P2 | 用户打开应用时自动同步所有持仓股票的收盘价历史 | 检查 `assetPriceHistory` 表有最近价格数据 |
| P3 | 系统自动补执行过去遗漏的任务（如几天未打开应用） | 模拟几天未打开，检查是否创建了多天快照 |

## 技术架构

### 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     前端应用 (React)                             │
│  useScheduler Hook                                              │
│  - 应用启动时调用 /api/scheduled/check-and-run                   │
│  - 可选：应用运行期间定期检查                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 服务进程                             │
├─────────────────────────────────────────────────────────────────┤
│  /api/scheduled/route.ts                                        │
│       ↓                                                         │
│  SchedulerService                                               │
│  - checkAndRunTasks() → 检查遗漏任务并执行                        │
│  - syncPriceHistory() → 调用 HistoryService                      │
│  - createSnapshots() → 调用 PortfolioSnapshotService             │
│       ↓                                                         │
│  scheduledTaskLogs (SQLite)                                     │
│  - 记录任务执行状态，幂等性保证                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 任务执行流程

```
应用启动
    │
    ▼
检查 scheduledTaskLogs 表
    │
    ├── 检查今天是否已执行 "daily_snapshot" 任务?
    │       ├── 否 → 执行 createSnapshots()
    │       └── 是 → 跳过
    │
    ├── 检查今天是否已执行 "price_sync" 任务?
    │       ├── 否 → 执行 syncPriceHistory()
    │       └── 是 → 跳过
    │
    └── 检查过去几天是否有遗漏？
            ├── 是 → 可选补执行（配置化）
            └── 否 → 完成
```

 幂等性设计

| 任务类型 | 幂等键 | 重复执行效果 |
|---------|-------|-------------|
| daily_snapshot | `{taskType}-{date}` | 同一天多次调用只保留最新快照（UPSERT） |
| price_sync | `{symbol}-{date}` | 同一股票同一天数据只保留一份（去重插入） |

### 状态管理

- **服务端**: `scheduledTaskLogs` 表记录任务执行历史
- **客户端**: `useScheduler` Hook 提供任务状态（可选：最后执行时间、下次执行时间）
- **缓存策略**: 内存中缓存当天任务状态，避免频繁数据库查询

### 外部集成

- **HistoryService**: 已有 `syncHistoricalData()` 方法可直接复用
- **PortfolioSnapshotService**: 已有 `createSnapshot()` 方法可直接复用
- **PositionService**: 获取所有持仓股票代码

## 数据库设计

### 新增表：scheduledTaskLogs

```typescript
export const scheduledTaskLogs = sqliteTable('scheduled_task_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskType: text('task_type', { enum: ['daily_snapshot', 'price_sync'] }).notNull(),
  executionDate: integer('execution_date', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['success', 'failed', 'partial'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }),  // 执行详情（如：处理的股票数、失败列表）
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('idx_task_type_date').on(table.taskType, table.executionDate),
]);
```

### 执行日期规范化

- 执行日期统一使用 UTC 零点时间戳
- 确保跨时区一致性

## 复杂性跟踪

> 不需要填写，方案简洁，无违规

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 应用启动变慢 | 中 | 异步执行任务，不阻塞 UI 渲染 |
| 任务执行失败 | 低 | 记录错误日志，下次启动重试 |
| 外部 API 不可用（Finnhub） | 中 | 标记 partial 状态，跳过失败的股票 |
| 用户长期不打开应用 | 低 | 支持配置补执行天数上限（默认 7 天） |

## 性能考虑

- 任务检查响应时间: < 100ms
- 快照创建: < 5s（取决于持仓数量）
- 价格同步: < 30s（取决于持仓数量和 API 限流）
- 后台检查间隔: 1 小时

## 安全考虑

- API 端点需要用户认证（复用现有 AuthService）
- 任务执行日志仅当前用户可见

## 测试策略

- **单元测试**:
  - `SchedulerService.shouldRunTask()` 判断逻辑
  - 日期规范化函数
  - 幂等性检查
- **集成测试**:
  - API 端点完整流程
  - 数据库事务正确性
- **端到端测试**:
  - 应用启动 → 任务自动执行 → 数据正确记录