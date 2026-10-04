# Design

## Context

复用既有 `related` 管道:agent → SSE(`related` 事件)→ 前端 store 实时落库(`generateAIChat.ts` 的 `onMessageHandle` / `internal_updateMessageContent`)→ `SuggestionBelowMessage` 渲染。现状缺口:① 生产代码零产出 `related`(`sseEmitter.sendRelated()` 无调用);② UI gate 仅"最后一条 assistant 消息"。参见 proposal.md - Why。

约束:
- 两个引擎 hermes / claude 的 chat 路由均需产出 `related` 事件。
- 生成发生在 assistant 回复完成之后、`sendDone()` 之前(SSE 关闭后无法再发)。
- 生成失败不得阻塞主回复(fail-soft 必须)。

## Goals / Non-Goals

**Goals**
- 让每条带投资域上下文的 AI 回复后都有 ≤3 条可点击追问。
- 生成成本按投资域过滤收敛。

**Non-Goals**
- 不新增提示类型/数据结构(继续用 `related: string[]`,不引入新 SSE 事件类型)。
- 不做价格、持仓等个性化追问生成(纯文本追问)。
- 不迁移/重建既有 `related` 存储。

## Decisions

### D1: 生成源挂在 chat 路由收尾,而非 hermes-agent 运行循环内
现状的 `runEngine()` 完成后,路由已持有 `result.content`(完整 assistant 回复)与历史 `body.messages`,在 `sendDone()` 前插入一次轻量生成天然顺路。
- **选它**:零改动 agent 运行循环,两个引擎路由各一处,后续想换生成策略只动路由。
- 备选 A:在 hermes-agent reflection 步骤内生成。缺点:同步会拖慢主回复、改造 agent loop 侵入大。
- 备选 B:前端在消息结束后异步补一次 LLM 调用。缺点:前端新增第二处成本点,且 `related` 字段的实时落库链路变复杂。

### D2: 领域门用既有 `ReflectionAuditor.isDomainRelevant()`
`packages/hermes-agent/src/reflection/auditor.ts` 已有 `isDomainRelevant(messages)`(投资域关键词),与其重复写关键词表不如复用。
- **注意**:该方法是 `auditor.ts` 类方法,需实例化 `ReflectionAuditor`;诚然它可以抽成工具函数,但为最小 diff 直接实例化调用即可。
- 备选:新写关键词匹配。缺点:两份领域关键词漂移。

### D3: 生成 prompt 用 pi-ai `complete`,输出 JSON 数组
与 `auditor.ts` 同款调用(`@earendil-works/pi-ai/compat` 的 `complete`,model 来自请求)。prompt 给最后一条 AI 回复 + 最近几条上下文,要求输出 ≤3 条短追问的 JSON 数组;解析失败走 fail-soft 空数组。
- **上限强制**:解析出多于 3 条则截断到 3;生成侧 prompt 同时要求 ≤3(双保险)。

### D4: UI 放宽 gate,保留交互
`Assistant/BelowMessage.tsx`:`isLastAssistant` 判据改为 `role === 'assistant' && !!related?.length`。`slice(0,3)`、点击填输入框 + `sendMessage({ isWelcomeQuestion: true })` 保留。
- 历史消息因 `related` 已持久化会自动回显,贴合"每次 Message 后"。

### D5: 开关用既有账户设置键,默认开启
新增设置键 `CHAT_AI_TIPS_ENABLED`,值 `'true'` / `'false'`,纳入 `SettingKeySchema` 白名单,复用 `SettingService.getConfigValueByKey`(DB 优先、env 兜底),存储走既有 account settings 表,零迁移。
- **默认开启**:未配置视为开启——保证功能开箱即用,用户可关闭。
- **读取时机**:各引擎路由在 domain-gate 之前读一次该键;关闭则跳过生成并跳过 `sendRelated`(比"发空数组"更省;客户端因无 `related` 自然不渲染)。

### D6: UI 落点在 settings 新增「对话设置」页
新增 `src/app/(pages)/setting/conversation/page.tsx` 及 sidebar 入口,页内含 AI 追问提示开关,读写 `GET/PUT /api/setting`;交互复用 FeishuConfigTab 的 Switch 模式。
- 备选:塞进 general 页。缺点:对话相关设置将来会更多,general 页会臃肿;独立页更贴合用户要的「对话设置」模块。

## Risks / Trade-offs

- **[每轮投资域对话多一次 LLM 调用成本]** → D2 领域门 + D5 开关双闸;generation 失败立即降级;后续可加节流/缓存。
- **[生成延迟被感知到主回复完成时刻(在 sendDone 前阻塞)]** → 生成设超时(如 5s),超时即发空数组;回复文本已流完,用户观感只剩极短尾部等待。
- **[解析模型输出失败 → 无提示]** → fail-soft 空数组,不降级主回复;仅损失本次提示。
- **[多轮追问交互可能被用户当作自动发送打扰]** → 点击才发送(现状已如此),非自动弹出。
- **[开关关闭后旧消息仍显示历史追问]** → 只影响新消息;可视作"关闭的是生成行为",历史提示保留。若要彻底隐藏需加前端渲染门,当前不做。

## Migration Plan

- 服务端新增 `related` 产出为增量:历史消息 `related` 字段已是 DB 列,无需迁移。
- 无 Electron/web 差异:两引擎路由同为 server 侧,SSE 通道共用。
- Rollback:路由侧生成代码可整体回退(不含发送,主回复不受影响);UI gate 回退到 `isLastAssistant` 即恢复旧行为。

## Open Questions

_无。_