# Change: Add server-driven generative UI messages

## Why
Traditional text-only assistant replies cannot present investment data such as quotes, holdings, charts, and trade intents with enough clarity. Issue #86 concluded that this project should not let the model generate arbitrary UI, but should instead support controlled, auditable UI artifacts rendered inside chat messages.

## What Changes
- Add a `UIArtifact` message protocol for assistant messages, preserving `content: string` as the required fallback.
- Add a chat-message generative UI renderer backed by a whitelist component registry and Zod validation.
- Support first-class artifact types for `stock_quote_card`, `fund_detail_panel`, `data_chart`, and `trade_intent_card`, with the first implementation phase scoped to `stock_quote_card`.
- Extend chat streaming so text chunks and artifact events can update the same assistant message.
- Persist `content + uiArtifacts` so generated UI survives reload, history, copy/share/export fallback paths, and old-message compatibility.
- Enforce financial safety boundaries: no model-generated JSX/HTML/script/style/iframe, schema validation for all props, payload limits for charts, and server-side confirmation checks for trade intent actions.

## Impact
- Affected specs: `chat-generative-ui` (new), `chat-api`, `chat-storage`
- Affected code:
  - `src/types/message/chat.ts`
  - `src/types/chat/schemas.ts`
  - `src/app/store/chat/slices/aiChat/actions/generateAIChat.ts`
  - `src/app/store/chat/slices/message/*`
  - `src/app/(pages)/chat/features/Conversation/components/GenerativeUI/*`
  - `src/app/(pages)/chat/features/Conversation/components/ChatItem/index.tsx`
  - `src/server/service/chatService.ts`
  - `src/server/service/chatStorageService.ts`
  - `src/server/repository/chat/message.ts`
  - `src/app/api/chat/*`
- Source discussion: https://github.com/ishenli/investment-agent/issues/86#issuecomment-4603705599
