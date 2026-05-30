# Change: Add Agent Runtime Assets Settings

## Why
The current `/setting/agent` page only manages database-backed Agent metadata. Users cannot inspect or edit the runtime files that materially affect Claude Code and Hermes Agent behavior, including memory files and user profile files.

## What Changes
- Restructure `/setting/agent` into an Agent Runtime Assets viewer/editor.
- Remove the existing database Agent profile management UI (Agent Profiles sub-view).
- Remove Skill content editing from the Agent settings page (Skills remain managed via `/setting/skills`).
- Add an Agent runtime assets section for Claude Code and Hermes Agent.
- Surface editable `MEMORY.md` and `USER.md`/`User.md` content for each supported runtime.
- Add server-side APIs and services that read/write only approved project/user runtime asset locations.

## Impact
- Affected specs: `agent-management`, `hermes-agent`
- Affected code:
  - `src/app/(pages)/setting/agent/page.tsx`
  - `src/app/(pages)/setting/agent/components/*`
  - `src/app/api/agent/runtime-assets/route.ts`
  - `src/server/service/agentRuntimeAssetService.ts`
  - `src/server/controller/agentRuntimeAsset.ts`
  - `src/types/agentRuntimeAsset.ts`
