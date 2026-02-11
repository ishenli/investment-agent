# 任务：[功能名称]

**输入**：来自 `/specs/[###-功能名称]/spec.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`npm run type-check`
- 代码检查：`npm run lint`
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
| Graph | `src/server/core/graph/[capability]Graph.ts` |
| Store | `src/renderer/store/[capability]Store.ts` |
| Components | `src/components/[ComponentName]/` |
| Types | `src/shared/types/` |

<!-- 
  ============================================================================
  重要说明：下面的任务仅为示例。
  /speckit.tasks 命令必须根据实际需求替换为真实任务。
  ============================================================================
-->

## 第0阶段：准备（设计与验证）

- [ ] T00 创建变更目录结构 `openspec/changes/[change-id]/` <!-- id: 0 -->
- [ ] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [ ] T02 编写 spec delta 规范变更 <!-- id: 2 -->
- [ ] T03 运行 `openspec validate [change-id] --strict` 验证 <!-- id: 3 -->

---

## 第1阶段：设置（基础设施）

**目的**：项目初始化和类型定义

- [ ] T004 在 `src/shared/types/[capability].ts` 中定义类型 <!-- id: 4 -->
- [ ] T005 [P] 更新 `src/server/base/` 基础设施（如需要） <!-- id: 5 -->

---

## 第2阶段：基础（服务层）

**目的**：核心业务逻辑和数据访问，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [ ] T006 [P] 在 `src/server/service/[capability]Service.ts` 实现服务层 <!-- id: 6 -->
- [ ] T007 [P] 在 `src/server/core/graph/[capability]Graph.ts` 实现 Graph（如涉及 Agent） <!-- id: 7 -->
- [ ] T008 [P] 更新 Drizzle schema（如涉及数据库） <!-- id: 8 -->
- [ ] T009 编写服务层单元测试 <!-- id: 9 -->

**检查点**：业务逻辑就绪，可以开始 API/UI 实现

---

## 第3阶段：API

- [ ] T010 在 `src/app/api/[capability]/route.ts` 实现 API Route <!-- id: 10 -->
- [ ] T011 添加请求验证（Zod schema） <!-- id: 11 -->
- [ ] T012 添加错误处理和日志记录 <!-- id: 12 -->
- [ ] T013 编写 API 集成测试 <!-- id: 13 -->

---

## 第4阶段：User Story 1 - [标题] (优先级：P1) 🎯 MVP

**目标**：[此故事交付内容的简要描述]
**独立测试**：[如何在应用中验证此故事]

### 实现

- [ ] T014 [P] [US1] 在 `src/renderer/store/[capability]Store.ts` 创建/更新 Store <!-- id: 14 -->
- [ ] T015 [P] [US1] 在 `src/components/[Component]/` 创建 UI 组件 <!-- id: 15 -->
- [ ] T016 [US1] 在页面中集成组件和 Store <!-- id: 16 -->
- [ ] T017 [US1] 添加加载/错误状态处理 <!-- id: 17 -->
- [ ] T018 [US1] 验证响应式布局 <!-- id: 19 -->
- [ ] T019 [US1] 编写组件单元测试 <!-- id: 20 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - [标题] (优先级：P2)

**目标**：[此故事交付内容的简要描述]
**独立测试**：[如何验证此故事]

### 实现

- [ ] T020 [P] [US2] 更新 Store 添加新状态/操作 <!-- id: 21 -->
- [ ] T021 [US2] 更新 Service 添加新方法 <!-- id: 22 -->
- [ ] T022 [US2] 在组件中添加新交互 <!-- id: 23 -->
- [ ] T023 [US2] 验证交互流程 <!-- id: 24 -->

---

## 第6阶段：完善与质量保证（可选）

**目的**：跨用户的改进和质量检查

- [ ] T024 运行 `npm run lint` 并修复问题 <!-- id: 25 -->
- [ ] T025 运行 `npm run types:check` 确保类型正确 <!-- id: 26 -->
- [ ] T026 运行 `npm test` 确保测试通过 <!-- id: 27 -->
- [ ] T027 添加/更新用户文档（如需要） <!-- id: 28 -->
- [ ] T028 性能优化审查 <!-- id: 29 -->

---

## 第7阶段：归档准备

- [ ] T029 更新所有 TODO 状态为完成 <!-- id: 30 -->
- [ ] T030 验证所有场景在 spec.md 中已实现 <!-- id: 31 -->

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

- Store 与 UI 组件可以并行开发
- 不同组件可以并行构建
- 服务层工具方法可以并行实现
