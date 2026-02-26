# 任务：统一 Agent 管理系统

**输入**：来自 `/specs/agent-management/spec.md` 的设计文档
**前置条件**：proposal.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check` ✅ 通过
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/agent/route.ts` |
| Repository | `src/server/repository/agentRepository.ts` |
| Service | `src/server/service/agentService.ts` |
| Config | `src/server/const/builtinAgents.ts` |
| Instrumentation | `src/instrumentation.ts` |
| Components | `src/app/(pages)/setting/agent/` |
| Types | `src/types/agent.ts` |

---

## 第0阶段：准备（设计与验证）

- [x] T000 创建变更目录结构 `openspec/changes/unify-agent-management/`
- [x] T001 编写 proposal.md 描述变更意图和影响
- [x] T002 编写 spec delta 规范变更
- [x] T003 运行 `openspec validate unify-agent-management --strict` 验证

---

## 第1阶段：数据库模式变更

**目的**：扩展 agent 表以支持内置 Agent 标识

- [x] T004 在 `drizzle/schema.ts` 中为 agent 表添加 `isBuiltin` 字段
- [x] T005 生成数据库迁移文件 `pnpm db:push`

---

## 第2阶段：Repository 层

**目的**：创建 Agent 数据访问层，继承 BaseIntRepository

**⚠️ 关键**：此阶段完成前不应开始 Service 工作

- [x] T006 创建 `src/server/repository/agentRepository.ts`
- [x] T007 实现 `findBySlug(slug: string)` 方法
- [x] T008 实现 `findByIsBuiltin(isBuiltin: boolean)` 方法
- [x] T009 实现 `existsBySlugAndIsBuiltin(slug, isBuiltin)` 方法
- [x] T010 导出单例 `agentRepository`

**检查点**：Repository 层就绪 ✅

---

## 第3阶段：Service 层与配置

**目的**：业务逻辑层，处理 Agent 初始化和查询

### 内置 Agent 配置

- [x] T011 创建 `src/server/const/builtinAgents.ts`
- [x] T012 定义 `BUILTIN_AGENTS_CONFIG` 常量（market_information 等）
- [x] T013 定义 `BuiltinAgentConfig` 类型

### AgentService

- [x] T014 更新 `src/server/service/agentService.ts`
- [x] T015 实现 `initializeBuiltinAgents()` 方法（幂等初始化）
- [x] T016 实现 `getAgentBySlug(slug)` 方法（支持 inbox 特殊处理）
- [x] T017 实现 `listAgents(options?)` 方法（区分内置/自定义）

**检查点**：Service 层就绪 ✅

---

## 第4阶段：Instrumentation 初始化钩子

**目的**：服务端启动时自动初始化内置 Agent

- [x] T018 Next.js 15+ 默认启用 instrumentation（无需配置）
- [x] T019 创建 `src/instrumentation.ts` 文件
- [x] T020 实现 `register()` 函数，调用 `AgentService.initializeBuiltinAgents()`
- [x] T021 添加错误处理和日志记录

**检查点**：服务启动时自动初始化内置 Agent ✅

---

## 第5阶段：API 层更新

**目的**：提供 Agent 管理 API

- [x] T022 更新 `src/server/controller/agent.ts` GET 方法支持 `isBuiltin` 过滤
- [x] T023 更新 `src/server/controller/agent.ts` PUT 方法支持更新内置 Agent（部分字段限制）
- [x] T024 添加请求验证（Zod schema）- 已有
- [x] T025 添加错误处理和日志记录

---

## 第6阶段：User Story 1 - 统一 Agent 配置页面 (优先级：P1) 🎯 MVP

**目标**：用户可以在配置页面查看和管理数据库中的 Agent（内置 + 自定义，不含 inbox）
**独立测试**：打开设置页面，可以看到数据库中的 Agent，并可以编辑部分配置

### 实现

- [x] T026 [US1] 更新 `src/types/agent/agentType.ts` 添加 `isBuiltin` 类型定义
- [x] T027 [US1] 在 `src/app/(pages)/setting/agent/page.tsx` 添加 Agent 类型筛选（全部/内置/自定义）
- [x] T028 [US1] 在 Agent 卡片中显示内置标识
- [x] T029 [US1] 内置 Agent 编辑时限制可修改字段（apiKey, apiUrl 不可修改）
- [x] T030 [US1] 添加加载/错误状态处理
- [x] T031 [US1] 添加 i18n 国际化支持

**检查点**：Agent 配置页面可以正确显示和管理数据库中的 Agent ✅

---

## 第7阶段：User Story 2 - Session 创建与 Agent 关联 (优先级：P2)

**目标**：创建 Session 时可以直接选择 Agent（包括数据库中的 Agent）
**独立测试**：在聊天页面，可以选择数据库中的 Agent 创建新会话

### 实现

- [x] T032 [US2] 更新 `src/app/api/chat/schemas.ts` CreateSessionSchema 支持 `agentSlug` 参数
- [x] T033 [US2] 改造 `src/server/controller/chatController.ts` createSession 方法
- [x] T034 [US2] POST 方法支持 agentSlug='inbox' 或数据库 Agent slug，自动获取 Agent 配置
- [x] T035 [US2] Session 创建时将 Agent 名称和 Logo 复制到 meta 中，SessionItem 和 ChatHeader 已可显示
- [x] T036 [US2] 创建 AgentSwitchPanel 组件，支持切换 Agent（需在适当位置集成）

**检查点**：Session 可以正确关联 Agent，并在 UI 中展示 ✅

---

## 第8阶段：精简硬编码配置

**目的**：移除非 inbox 的硬编码配置，保留 inbox 作为系统基础

- [x] T037 精简 `src/app/const/session.ts` 中的 `SESSION_CONFIG_MAP`，只保留 `inbox`
- [x] T038 移除 `MARKET_INFO_SESSION_CONFIG` 相关配置
- [x] T039 更新所有引用 `SESSION_CONFIG_MAP.marketInfo` 的代码（无其他引用）
- [x] T040 确认 `inbox` 初始化逻辑正常工作

---

## 第9阶段：移除 Agent 中的 apiKey 和 apiUrl 字段

**目的**：Agent 不应该包含 API 配置，这些属于 ModelProvider 的职责

- [x] T041a 更新 `drizzle/schema.ts` 移除 `apiKey` 和 `apiUrl` 字段
- [x] T041b 运行 `pnpm db:push` 更新数据库
- [x] T041c 更新 `src/types/agent/agentType.ts` 移除相关类型定义
- [x] T041d 更新 `src/server/service/agentService.ts` 移除相关引用
- [x] T041e 更新 `src/server/controller/agent.ts` Zod schema 移除相关验证
- [x] T041f 更新 AgentForm 组件移除 API 字段表单
- [x] T041g 更新 AgentCard 组件移除 API 地址显示
- [x] T041h 更新 settings page 移除 formData 中的 apiKey/apiUrl

**检查点**：Agent 不再包含 API 配置字段 ✅

---

## 第10阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [x] T048 运行 `pnpm run lint` 并修复问题（原有警告，非本次变更引入）
- [x] T049 运行 `pnpm run types:check` 确保类型正确 ✅
- [ ] T050 运行 `pnpm test` 确保测试通过
- [ ] T051 添加/更新用户文档（如需要）
- [ ] T052 性能优化审查

---

## 第11阶段：归档准备

- [ ] T053 更新所有 TODO 状态为完成
- [ ] T054 验证所有场景在 spec.md 中已实现

---

## 完成总结

### 已完成的文件

| 文件 | 操作 | 描述 |
|------|------|------|
| `drizzle/schema.ts` | 修改 | 添加 `isBuiltin` 字段，移除 `apiKey`/`apiUrl` |
| `src/server/repository/agentRepository.ts` | 新增 | Agent 数据访问层 |
| `src/server/const/builtinAgents.ts` | 新增 | 内置 Agent 配置 |
| `src/server/service/agentService.ts` | 修改 | 添加初始化和查询逻辑，移除 apiKey/apiUrl 引用 |
| `src/instrumentation.ts` | 新增 | 服务端启动钩子 |
| `src/server/controller/agent.ts` | 修改 | 支持 `isBuiltin` 过滤，更新 Zod schema |
| `src/types/agent/agentType.ts` | 修改 | 添加 `isBuiltin` 类型，移除 apiKey/apiUrl |
| `src/app/const/session.ts` | 修改 | 只保留 `inbox` 配置 |
| `src/app/(pages)/setting/agent/page.tsx` | 修改 | 内置标识和编辑限制，移除 API 字段 |
| `src/app/(pages)/setting/agent/components/AgentForm.tsx` | 修改 | 移除 apiKey/apiUrl 表单字段 |
| `src/app/(pages)/setting/agent/components/AgentCard.tsx` | 修改 | 移除 API 地址显示 |
| `src/app/api/chat/schemas.ts` | 修改 | 支持 `agentSlug` 参数 |
| `src/server/controller/chatController.ts` | 修改 | 支持 Agent 创建 Session |
| `src/app/hooks/useAgents.ts` | 新增 | Agent 列表 hook |
| `src/app/(pages)/chat/features/AgentSwitchPanel/index.tsx` | 新增 | Agent 切换面板组件 |
| `src/locales/zh-CN/setting.json` | 修改 | 中文翻译 |
| `src/locales/en-US/setting.json` | 修改 | 英文翻译 |
| `src/locales/zh-CN/chat.json` | 修改 | 中文翻译（agent 相关） |
| `src/locales/en-US/chat.json` | 修改 | 英文翻译（agent 相关） |

### 待完成的任务

- T050: 测试通过
- T051: 用户文档