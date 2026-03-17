# 任务：Memory Management

**输入**：用户需求 - 为投资助手添加记忆功能（双层架构）
**前置条件**：plan.md（必需）
**参考**：项目规范

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/memory/route.ts` |
| Service | `src/server/service/memoryService.ts` |
| Repository | `src/server/repository/memoryRepository.ts` |
| SDK Hooks | `src/server/core/claude/memoryHooks.ts` |
| Store | `src/app/store/memory/` |
| Components | `src/app/(pages)/settings/memory/` |
| Types | `src/types/memory.ts` |
| Short-term Memory | `.investment-agent/memory/` |

---

## 第0阶段：准备（设计与验证）

- [ ] T00 创建变更目录结构 `openspec/changes/add-memory-management/` <!-- id: 0 -->
- [ ] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [ ] T02 编写 spec delta 规范变更 <!-- id: 2 -->
- [ ] T03 运行 `openspec validate add-memory-management --strict` 验证 <!-- id: 3 -->

---

## 第1阶段：设置（基础设施）

**目的**：项目初始化和类型定义

- [ ] T004 在 `src/types/memory.ts` 定义记忆类型（短期/长期） <!-- id: 4 -->
- [ ] T005 [P] 在 `drizzle/schema.ts` 添加 memories 表定义（长期记忆） <!-- id: 5 -->
- [ ] T006 [P] 创建 `.investment-agent/memory/` 目录结构（短期记忆） <!-- id: 6 -->

---

## 第2阶段：基础（服务层）

**目的**：核心业务逻辑和数据访问，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

### 长期记忆（SQLite）

- [ ] T007 [P] 在 `src/server/repository/memoryRepository.ts` 实现 Repository <!-- id: 7 -->
- [ ] T008 [P] 在 `src/server/service/memoryService.ts` 实现服务层 <!-- id: 8 -->

### 短期记忆（SDK Hooks + Markdown）

- [ ] T009 在 `src/server/core/claude/memoryHooks.ts` 实现 SDK Hooks <!-- id: 9 -->
- [ ] T010 在 `src/server/core/claude/memoryFileService.ts` 实现短期记忆文件管理 <!-- id: 10 -->
- [ ] T011 在 `claudeClient.ts` 集成 memory hooks <!-- id: 11 -->

### 测试

- [ ] T012 编写服务层单元测试 <!-- id: 12 -->

**检查点**：业务逻辑就绪，可以开始 API/UI 实现

---

## 第3阶段：API

- [ ] T013 在 `src/app/api/memory/route.ts` 实现 API Route <!-- id: 13 -->
- [ ] T014 添加请求验证（Zod schema） <!-- id: 14 -->
- [ ] T015 添加错误处理和日志记录 <!-- id: 15 -->
- [ ] T016 实现 `POST /api/memory/sync` 同步短期记忆到长期记忆 <!-- id: 16 -->
- [ ] T017 编写 API 集成测试 <!-- id: 17 -->

---

## 第4阶段：User Story 1 - 手动管理长期记忆 (优先级：P1) 🎯 MVP

**目标**：用户可以手动添加投资相关的长期记忆，系统会在对话中自动使用这些记忆
**独立测试**：在设置页面添加记忆，开始新对话，AI 引用该记忆

### 实现

- [ ] T018 [P] [US1] 在 `src/app/store/memory/` 创建 Store <!-- id: 18 -->
- [ ] T019 [P] [US1] 在 `src/app/(pages)/settings/memory/page.tsx` 创建记忆管理页面 <!-- id: 19 -->
- [ ] T020 [US1] 在页面中集成组件和 Store <!-- id: 20 -->
- [ ] T021 [US1] 添加加载/错误状态处理 <!-- id: 21 -->
- [ ] T022 [US1] 添加记忆分类筛选功能 <!-- id: 22 -->
- [ ] T023 [US1] 验证响应式布局 <!-- id: 23 -->
- [ ] T024 [US1] 编写组件单元测试 <!-- id: 24 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - SDK Hooks 自动提取短期记忆 (优先级：P2)

**目标**：AI 在对话中自动通过 SDK Hooks 提取用户偏好，存储到短期记忆文件
**独立测试**：对话中提及偏好，系统自动创建短期记忆文件

### 实现

- [ ] T025 [US2] 实现 PostToolUse hook 分析对话内容 <!-- id: 25 -->
- [ ] T026 [US2] 实现记忆提取逻辑（识别投资偏好、风险态度等） <!-- id: 26 -->
- [ ] T027 [US2] 实现短期记忆文件写入（Markdown 格式） <!-- id: 27 -->
- [ ] T028 [US2] 验证自动提取流程 <!-- id: 28 -->

---

## 第6阶段：User Story 3 - 记忆注入对话 (优先级：P2)

**目标**：长期记忆和短期记忆自动注入到对话上下文中
**独立测试**：有记忆的用户开始对话，AI 响应中体现记忆内容

### 实现

- [ ] T029 [US3] 实现长期记忆检索（按重要性排序） <!-- id: 29 -->
- [ ] T030 [US3] 实现短期记忆文件读取 <!-- id: 30 -->
- [ ] T031 [US3] 在 System Prompt 中注入记忆内容 <!-- id: 31 -->
- [ ] T032 [US3] 验证记忆正确注入到对话上下文 <!-- id: 32 -->

---

## 第7阶段：User Story 4 - 短期记忆同步到长期记忆 (优先级：P3)

**目标**：用户可以将短期记忆同步到长期记忆，实现跨会话保留
**独立测试**：对话结束后，用户确认保存，记忆出现在长期记忆列表

### 实现

- [ ] T033 [US4] 实现同步 API `POST /api/memory/sync` <!-- id: 33 -->
- [ ] T034 [US4] 在对话结束 UI 添加"保存记忆"按钮 <!-- id: 34 -->
- [ ] T035 [US4] 实现短期记忆文件解析并写入 SQLite <!-- id: 35 -->
- [ ] T036 [US4] 验证同步流程 <!-- id: 36 -->

---

## 第8阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [ ] T037 运行 `npm run lint` 并修复问题 <!-- id: 37 -->
- [ ] T038 运行 `npm run types:check` 确保类型正确 <!-- id: 38 -->
- [ ] T039 运行 `npm test` 确保测试通过 <!-- id: 39 -->
- [ ] T040 添加/更新用户文档（如需要） <!-- id: 40 -->
- [ ] T041 性能优化审查 <!-- id: 41 -->

---

## 第9阶段：归档准备

- [ ] T042 更新所有 TODO 状态为完成 <!-- id: 42 -->
- [ ] T043 验证所有场景在 spec.md 中已实现 <!-- id: 43 -->

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

- 长期记忆和短期记忆的基础设施可以并行构建
- Store 与 UI 组件可以并行开发
- Repository 和 Service 可以并行构建

---

## 技术要点

### Claude Agent SDK Hooks 集成

```typescript
// 在 claudeClient.ts 中集成
import { createMemoryHooks } from './memoryHooks';

// 在 queryOptions.hooks 中添加
const memoryHooks = createMemoryHooks(userId, sessionId);
queryOptions.hooks = {
  ...existingHooks,
  PostToolUse: [
    ...(existingHooks.PostToolUse || []),
    ...memoryHooks.PostToolUse,
  ],
};
```

### 短期记忆文件路径（用户维度，3天）

```
.investment-agent/
└── memory/
    └── users/
        └── {userId}/
            ├── preferences.md
            ├── context.md
            └── extracted.md
```