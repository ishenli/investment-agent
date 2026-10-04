# Proposal

## Why

ChatUI 已存在"可以接着问"的渲染位(`SuggestionBelowMessage` 读 `message.related`、`slice(0,3)`),且 SSE 通道与数据库持久化已全部打通——但生产代码没有任何 Agent 产出 `related` 事件,UI 位实际渲染不出内容;同时渲染被 gate 在"最后一条 assistant 消息"。用户希望在 **每条** AI 回复消息后都能看到不超过 3 条相关追问,当前半成品无法满足。

## What Changes

- **新增生成源(服务端)**:在 hermes / claude 两个引擎的 chat 路由里,assistant 回复完成后、`sendDone()` 之前,用 pi-ai 做一次轻量 LLM 生成 ≤3 条相关追问,通过 `sendRelated(items)` 发出——沿用已打通的 `related` 流事件链路实时落库。
- **按域限定**:生成前先用 `ReflectionAuditor.isDomainRelevant()`(投资域关键词)判定,非投资域不生成,控制每次对话多出的 LLM 调用成本。
- **fail-soft 兜底**:生成失败或超时只发空数组,绝不阻塞、不回退主回复。
- **UI 放开**:`SuggestionBelowMessage` 从"仅最后一条"放宽为"每条带 `related` 的 assistant 消息",历史消息因已持久化 `related` 也会一并渲染。≤3 截断(`slice(0,3)`)与点击填入输入框并发送的交互保持不变。
- **新增「对话设置」开关**:settings 模块新增「对话设置」页,提供本功能的开关(按账户持久化,复用 `/api/setting`)。服务端两引擎路由在生成前读取开关,关闭时跳过生成(不发 `related`);未配置时默认开启,保证功能开箱即用。

## Capabilities

### New Capabilities

- `conversation-settings`: 对话设置模块——settings 内新增「对话设置」页,提供 AI 追问提示功能的按账户开关,默认开启。

### Modified Capabilities

- `chat-api`: 新增行为——每个完成的 assistant 回复会按投资域限定生成 ≤3 条相关追问,并以 `related` SSE 事件发回前端;生成仅在「对话设置」开关开启时进行,失败不阻塞主回复。
- `chat-generative-ui`: 新增行为——每条携带 `related` 数据的 assistant 消息都应在正文下方渲染对应追问建议(≤3),而非仅最后一条。

## Impact

- **服务端**:`src/app/api/chat/hermes/route.ts`、`src/app/api/chat/claude/route.ts` 的收尾流程(新增生成 + `sendRelated`);复用 `packages/hermes-agent/src/reflection/auditor.ts` 的 `isDomainRelevant` 与 `@earendil-works/pi-ai/compat` 的 `complete`(已有先例)。
- **前端**:`src/app/(pages)/chat/features/Conversation/Messages/Assistant/BelowMessage.tsx` 渲染 gate 放宽;`src/app/(pages)/setting/` 新增「对话设置」页,`settings-sidebar.tsx` 加入口。
- **服务端设置**:`src/server/controller/setting.ts` 的 `SettingKeySchema` 新增 `CHAT_AI_TIPS_ENABLED`;两引擎路由生成前置一段开关读取(默认开启)。
- **数据**:消息 `related` 字段已持久化,历史消息自动兼容;设置走既有 account settings 表,无 schema / 迁移变更,无破坏性改动。
- **成本**:每轮投资域对话且开关开启时新增一次轻量 LLM 调用;非投资域或开关关闭时不调用。