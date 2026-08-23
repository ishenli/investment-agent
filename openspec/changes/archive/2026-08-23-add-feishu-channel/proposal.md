# Change: Add production-ready Feishu text channel

## Why

The repository already contains webhook and WebSocket Feishu prototypes, but neither forms a complete product path: the WebSocket channel is not started by the application, the settings page still describes an externally reachable webhook, access control is missing, and the current WebSocket implementation duplicates reconnect and health-check behavior already owned by the official SDK. CodePilot's current Feishu bridge demonstrates a smaller, proven shape based on an official-SDK WebSocket gateway, fast queue handoff, policy filtering, and a shared conversation runtime.

## What Changes

- Add an enabled, lifecycle-managed Feishu enterprise-app channel using `@larksuiteoapi/node-sdk` WebSocket long connection.
- Normalize text events into the existing `ChannelMessage` contract and route them through the shared Hermes `runEngine` conversation path.
- Enforce separate allowlists: private chats by sender `open_id`, group chats by `chat_id`; group messages MUST also mention the bot.
- Acknowledge inbound events quickly by filtering and enqueueing before agent work, deduplicate by `message_id`, and serialize work per Feishu conversation while allowing different conversations to run concurrently.
- Persist Feishu conversation history in the existing chat session/message tables and support the existing `/clear` command.
- Replace the webhook-oriented settings experience with WebSocket enablement, App ID, App Secret status, private-user allowlist, and group-chat allowlist.
- Treat App Secret as a local single-user setting: never return or log it, while allowing direct local persistence without an additional encryption key.
- Add a Feishu App Registration device flow that creates a `PersonalAgent` Bot from a browser or QR authorization, stores the returned App Secret locally, allowlists the authorizing user's `open_id`, verifies the Bot, and makes a best-effort channel restart without manual credential entry.
- Use the application's existing default user for Feishu configuration and registration; these single-user APIs do not depend on browser cookie or Bearer authentication.
- Keep manual Feishu App ID/App Secret entry as a fallback when tenant policy blocks automatic application creation; Feishu-to-Lark switching remains part of the automatic registration flow.
- Remove custom idle health checks and reconnect loops from the Feishu adapter; rely on the official SDK and force-close the SDK client on stop/restart.
- Keep inbound messages text-only and render each final outbound reply as one non-streaming interactive Markdown card. Streaming cards, files/images, reactions, threads, multiple Feishu apps, and interactive permission callbacks are out of scope.

## Impact

- Affected specs: `feishu-channel` (new capability)
- Affected code:
  - `packages/agent-channel/src/feishu/`
  - `packages/agent-channel/src/index.ts`
  - `src/server/channel/`
  - `src/instrumentation.ts`
  - `src/server/controller/setting.ts`
  - `src/app/(pages)/setting/channel/`
  - `src/app/api/channel/feishu/`
  - `src/locales/*/setting.json`
- Existing `/api/channel/feishu` webhook behavior is superseded by the long-connection channel and is not part of the supported capability after this change.
