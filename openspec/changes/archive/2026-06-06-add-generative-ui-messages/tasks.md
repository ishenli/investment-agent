# 任务：Server-driven Generative UI for Chat Messages

**输入**：来自 `openspec/changes/add-generative-ui-messages/specs/` 的设计文档  
**前置条件**：plan.md（必需）  
**参考**：`openspec/project.md`

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 第0阶段：准备（设计与验证）

- [x] T000 创建变更目录结构 `openspec/changes/add-generative-ui-messages/`
- [x] T001 编写 `proposal.md` 描述变更意图和影响
- [x] T002 编写 `plan.md` 描述技术方案
- [x] T003 编写 `tasks.md` 拆分实施任务
- [x] T004 编写 `chat-generative-ui`、`chat-api`、`chat-storage` spec deltas
- [x] T005 运行 `openspec validate add-generative-ui-messages --strict` 并修复问题

---

## 第1阶段：设置（协议与类型）

**目的**：建立可复用的 artifact 类型、schema 和安全边界。

- [x] T006 [P] 在 `src/types/message/chat.ts` 为 `ChatMessage` 增加可选 `uiArtifacts?: UIArtifact[]`
- [x] T007 [P] 在 `src/types/chat/schemas.ts` 或相邻文件定义 `UIArtifact` TypeScript 类型与 Zod schemas
- [x] T008 [P] 定义 `stock_quote_card`、`fund_detail_panel`、`data_chart`、`trade_intent_card` props schema
- [x] T009 为 chart schema 增加 series 和 data point 数量上限
- [x] T010 为 trade intent schema 增加 pending intent 状态、action、symbol、quantity、idempotency key 等字段约束
- [x] T011 编写 schema validation 单元测试

**检查点**：类型与 schema 可独立验证，且历史 `ChatMessage` 不需要 `uiArtifacts`。

---

## 第2阶段：基础（消息状态与存储）

**目的**：在 UI 前完成消息状态更新和持久化能力。

**关键**：此阶段完成前不应开始真实 Agent 接入。

- [x] T012 更新 `src/app/store/chat/slices/message/reducer.ts` 支持按 message id upsert/replace artifact
- [x] T013 更新 `src/app/store/chat/slices/message/action.ts` 增加 artifact 更新动作（如现有流式路径需要）
- [x] T014 更新 `src/server/service/chatStorageService.ts` 在保存/更新助手消息时校验并保存 `uiArtifacts`
- [x] T015 更新 `src/server/repository/chat/message.ts` 和相关 Drizzle schema 以持久化 `uiArtifacts` JSON
- [x] T016 确保查询历史消息时缺失 `uiArtifacts` 被视为 undefined 或空数组
- [x] T017 编写 message reducer 和 storage service 单元测试

**检查点**：fixture 消息可保存、读取并恢复 `content + uiArtifacts`。

---

## 第3阶段：User Story 1 - 股票卡片 POC (优先级：P1) MVP

**目标**：助手消息正文下方可以安全渲染 `stock_quote_card`。  
**独立测试**：使用 fixture/mock 消息打开聊天列表，股票卡片显示；未知 type 或非法 props 显示 fallback。

- [x] T018 [P] 创建 `src/app/(pages)/chat/features/Conversation/components/GenerativeUI/schemas.ts`
- [x] T019 [P] 创建 `src/app/(pages)/chat/features/Conversation/components/GenerativeUI/registry.ts`
- [x] T020 [P] 创建 `src/app/(pages)/chat/features/Conversation/components/GenerativeUI/fallback.tsx`
- [x] T021 创建 `GenerativeUIRenderer` 并接入 registry + schema validation
- [x] T022 [P] 实现 `components/StockQuoteCard.tsx`
- [x] T023 在 `src/app/(pages)/chat/features/Conversation/components/ChatItem/index.tsx` 或 assistant message 渲染路径中接入 `GenerativeUIRenderer`
- [x] T024 确保 markdown 文本先渲染，UI artifacts 位于正文下方
- [x] T025 编写组件测试覆盖正常渲染、未知 type、非法 props、无 `uiArtifacts`

**检查点**：P1 可独立发布，不接真实模型也能验证 UI。

---

## 第4阶段：User Story 2 - 流式 Artifact Event (优先级：P2)

**目标**：Agent 回复流中可同时更新文本和 UI artifacts。  
**独立测试**：模拟 text delta + artifact event，最终消息同时包含 `content` 和 `uiArtifacts`。

- [ ] T026 定义 chat stream artifact event payload 和 message id 关联规则
- [ ] T027 更新 `src/server/service/chatService.ts` 或 Agent streaming adapter 以发送 artifact event
- [ ] T028 增加 controlled `createUIArtifact` business tool，并在服务端校验 props
- [ ] T029 更新 `src/app/store/chat/slices/aiChat/actions/generateAIChat.ts` 解析 artifact event
- [ ] T030 确保非法 artifact 不流向客户端，文本回复继续输出
- [ ] T031 编写流式 parser 和服务端 artifact event 集成测试

---

## 第5阶段：User Story 3 - 持久化与非视觉 fallback (优先级：P3)

**目标**：生成式 UI 可恢复，复制/分享/导出不丢信息。  
**独立测试**：保存后刷新仍显示卡片；分享文本中包含 artifact `fallbackText`。

- [ ] T032 更新 `src/app/services/message/serverClient.ts` 相关 DTO 以传输 `uiArtifacts`
- [ ] T033 更新分享文本模板 `src/app/(pages)/chat/features/Conversation/components/ChatItem/ShareMessageModal/ShareText/template.ts` 纳入 `fallbackText`
- [ ] T034 更新分享图片预览路径，确保生成式 UI 或 fallback 呈现合理
- [ ] T035 更新复制/导出路径（如存在）以包含 `fallbackText`
- [ ] T036 编写分享/导出 fallback 单元测试

---

## 第6阶段：User Story 4 - 投资业务组件扩展 (优先级：P4)

**目标**：按安全边界扩展基金、图表、交易意图卡。  
**独立测试**：每类 artifact schema、渲染和失败 fallback 均有覆盖；交易卡必须二次确认。

- [ ] T037 [P] 实现 `FundDetailPanel.tsx`
- [ ] T038 [P] 实现懒加载 `DataChart.tsx`
- [ ] T039 [P] 实现 `TradeIntentCard.tsx`
- [ ] T040 实现 `confirmTradeIntent` 客户端触发路径
- [ ] T041 实现或接入后端交易确认 API 的账户、权限、价格、风控、幂等校验
- [ ] T042 编写交易意图不直接成交的集成测试

---

## 第7阶段：完善与质量保证

- [ ] T043 运行 `npm run lint` 并修复问题
- [ ] T044 运行 `npm run types:check` 确保类型正确
- [ ] T045 运行 `npm test` 确保测试通过
- [ ] T046 验证长对话虚拟列表渲染和图表懒加载表现
- [ ] T047 验证移动端卡片宽度、图表高度、操作按钮可点击区域
- [ ] T048 更新所有已完成任务状态

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置，阻塞真实 Agent 和 UI 状态接入
- **P1 股票卡片**：依赖第1阶段，可使用 fixture 独立验证
- **P2 流式事件**：依赖第1、2阶段
- **P3 持久化 fallback**：依赖第2阶段
- **P4 扩展组件**：依赖 P1 renderer 和 schema registry
- **完善**：依赖计划发布的 User Stories 完成

### 并行机会

- Schema 类型与 renderer fallback 可并行
- 不同 artifact 组件可并行
- share/export fallback 与 storage DTO 更新可并行
- 服务端 artifact tool 与客户端 stream parser 可在事件协议确定后并行
