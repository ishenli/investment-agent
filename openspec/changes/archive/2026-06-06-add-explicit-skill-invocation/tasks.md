# 任务：Chat 面板支持技能的显式调用

**输入**：来自 `openspec/changes/add-explicit-skill-invocation/specs/` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| Chat Input | `src/app/(pages)/chat/features/ChatInput/` |
| Chat API | `src/app/api/chat/[engine]/route.ts` |
| Chat Service | `src/app/services/chat.ts` |
| Chat Store | `src/app/store/chat/` |
| Skills Store | `src/app/store/skills/` |
| Types | `src/types/` |

## 第0阶段：准备（设计与验证）

- [x] T000 创建变更目录结构 `openspec/changes/add-explicit-skill-invocation/` <!-- id: 0 -->
- [x] T001 编写 `proposal.md` 描述变更意图和影响 <!-- id: 1 -->
- [x] T002 编写 `plan.md` 技术计划 <!-- id: 2 -->
- [x] T003 编写 `tasks.md` 实现任务清单 <!-- id: 3 -->
- [x] T004 编写 `chat-api` 与 `skills-management` spec delta <!-- id: 4 -->
- [x] T005 运行 `openspec validate add-explicit-skill-invocation --strict` 验证 <!-- id: 5 -->

---

## 第1阶段：设置（类型与状态基础）

**目的**：建立显式技能调用的类型、状态和选择器。

- [x] T006 [P] 在 chat stream 参数类型中新增 `explicitSkill?: string` <!-- id: 6 -->
- [x] T007 [P] 在 Claude/Hermes API request schema 中新增 `explicitSkill?: string` <!-- id: 7 -->
- [x] T008 在 `src/app/store/skills/store.ts` 增加 `sessionExplicitSkill: Record<string, string | null>` <!-- id: 8 -->
- [x] T009 在 skills store 增加 `setSessionExplicitSkill`、`clearSessionExplicitSkill`、`getSessionExplicitSkill` actions <!-- id: 9 -->
- [x] T010 在 `src/app/store/skills/selectors.ts` 增加 pending explicit skill selector 与可用 skill selector <!-- id: 10 -->
- [ ] T011 编写 skills store actions/selectors 单元测试 <!-- id: 11 -->

---

## 第2阶段：基础（服务端 prompt 解析）

**目的**：先完成请求协议和 prompt 注入，阻塞 UI 发送联调。

**⚠️ 关键**：此阶段完成前不应开始端到端 UI 联调。

- [x] T012 在 skill service 或 Claude route 中实现按 slug 解析当前用户可访问 skill 的 helper <!-- id: 12 -->
- [x] T013 在 `/api/chat/claude` 中解析 `explicitSkill` 并处理 unknown slug / empty prompt 4xx 错误 <!-- id: 13 -->
- [x] T014 在 Claude final system prompt 中把显式 skill block 放在隐式 skills block 前，并对重复 slug 去重 <!-- id: 14 -->
- [x] T015 在 `/api/chat/hermes` 中接收并透传 `explicitSkill` 到 engine extra 或 prompt 构建参数 <!-- id: 15 -->
- [ ] T016 为 prompt 注入顺序、重复 slug、未知 slug、空 prompt 添加单元或 route 集成测试 <!-- id: 16 -->

**检查点**：API 可独立接收 `explicitSkill` 并正确注入 prompt。

---

## 第3阶段：User Story 1 - 输入区选择显式技能 (优先级：P1) 🎯 MVP

**目标**：用户能在 Claude/Hermes 输入区选择一个 skill，并看到可删除的 Skill Chip。
**独立测试**：切换 Claude/Hermes session，输入 `/` 或 `@` 打开 picker，选中 skill 后 Chip 出现，删除后消失。

### 实现

- [x] T017 [P] [US1] 新建 `SkillChipBar` 组件，支持显示、删除、禁用和 tooltip <!-- id: 17 -->
- [x] T018 [P] [US1] 新建 `SkillPickerPanel` 组件，支持 open、搜索、分组、当前选中高亮和空状态 <!-- id: 18 -->
- [x] T019 [P] [US1] 新建 `SkillTrigger` 或在 `InputArea` 中实现 `/`、`@` 命令边界监听 <!-- id: 19 -->
- [x] T020 [US1] 在 `InputArea` 上方集成 `SkillChipBar` 和 `SkillPickerPanel` <!-- id: 20 -->
- [x] T021 [US1] 在 ChatInput ActionBar 增加显式技能触发入口，并仅对 Claude/Hermes 展示 <!-- id: 21 -->
- [x] T022 [US1] 确保 DeepAgents 引擎不展示显式技能入口且 `/`、`@` 不触发 picker <!-- id: 22 -->
- [ ] T023 [US1] 编写 SkillChipBar / SkillPickerPanel 组件测试 <!-- id: 23 -->

**检查点**：US1 功能完整可用，不涉及发送。

---

## 第4阶段：User Story 2 - 发送显式技能 payload (优先级：P1)

**目标**：发送消息时把 selected explicit skill slug 带到 API，并在发送接受后清空。
**独立测试**：选择 skill 后发送消息，网络请求 body 包含 `explicitSkill`；再次发送时字段消失。

### 实现

- [x] T024 [US2] 更新 `useSendMessage` 读取当前 session pending explicit skill 并传入 send params <!-- id: 24 -->
- [x] T025 [US2] 更新 `sendMessage` / `generateAIChat` 参数链路，透传 `explicitSkill` <!-- id: 25 -->
- [x] T026 [US2] 更新 `src/app/services/chat.ts` 的 `createAssistantMessageStream` 与 `bailingLLMStream`，仅向 Claude/Hermes 发送 `explicitSkill` <!-- id: 26 -->
- [x] T027 [US2] 发送被接受后清空当前 session pending explicit skill；发送失败时保留以便重试 <!-- id: 27 -->
- [ ] T028 [US2] 添加发送链路单元测试或集成测试，覆盖有/无 explicit skill 与 DeepAgents 忽略字段 <!-- id: 28 -->

---

## 第5阶段：User Story 3 - Picker 体验完善 (优先级：P2)

**目标**：补齐键盘导航、搜索分组、空状态和可访问性。
**独立测试**：仅用键盘即可完成打开、搜索、选择、关闭；无技能时有明确提示。

### 实现

- [ ] T029 [P] [US3] 为 picker 实现 ArrowUp/ArrowDown/Enter/Escape 键盘行为 <!-- id: 29 -->
- [ ] T030 [P] [US3] 实现 name/description/slug 本地过滤与 category 分组 <!-- id: 30 -->
- [ ] T031 [P] [US3] 实现无可用技能空状态和跳转 skills settings 行为 <!-- id: 31 -->
- [ ] T032 [US3] 补充 ARIA label、focus 管理和禁用状态 <!-- id: 32 -->
- [ ] T033 [US3] 添加键盘导航和空状态组件测试 <!-- id: 33 -->

---

## 第6阶段：完善与质量保证

**目的**：跨用户故事的验证和回归检查。

- [ ] T034 运行 `pnpm run lint` 并修复问题 <!-- id: 34 -->
- [x] T035 运行 `pnpm run types:check` 确保类型正确 <!-- id: 35 -->
- [ ] T036 运行 `pnpm test` 确保测试通过 <!-- id: 36 -->
- [ ] T037 使用浏览器验证 Claude/Hermes/DeepAgents 三类 engine 的输入区展示差异 <!-- id: 37 -->
- [ ] T038 检查 prompt debug 记录和普通日志，确保 prompt 内容不会进入普通日志 <!-- id: 38 -->
- [ ] T039 更新所有 TODO 状态为完成并复核 spec 场景覆盖 <!-- id: 39 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置，阻塞发送链路与服务端联调
- **US1 输入区选择**：依赖设置，可与第2阶段部分并行
- **US2 发送 payload**：依赖第2阶段和 US1 基础状态
- **US3 体验完善**：依赖 US1
- **完善**：依赖期望的 US 完成

### 并行机会

- Store 类型/selector 与 API schema 可并行开发
- SkillChipBar、SkillPickerPanel、SkillTrigger 可并行开发
- Claude route 测试与 Hermes route 透传测试可并行开发
