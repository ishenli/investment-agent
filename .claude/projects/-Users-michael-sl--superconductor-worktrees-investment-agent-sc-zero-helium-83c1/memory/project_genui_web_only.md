---
name: genui-web-only
description: Generative UI (create_ui_artifact) only works on web channel — not on WeChat or other channels
metadata:
  type: project
---

Generative UI cards (create_ui_artifact tool) are web-only. They do not render on WeChat or other messaging channels.

**Why:** Non-web channels (WeChat, Telegram, etc.) cannot render custom React components — they only support text/markdown. The `fallback_text` field in UI artifacts serves as the degraded output for these channels.

**How to apply:** When registering `create_ui_artifact` tool or building system prompts, only include the tool for web platform sessions. For non-web channels, omit the tool so the model produces text-only responses instead. Related: [[genui-streaming-rendering]], [[agent-prompt-no-card-text-repeat]]
