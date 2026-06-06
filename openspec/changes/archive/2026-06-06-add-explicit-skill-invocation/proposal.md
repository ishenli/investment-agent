# Change: Add explicit skill invocation in chat input

## Why
当前 Claude / Hermes 引擎下的 Skills 通过工具面板启用后会被隐式注入到上下文，用户无法确认单条消息是否真正按某个技能执行，也难以在临时场景中快速指定技能。需要在 Chat 输入区提供类似 `/skill` 或 `@skill` 的显式调用体验，让用户能主动选择本轮消息要使用的技能。

## What Changes
- 在 Chat 输入区新增显式技能选择入口，支持 `/`、`@` 和工具栏触发方式。
- 仅展示当前会话可用/已启用的 skills，并按 category 分组，支持搜索和键盘选择。
- 选中后在输入区展示可删除/替换的 Skill Chip，发送消息时携带 `explicitSkill` slug。
- 扩展前端 chat stream 参数和 Claude / Hermes 请求协议，使 `explicitSkill` 与现有 `skills` 隐式注入列表并存。
- 服务端在存在 `explicitSkill` 时优先注入对应 skill prompt；未选择显式技能时保持现有隐式注入行为。
- DeepAgents 引擎保持现有插件工具面板，不展示显式技能调用 UI。

## Impact
- Affected specs: `skills-management`, `chat-api`
- Affected code:
  - `src/app/(pages)/chat/features/ChatInput/Desktop/InputArea`
  - `src/app/(pages)/chat/features/ChatInput/ActionBar/Tools`
  - `src/app/(pages)/chat/features/ChatInput/useSend.ts`
  - `src/app/store/skills/store.ts`
  - `src/app/store/chat/slices/aiChat/actions/generateAIChat.ts`
  - `src/app/services/chat.ts`
  - `src/app/api/chat/claude/route.ts`
  - `src/app/api/chat/hermes/route.ts`
  - `src/types/skill.ts`
