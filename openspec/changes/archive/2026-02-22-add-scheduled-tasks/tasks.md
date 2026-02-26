# 任务：定时任务系统（前端触发）

**输入**：来自 `specs/scheduled-tasks/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm run test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/scheduled/route.ts` |
| Service | `src/server/service/schedulerService.ts` |
| Types | `src/types/scheduler.ts` |
| Hooks | `src/app/hooks/useScheduler.ts` |
| Schema | `drizzle/schema.ts` |

---

## 第0阶段：准备（设计与验证）

- [x] T001 创建变更目录结构 `openspec/changes/add-scheduled-tasks/` <!-- id: 1 -->
- [x] T002 编写 proposal.md 描述变更意图和影响 <!-- id: 2 -->
- [ ] T003 编写 spec delta 规范变更 <!-- id: 3 -->
- [ ] T004 运行 `openspec validate add-scheduled-tasks --strict` 验证 <!-- id: 4 -->

---

## 第1阶段：设置（基础设施）

**目的**：数据库表结构和类型定义

- [ ] T005 在 `drizzle/schema.ts` 新增 `scheduledTaskLogs` 表定义 <!-- id: 5 -->
- [ ] T006 [P] 在 `src/types/scheduler.ts` 定义任务类型和接口 <!-- id: 6 -->
- [ ] T007 运行 `pnpm db:generate` 生成迁移文件 <!-- id: 7 -->
- [ ] T008 运行 `pnpm db:migrate` 应用迁移 <!-- id: 8 -->

---

## 第2阶段：基础（服务层）

**目的**：核心业务逻辑和数据访问，必须在 API 前完成

**⚠️ 关键**：此阶段完成前不应开始 API/UI 工作

- [ ] T009 在 `src/server/service/schedulerService.ts` 实现 SchedulerService 核心逻辑 <!-- id: 9 -->
  - `normalizeDate()` - 日期规范化函数
  - `shouldRunTask()` - 判断任务是否需要执行
  - `recordTaskExecution()` - 记录任务执行状态
  - `checkAndRunTasks()` - 主入口，检查并执行遗漏任务
- [ ] T010 在 SchedulerService 中实现 `createDailySnapshots()` 方法 <!-- id: 10 -->
- [ ] T011 在 SchedulerService 中实现 `syncPriceHistory()` 方法 <!-- id: 11 -->
- [ ] T012 编写 SchedulerService 单元测试 <!-- id: 12 -->
  - 测试日期规范化
  - 测试任务执行判断逻辑
  - 测试幂等性

**检查点**：业务逻辑就绪，可以开始 API 实现

---

## 第3阶段：API

- [ ] T013 在 `src/app/api/scheduled/route.ts` 实现 API Route <!-- id: 13 -->
  - POST `/api/scheduled/check-and-run` - 检查并执行任务
  - GET `/api/scheduled/status` - 获取任务执行状态
- [ ] T014 添加请求验证（Zod schema） <!-- id: 14 -->
- [ ] T015 添加错误处理和日志记录 <!-- id: 15 -->
- [ ] T016 编写 API 集成测试 <!-- id: 16 -->

---

## 第4阶段：User Story 1 - 每日快照创建 (优先级：P1) 🎯 MVP

**目标**：用户打开应用时自动创建每日投资组合快照
**独立测试**：打开应用后检查 `portfolioSnapshots` 表有当天记录

### 实现

- [ ] T017 [US1] 在 `src/app/hooks/useScheduler.ts` 创建 useScheduler Hook <!-- id: 17 -->
- [ ] T018 [US1] 在应用初始化时调用任务检查 API <!-- id: 18 -->
- [ ] T019 [US1] 添加任务执行状态反馈（可选：toast 提示） <!-- id: 19 -->
- [ ] T020 [US1] 验证快照数据正确性 <!-- id: 20 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - 价格历史同步 (优先级：P2)

**目标**：用户打开应用时自动同步所有持仓股票的收盘价历史
**独立测试**：检查 `assetPriceHistory` 表有最近价格数据

### 实现

- [ ] T021 [US2] 在 SchedulerService 中完善 `syncPriceHistory()` 逻辑 <!-- id: 21 -->
  - 获取所有持仓股票代码
  - 调用 HistoryService.syncHistoricalData()
- [ ] T022 [US2] 添加价格同步错误处理（部分失败场景） <!-- id: 22 -->
- [ ] T023 [US2] 验证价格数据正确性 <!-- id: 23 -->

---

## 第6阶段：User Story 3 - 遗漏任务补执行 (优先级：P3)

**目标**：系统自动补执行过去遗漏的任务（如几天未打开应用）
**独立测试**：模拟几天未打开应用，检查是否补创建了多天快照

### 实现

- [ ] T024 [US3] 在 SchedulerService 中实现 `getMissedTaskDates()` 方法 <!-- id: 24 -->
- [ ] T025 [US3] 添加配置项：补执行天数上限（默认 7 天） <!-- id: 25 -->
- [ ] T026 [US3] 实现 `backfillMissedTasks()` 补执行逻辑 <!-- id: 26 -->
- [ ] T027 [US3] 验证补执行正确性 <!-- id: 27 -->

---

## 第7阶段：应用运行时定时检查 (可选增强)

**目的**：应用长时间运行时自动定时检查任务

- [ ] T028 在 useScheduler Hook 中添加 `setInterval` 定时检查 <!-- id: 28 -->
- [ ] T029 添加检查间隔配置（默认 1 小时） <!-- id: 29 -->
- [ ] T030 处理应用休眠/唤醒场景 <!-- id: 30 -->

---

## 第8阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [ ] T032 运行 `pnpm run types:check` 确保类型正确 <!-- id: 32 -->
- [ ] T033 运行 `pnpm test` 确保测试通过 <!-- id: 33 -->
- [ ] T034 性能审查：确保任务检查不影响应用启动速度 <!-- id: 34 -->

---

## 第9阶段：归档准备

- [ ] T035 更新所有 TODO 状态为完成 <!-- id: 35 -->
- [ ] T036 验证所有场景在 spec.md 中已实现 <!-- id: 36 -->

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

- T005（表定义）和 T006（类型定义）可以并行开发
- T010（快照逻辑）和 T011（价格同步逻辑）可以并行开发
- 不同 User Story 的 UI 组件可以并行构建