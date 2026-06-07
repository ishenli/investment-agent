# 实现计划：Server-driven Generative UI for Chat Messages

**分支**：`feat/genui` | **日期**：2026-06-03 | **规范**：`openspec/changes/add-generative-ui-messages/specs/`
**输入**：GitHub issue #86 讨论结论与 OpenSpec delta

## 概要

本变更将聊天中的生成式 UI 定义为受控的 `UIArtifact` JSON 协议：Agent 通过 tool calling 或 structured output 生成经 Zod 校验的 artifact，前端通过白名单注册表映射到 React 业务组件，并以内联卡片形式显示在 assistant 消息正文下方。首版 POC 聚焦 `stock_quote_card`，同时定义基金详情、受限图表、交易意图确认卡的协议和安全边界。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20  
**主要依赖**：Next.js 16, React 19, AI SDK 5, Zod, Zustand, Recharts, Drizzle ORM  
**存储**：SQLite 服务端消息存储，客户端 Zustand 消息状态  
**测试**：Vitest, React Testing Library  
**目标平台**：桌面 Web (Electron + Web)  
**项目类型**：Next.js App Router (SSR + Client)  
**性能目标**：普通文本消息不因生成式 UI 增加明显渲染成本；长列表中卡片避免明显高度抖动；图表数据使用上限约束  
**约束条件**：必须兼容历史 `content: string` 消息；禁止模型输出任意 JSX/HTML；交易卡不能直接成交

## 规范检查

- 检查是否符合 `openspec/agent/memory/constitution.md`
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性
- 变更处于提案阶段，获得批准前不得开始实现

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-generative-ui-messages/
├── proposal.md
├── plan.md
├── tasks.md
└── specs/
    ├── chat-api/spec.md
    ├── chat-generative-ui/spec.md
    └── chat-storage/spec.md
```

### 源代码（项目根目录）

```text
src/
├── types/
│   ├── message/chat.ts                  # ChatMessage 增加 uiArtifacts
│   └── chat/schemas.ts                  # UIArtifact Zod schemas
├── app/
│   ├── api/chat/                        # chat stream artifact event
│   ├── services/chat.ts                 # 客户端 stream parser integration（已有文件）
│   ├── store/chat/slices/
│   │   ├── aiChat/actions/generateAIChat.ts
│   │   └── message/                     # artifact state update reducer/action
│   └── (pages)/chat/features/Conversation/components/
│       ├── ChatItem/index.tsx
│       └── GenerativeUI/
│           ├── index.tsx
│           ├── registry.ts
│           ├── schemas.ts
│           ├── fallback.tsx
│           └── components/
│               ├── StockQuoteCard.tsx
│               ├── FundDetailPanel.tsx
│               ├── DataChart.tsx
│               └── TradeIntentCard.tsx
└── server/
    ├── service/
    │   ├── chatService.ts               # 服务端 chat 业务逻辑（与客户端 src/app/services/chat.ts 区分）
    │   └── chatStorageService.ts
    └── repository/chat/message.ts
```

**结构决策**：生成式 UI 放在 conversation message renderer 内，不复用 Portal/Lobe Artifact，因为本变更目标是消息气泡内的小型业务 UI，而不是侧边栏大产物。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户查看股票行情时，在 assistant 消息中看到受控股票卡片 | 使用 fixture/mock 消息渲染 `stock_quote_card`，旧纯文本消息仍正常 |
| P2 | Agent 流式回复时可同时产生文本和 UI artifact | 模拟 stream 中 artifact event，消息状态同时累积 `content` 和 `uiArtifacts` |
| P3 | 生成式 UI 可持久化、恢复、复制/分享/导出 fallback | 保存后刷新会话仍显示卡片，文本导出包含 `fallbackText` |
| P4 | 基金、图表、交易意图组件按安全边界扩展 | schema 校验、图表 payload 限制、交易确认二次校验测试通过 |

## 技术架构

### 数据流

```text
用户输入
  -> /api/chat*
  -> chatService / Agent
  -> market tools / controlled createUIArtifact tool
  -> server-side UIArtifact Zod validation
  -> SSE text delta + artifact event (须在 AgentStreamEvent 联合类型 src/types/agentStream.ts 中新增 artifact 事件变体)
  -> generateAIChat stream parser
  -> message store: content + uiArtifacts
  -> ChatItem markdown + GenerativeUIRenderer
  -> chatStorageService persists message
```

### 状态管理

- **服务端**：`chatService` 负责产出或转发 artifact event；`chatStorageService` 负责校验并持久化 `uiArtifacts`。
- **客户端**：Zustand message slice 在流式过程中按 message id 更新 `content` 和 `uiArtifacts`。注意：当前 `UpdateMessageSchema`（`src/types/chat/schemas.ts`）仅允许 `{id, content, userLikeTag}`，须扩展为包含可选 `uiArtifacts` 字段。同时 `internal_updateMessageContent`（`src/app/store/chat/slices/message/action.ts`）的 extra 参数接口须增加 `uiArtifacts`，否则 store 无法接收 artifact 数据。
- **缓存策略**：沿用现有消息查询和 SWR/状态刷新机制，查询历史消息时返回已持久化 artifacts。

### 外部集成

- **AI SDK 5 / Agent 工具调用**：作为 structured output 或 tool calling 基础，但项目内部维护自己的 `UIArtifact` 协议。
- **Recharts**：用于受限 `data_chart` 渲染；首版可只实现股票卡片的迷你趋势。
- **数据库**：在 `chatMessages` 表中新增 `ui_artifacts` 列（`text` 类型，JSON 序列化，默认 `null`），保持历史消息兼容。迁移 SQL 须使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`（参考 `drizzle/migrations/` 幂等规范）。注意：Drizzle ORM 对 JSON 列存在 null 序列化问题，`MessageRepository.create` 中已有 workaround（显式将 null 字段设为 `sql'null'`），新增 `ui_artifacts` 列须沿用同一模式。

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 自定义 `UIArtifact` 协议 | 金融产品需要安全、审计、历史兼容和 Electron 兼容 | 直接采用 AI SDK RSC `streamUI` 会放大安全、序列化和长期维护风险 |
| 白名单组件注册表 | 防止模型生成任意组件或绕过交易流程 | 自由 JSON 到任意组件映射缺少可审计边界 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 模型产出非法 artifact | 高 | 服务端和前端双层 Zod 校验，非法 artifact 降级为 `fallbackText` 纯文本显示并附带 `[渲染失败]` 提示；前端 `GenerativeUIRenderer` 须包含 ErrorBoundary 捕获运行时渲染异常，同样降级到 fallbackText |
| 交易卡被误解为已成交 | 高 | 文案与状态限定为 pending intent，必须走 `confirmTradeIntent` 和服务端二次校验 |
| 图表 payload 过大影响虚拟列表 | 中 | 限制 series/data point 数量，图表懒加载，卡片稳定尺寸 |
| 历史消息不兼容 | 中 | `content` 保持必需，`uiArtifacts` 可选 |

## 性能考虑

- 普通文本消息：不加载图表组件，不增加明显渲染成本。
- 长列表：生成式 UI 卡片使用稳定宽度和最小高度，减少滚动跳动。
- 图表数据：schema 限制最大 series 和数据点数量。

## 安全考虑

- 模型只能输出 JSON artifact，不允许 JSX、HTML、script、style、iframe。
- `type` 必须命中白名单注册表。
- 每类 `props` 必须通过 Zod schema 校验。
- 交易意图卡仅表达待确认意图，所有交易动作必须经后端账户、权限、价格、风控、幂等校验。
- 所有 artifact 必须保留 `fallbackText`，支持复制、分享、导出和渲染失败。

## 测试策略

- **单元测试**：UIArtifact schema validation、registry fallback、message reducer artifact update、share/export fallback 拼接。
- **组件测试**：`GenerativeUIRenderer`、`StockQuoteCard`、fallback/error state、历史纯文本消息渲染。
- **集成测试**：文本流式 + artifact event + 持久化恢复。
- **性能验证**：长对话虚拟列表、图表懒加载、大 payload 限制。

## 待讨论 / Open Questions

1. **交易意图卡后端依赖**：P4 中 `TradeIntentCard` 依赖 `confirmTradeIntent` 后端流程（账户校验、风控、幂等），但 `transactionService` 中尚无此 API。首版是否将交易卡限定为纯展示（display-only intent），后端确认流程另立计划？
2. **与现有 markdownElements / LobeArtifact 管线的关系**：项目已有 `markdownElements` + rehype 插件 + `LobeArtifact` 渲染自定义 UI 的管线。是否应先评估在现有管线上扩展（80/20 方案），再决定是否需要全新的 `UIArtifact` 协议？
3. **UIArtifact 与 LobeArtifact 的共存 / 迁移 / 废弃策略**：如果引入新的 `UIArtifact` 协议，与现有 `LobeArtifact` 的关系是什么？是共存、渐进替换还是独立场景？需要明确边界以避免两套并行机制造成维护负担。
4. **P2 / P3 优先级顺序**：当前 P2 为持久化恢复，P3 为流式 artifact。流式传输是用户感知到"生成式"体验的核心环节，是否应将 P3 提前到 P2 之前？
