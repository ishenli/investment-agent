# Implementation Tasks

Generated from `openspec/changes/unify-skill-management/plan.md`

---

## Phase 1: Schema + Global Claude Directory Removal

### 1.1 Database Schema Changes
- [ ] Add `contentHash` (nullable text) column to `skills` table in `drizzle/schema.ts`
- [ ] Add `deployedHash` (nullable text) column to `skills` table in `drizzle/schema.ts`
- [ ] Generate Drizzle migration (`pnpm db:generate`)
- [ ] Apply migration locally for development

### 1.2 Repository Extensions
- [ ] Add `updateContentHash(userId, slug, hash)` to `src/server/repository/skillRepository.ts`
- [ ] Add `updateDeployedHash(userId, slug, hash)` to `skillRepository.ts`
- [ ] Add `findByUserIdWithHashes(userId)` to `skillRepository.ts`
- [ ] Write unit tests for new repository methods

### 1.3 Remove Global Claude Skills from Scan
- [ ] Remove `globalClaudeRoot` scanning block from `SkillFileScanner.getSkillRoots()`
- [ ] Keep `getClaudeSkillsRoot()` helper private (used for deployment target path)
- [ ] Verify `projectClaudeRoot` is still needed or remove if it points to deployment output
- [ ] Update existing unit tests for `getSkillRoots()` (expect one fewer root)

### 1.4 Migration Script
- [ ] Write startup-time migration helper: copy existing global custom skills into each user's `.hermes/skills/` (or run on first sync after per-user isolation ships)

---

## Phase 2: Incremental Deployment

### 2.1 SkillService: `syncDeployment()` Implementation
- [ ] Implement `syncDeployment(userId)` in `src/server/service/skillService.ts`
- [ ] SHA-256 hash computation for `SKILL.md` file content
- [ ] Delete skills from `.claude/skills/` that are no longer enabled
- [ ] Skip skills whose `contentHash` matches `deployedHash`
- [ ] Copy changed/new skills and update `deployedHash` in DB
- [ ] Replace all internal calls (`toggleSkill`, `createSkill`, `updateSkill`, `deleteSkill`, `installSkill`, `syncBuiltinSkills`) with `syncDeployment()`

### 2.2 Fallback Feature Flag
- [ ] Keep old private `deployEnabledSkills()` intact
- [ ] Add `FORCE_FULL_DEPLOY` environment variable check
- [ ] When env var is set, route `syncDeployment` to the old full-delete-and-copy logic

### 2.3 EnsureSkillRecord
- [ ] Implement `ensureSkillRecord(userId, slug)` in `SkillService`
- [ ] Find DB record by slug; if exists, return it
- [ ] If missing, create a new record (`source='custom'`, `isEnabled=true`)
- [ ] Write unit tests for `ensureSkillRecord`

### 2.4 Lazy Hash Population
- [ ] Handle `NULL` `contentHash`/`deployedHash` in `syncDeployment`: compute and store on first run

---

## Phase 3: Hermes → Service Bridge + Per-User Skill Roots

### 3.1 Hermes Lifecycle Callback
- [ ] Add `onSkillChanged` optional field to `SkillToolsConfig` in `register.ts`
- [ ] Wire callback after every successful mutation in `skill-manage.ts` (`handleCreate`, `handleEdit`, `handlePatch`, `handleDelete`, `handleWriteFile`, `handleRemoveFile`)
- [ ] Wrap callback invocation in `try/catch` so tool call never fails because of the callback

### 3.2 HermesEngine Integration
- [ ] Add `skillFileScanner.ensureUserSkillsRoot(userId)` call in `engine.ts`
- [ ] Pass per-user `localSkillsDir` and `skillRoots` into `registerSkillTools`
- [ ] Wire `onSkillChanged` callback to call `skillService.ensureSkillRecord()` + `skillRegistry.invalidate()` + `skillService.syncDeployment()`

### 3.3 Per-User Skill FileScanner
- [ ] Add `getUserSkillsRoot(userId)` to `SkillFileScanner`
- [ ] Add `ensureUserSkillsRoot(userId)` to `SkillFileScanner`
- [ ] Add `scanForUser(userId)` using per-user root as primary scan root
- [ ] Update `SkillRegistry.resolve(userId)` to call `scanForUser(userId)` instead of global `scan()`

### 3.4 Per-User SkillInstaller
- [ ] Update `createCustomSkill(slug, content, userId?)` to accept optional userId and write to per-user directory
- [ ] Update `updateCustomSkillFiles(slug, updates, userId?)` similarly
- [ ] Update `deleteCustomSkillFiles(slug, userId?)` similarly
- [ ] Fall back to global root when `userId` is omitted (backward compatibility during transition)

### 3.5 SkillService Per-User Calls
- [ ] Update `SkillService.createSkill` to pass `userId` to `skillInstaller.createCustomSkill`
- [ ] Update `SkillService.updateSkill` to pass `userId` to `skillInstaller.updateCustomSkillFiles`
- [ ] Update `SkillService.deleteSkill` to pass `userId` to `skillInstaller.deleteCustomSkillFiles`

### 3.6 Migration: Existing Custom Skills
- [ ] Detect global custom skills on first startup after deployment
- [ ] Copy each user's custom skills from global root into their `{userId}/.hermes/skills/` directory
- [ ] Log migration summary (count per user)

---

## Phase 4: Content Validation Layer

### 4.1 Create Validator Module
- [ ] Create `src/server/lib/skill/skillContentValidator.ts`
- [ ] Detect `!`` inline shell markers
- [ ] Detect dangerous shell patterns (`rm -rf`, fork bombs)
- [ ] YAML frontmatter key allowlist check

### 4.2 Integration
- [ ] Import `validateSkillContent` into `SkillService`
- [ ] Call validator in `createSkill()` (throw on violation)
- [ ] Call validator in `updateSkill()` for custom skills with content changes
- [ ] Start in **warn-only** mode: log violations but do not throw/block

### 4.3 Hardening (Post Burn-In)
- [ ] After burn-in period, switch warn-only to hard-block mode
- [ ] Make behavior configurable via environment variable or config flag

---

## Phase 5: Testing

### 5.1 Unit Tests
- [ ] `syncDeployment`: only copies skills whose hash changed
- [ ] `syncDeployment`: deletes disabled skills from `.claude/skills/`
- [ ] `syncDeployment`: leaves matching-hash skills untouched
- [ ] `syncDeployment`: lazy hash population for NULL rows
- [ ] `ensureSkillRecord`: creates DB record when filesystem skill has no DB entry
- [ ] `ensureSkillRecord`: returns existing record when present
- [ ] `skillContentValidator`: rejects content with `!`` markers
- [ ] `skillContentValidator`: rejects content with `rm -rf`
- [ ] `skillContentValidator`: rejects unknown frontmatter keys
- [ ] `SkillRepository`: `updateContentHash` and `updateDeployedHash` work correctly
- [ ] `SkillFileScanner.getUserSkillsRoot`: includes userId in path
- [ ] `SkillFileScanner.scanForUser`: picks up per-user + bundled skills
- [ ] `SkillFileScanner.scanForUser`: user custom skill overrides bundled skill with same slug

### 5.2 Integration Tests
- [ ] Hermes `skill_manage create` → callback fires → DB record created → `.claude/skills/` deployed
- [ ] Hermes `skill_manage patch` → callback fires → hash change detected → skill recopied
- [ ] UI `toggleSkill` → `syncDeployment` adds/removes skill from `.claude/skills/`
- [ ] UI `createSkill` → skill file lands in `{userId}/.hermes/skills/` → not visible to other users
- [ ] User A custom skill with same slug as bundled skill → user A sees their override, user B sees bundled
- [ ] Global `~/.claude/skills` skills no longer appear in skill list

### 5.3 E2E Tests
- [ ] Full flow: user enables skill in UI → skill appears in `.claude/skills/` → Claude session uses it
- [ ] Full flow: agent creates skill via Hermes → skill appears in UI list → appears in `.claude/skills/`
- [ ] Full flow: two users each create a custom skill with the same slug → each only sees their own

### 5.4 Backward Compatibility Tests
- [ ] Hermes `skill_manage` without `onSkillChanged` in config still works
- [ ] `SkillInstaller` methods without `userId` still write to global root

---

## Phase 6: Cleanup & Rollout

- [ ] Monitor logs for incremental deployment correctness for at least one release
- [ ] Monitor logs for validation warn-only output during burn-in
- [ ] Remove `FORCE_FULL_DEPLOY` fallback env var (final release)
- [ ] Remove old private `deployEnabledSkills()` method (final release)
- [ ] Remove `SkillInstaller` fallback to global root when userId omitted (final release)
- [ ] Confirm `getClaudeSkillsRoot()` is still used only for deployment target path (rename if needed)
- [ ] Update documentation for skill system architecture

---

## Affected Files Summary (for reference)

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `contentHash`, `deployedHash` columns |
| `drizzle/migrations/*.sql` | Migration to add columns |
| `src/server/service/skillService.ts` | Add `ensureSkillRecord`, `syncDeployment`, validation hook |
| `src/server/repository/skillRepository.ts` | Add hash update methods |
| `packages/hermes-agent/src/skill-tools/register.ts` | Add `onSkillChanged` to config |
| `packages/hermes-agent/src/skill-tools/skill-manage.ts` | Invoke `onSkillChanged` after mutations |
| `src/server/core/agents/hermes/engine.ts` | Wire `onSkillChanged`; use per-user skill roots |
| `src/server/lib/skill/SkillFileScanner.ts` | Remove `~/.claude/skills`; add per-user root methods |
| `src/server/lib/skill/SkillInstaller.ts` | Accept `userId` in custom-skill methods |
| `src/server/lib/skill/SkillRegistry.ts` | Call `scanForUser(userId)` instead of global `scan()` |
| `src/server/lib/skill/skillContentValidator.ts` | **New** — content validation logic |
