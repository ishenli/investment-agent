# Change: Integrate Skills with Claude Agent SDK

## Why

The existing Skills management system (filesystem + DB) is fully implemented but its prompts are never injected into the Claude Agent SDK runtime. Simultaneously, built-in plugins (Artifacts, LocalSystem) are defined as `BuiltinToolManifest` objects with inline `systemRole` strings that are invisible to the Claude SDK path. This means the Claude SDK chat endpoint ignores all skill context, making the Skills feature inoperative for AI-guided execution. Users expect that enabling a skill in Settings will influence agent behaviour in the Claude SDK chat.

## What Changes

- Migrate built-in plugin `systemRole` strings into dedicated `SKILL.md` files under `SKILLs/` so they are discovered by `SkillFileScanner` and managed through the unified Skills infrastructure
- Add `SkillStorageManager` singleton (mirroring `DatabaseManager`) as the canonical path-management and content-reading façade for Skills, supporting both Electron and Web environments
- Extend `ClaudeChatRequestSchema` with an optional `skills: string[]` field for session-level skill activation
- Inject enabled Skills prompts into `systemPrompt` inside `/api/chat/claude/route.ts` — globally-enabled skills are always included; session-level `skills` slugs act as an additional filter
- Ensure `syncBuiltinSkills` is called during application initialisation so built-in SKILL.md files have corresponding DB preference rows and appear in the Skills management UI

## Impact

- **Affected specs**: `skills-management` (MODIFIED), `chat-api` (MODIFIED)
- **Affected code**:
  - `SKILLs/lobe-artifacts/SKILL.md` — NEW (migrated from `src/app/tools/artifacts/systemRole.ts`)
  - `SKILLs/lobe-local-system/SKILL.md` — NEW (migrated from `src/app/tools/local-system/systemRole.ts`)
  - `src/server/lib/SkillStorageManager.ts` — NEW singleton
  - `src/app/api/chat/claude/route.ts` — MODIFIED to inject skills into systemPrompt
  - `src/server/controller/init.ts` — MODIFIED to call `syncBuiltinSkills` on startup
- **No breaking changes**: existing `BuiltinToolManifest` objects and Zustand store remain intact (DeepAgents path is unaffected)
