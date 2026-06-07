# 实现计划：Chat 面板支持技能的显式调用

**分支**：`docs/issue-91-spec` | **日期**：2026-06-06 | **规范**：https://github.com/ishenli/investment-agent/issues/91
**输入**：来自 issue #91 的功能需求与 OpenSpec delta

## 概要

在 Claude / Hermes 引擎的 Chat 输入区增加显式 Skill 调用：用户通过 `/`、`@` 或工具栏入口选择当前会话可用 skill，输入区显示 Skill Chip，发送时在请求中携带 `explicitSkill`。服务端优先注入该 skill prompt，同时保留现有 `skills` 隐式会话级注入机制。DeepAgents 引擎保持原插件工具体验。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Zustand, Ant Design, @lobehub/ui, LangChain.js, LangGraph
**存储**：无需新增持久化；pending explicit skill 为客户端会话态
**测试**：Vitest, React Testing Library
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：技能选择器过滤在 100ms 内响应；不增加首包关键路径；聊天请求不额外引入数据库写入
**约束条件**：必须兼容现有 `skills` 字段；DeepAgents 不展示该功能；不得把 prompt 全量写入普通日志

## 规范检查

- 检查是否符合 [项目规范](file://openspec/agent/memory/constitution.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性
- 新 capability 不重复创建：本变更复用 `skills-management` 与 `chat-api`

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-explicit-skill-invocation/
├── proposal.md
├── plan.md
├── tasks.md
└── specs/
    ├── chat-api/
    │   └── spec.md
    └── skills-management/
        └── spec.md
```

### 源代码（项目根目录）

```text
src/
├── app/
│   ├── (pages)/chat/features/ChatInput/
│   │   ├── Desktop/InputArea/
│   │   ├── ActionBar/Tools/
│   │   └── useSend.ts
│   ├── api/chat/
│   │   ├── claude/route.ts
│   │   └── hermes/route.ts
│   ├── services/chat.ts
│   └── store/
│       ├── chat/slices/aiChat/actions/generateAIChat.ts
│       └── skills/
└── types/
    └── skill.ts
```

**结构决策**：UI 状态放在现有 skills Zustand store，发送链路沿用 `useSendMessage` → `sendMessage` → `generateAIChat` → `chatService.createAssistantMessageStream` → chat API。服务端优先适配 `/api/chat/claude`，Hermes 通过 engine extra/typed params 接收 `explicitSkill`，避免新增独立 API。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户可以在 Claude/Hermes Chat 输入区选择一个技能并看到 Skill Chip | 输入 `/` 或 `@` 打开面板，选择技能后 Chip 出现且可删除 |
| P1 | 发送消息时显式技能被传到 API 并优先注入 prompt | 网络请求包含 `explicitSkill`，服务端 prompt 记录显示显式技能位于隐式 skills 前 |
| P2 | 技能选择体验支持搜索、分组、键盘导航和空状态 | 使用键盘上下/Enter/Esc 操作，搜索可过滤，空列表有提示 |
| P3 | Hermes 引擎接收显式技能参数，DeepAgents 保持原样 | Hermes 请求可带 `explicitSkill`；DeepAgents UI 和请求均不出现该字段 |

## 技术架构

### 数据流

```text
User types "/" or "@" / clicks trigger
  -> InputArea opens SkillPickerPanel
  -> useSkillsStore.setSessionExplicitSkill(sessionId, slug)
  -> SkillChipBar renders selected skill
  -> useSendMessage reads pending explicit skill
  -> generateAIChat passes explicitSkill to chatService
  -> /api/chat/claude or /api/chat/hermes resolves skill prompt
  -> final system prompt injects explicit skill before implicit skills
  -> stream response returns through existing SSE flow
```

### 状态管理

- **服务端**：不持久化 `explicitSkill`，仅在请求处理期间解析和注入 prompt。
- **客户端**：在 `useSkillsStore` 增加 `sessionExplicitSkill: Record<string, string | null>` 及 set/clear/selectors；与 `sessionActiveSkills` 分离。
- **缓存策略**：复用现有 skills SWR 获取与 store 缓存；选择器只从已加载 skills 中筛选当前会话可用项。

### 外部集成

- **Claude Agent SDK**：扩展 `/api/chat/claude` request schema，显式技能 prompt 进入 `systemPrompt`。
- **Hermes Agent**：扩展 `/api/chat/hermes` schema 与 engine extra，按 Hermes 现有 prompt 组装路径注入。
- **数据库**：无需 schema 变更。

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 无 | 无 | 无 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 显式 skill 与隐式 skills 重复注入 | 中 | 服务端对显式 slug 去重，显式 prompt 只出现在 explicit block |
| 未授权或不存在 slug 被注入 | 高 | 服务端按 authenticated user 解析 skill，未知 slug 返回 4xx |
| 输入 `/`、`@` 干扰普通文本 | 中 | 仅在命令边界触发；Esc 可关闭；选择后不强制修改用户文本 |
| Hermes 与 Claude 注入路径差异 | 中 | 先定义统一请求字段与 prompt 语义，按 engine adapter 分别实现测试 |

## 性能考虑

- 技能 picker 使用本地 store 数据过滤，不因每次输入发起 API 请求。
- 搜索过滤以 slug/name/description 字段为准，技能数量较少时无需虚拟列表；若未来技能数量增长可加 memoized 分组。
- 不新增数据库写入，不影响聊天流式响应首包。

## 安全考虑

- `explicitSkill` 必须是当前用户可访问的 skill slug。
- 服务端不得信任前端传入的 skill name/prompt，只能按 slug 从 SkillRegistry/SkillService 解析。
- 普通日志只记录 slug，不记录完整 prompt 内容。
- prompt 注入需要保持明确边界，避免把显式 skill 与用户正文混淆。

## 测试策略

- **单元测试**：skills store pending explicit skill actions/selectors；prompt builder 显式/隐式去重与错误分支。
- **组件测试**：SkillPickerPanel 搜索、键盘导航、空状态；SkillChipBar 删除/禁用状态。
- **集成测试**：`/api/chat/claude` schema 接受 `explicitSkill`；未知 slug/空 prompt 返回 4xx；正常请求 final prompt 顺序正确。
- **端到端测试**：Claude/Hermes 输入 `/` 选择技能、发送消息、请求 payload 包含 `explicitSkill`；DeepAgents 不展示入口。
