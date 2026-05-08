# Technical Plan: Unify Skill Management

> **Scope**: Unify skill state between Hermes agent (filesystem-driven `skill_manage`) and Claude Agent (DB-driven `deployEnabledSkills`) while making deployment incremental.
>
> **Origin**: `openspec/changes/unify-skill-management/proposal.md`

---

## 1. Problem Diagnosis

### Current Architecture

The codebase **already** has a well-defined three-layer skill architecture:

- **Filesystem layer** — `SKILL.md` + YAML frontmatter in `{skillsRoot}/{slug}/`
- **Server infrastructure** — `SkillFileScanner` (discovery), `SkillRegistry` (filesystem+DB merge + cache), `SkillInstaller` (file I/O), `SkillService` (CRUD + deployment orchestration)
- **Database layer** — `skills` table stores user preferences (slug, source, isEnabled, icon)

`SkillService` (`src/server/service/skillService.ts`) already coordinates filesystem and DB operations for the UI-driven flow. `SkillRegistry` already provides merged consumption views with in-memory caching.

### The Actual Gaps

**G1 — Hermes bypasses `SkillService`**
Hermes `skill_manage` operates directly on the filesystem via `createSkillManageHandler` (`packages/hermes-agent/src/skill-tools/skill-manage.ts`). After a create/edit/delete, there is no call to `SkillService`, which means:
- No DB preference record is created/updated for newly created skills until `syncBuiltinSkills` runs.
- `deployEnabledSkills` is not triggered, so Claude Code's `.claude/skills/` directory stays stale.

**G2 — Deployment is destructive**
`SkillService.deployEnabledSkills()` (private, line 426) performs `rm -rf` on the entire `{userWorkspace}/.claude/skills/` directory followed by a full copy of every enabled skill. This is inefficient and creates brief availability gaps.

**G3 — Missing content validation bridge**
Hermes `skill_manage` validates name format, frontmatter presence, and file-size limits, but it does not validate dangerous content patterns (e.g., shell injection markers when `inlineShell` preprocessing is enabled). UI-driven creation in `SkillService` has the same gap.

**G4 — `inlineShell` safety gap**
`skill-preprocessing.ts` supports `!\`cmd\`` inline shell expansion. A malicious or accidentally crafted skill could embed destructive shell commands. There is no allowlist/blocklist for shell commands in created skills.

**G5 — Global Claude skills leak into application**
`SkillFileScanner.getSkillRoots()` currently scans `~/.claude/skills` (the global Claude Code skills directory). Skills installed there by other projects or by the user directly are picked up by the application's `SkillRegistry`, appearing in the skill list and being registered as Hermes tools. This creates two problems:
- External skills that the application did not install show up in the UI and runtime.
- Those skills may conflict with application-bundled skills or introduce untrusted content into the agent context.
The global directory should be excluded from scanning. The application should only manage skills inside its own managed roots (user data directory + bundled skills).

**G6 — Hermes skills are not user-isolated**
Claude skills are deployed per-user to `{workspace}/{userId}/.claude/skills/`. However, Hermes `localSkillsDir` (`skillFileScanner.ensureSkillsRoot()`) points to a shared global directory (`{projectRoot}/skills`), meaning:
- All users share the same custom skill filesystem. A skill created by user A is visible on disk to user B.
- There is no per-user skill sandbox, which breaks the workspace-level isolation that Claude already has.
Hermes skills should be stored under a per-user path, e.g., `{workspace}/{userId}/.hermes/skills/`, matching Claude's per-user deployment pattern.

---

## 2. Architecture Decision: Extend Existing Services, Don't Add a New One

**Rejected**: Create a new `SkillRegistryService` that duplicates `SkillService`'s orchestration responsibilities.

**Rationale**:
- `SkillService` already handles production-side CRUD, DB record creation, and deployment triggering.
- `SkillRegistry` already handles consumption-side merging and caching.
- A new "registry service" would create a third authority and force consumers to choose between `SkillService`, `SkillRegistry`, and `SkillRegistryService`.

**Chosen**: Extend `SkillService` with incremental deployment, add a lifecycle callback in the Hermes `SkillToolsConfig`, and bridge the two at the `HermesEngine` level.

---

## 3. Component Design

### 3.1 Extended `SkillService`

**File**: `src/server/service/skillService.ts` (existing)

**New / modified public API**:

```typescript
interface SkillService {
  // Existing methods remain unchanged (createSkill, updateSkill, deleteSkill, toggleSkill, ...)

  /**
   * Ensure a DB preference record exists for a skill slug.
   * Called by Hermes after skill_manage creates a skill on filesystem.
   * If record exists, returns it; if not, creates one with source='custom', isEnabled=true.
   */
  ensureSkillRecord(userId: number, slug: string): Promise<SkillEntity>;

  /**
   * Trigger incremental deployment of enabled skills.
   * Replaces the private deployEnabledSkills with an incremental implementation.
   * Computes content hashes of source SKILL.md and compares with deployedHash.
   */
  syncDeployment(userId: number): Promise<void>;
}
```

**Internal changes**:
- Make `syncDeployment` the public entrypoint; keep the old logic as a fallback under a feature flag during the transition.
- Hash algorithm: SHA-256 of `SKILL.md` file content (read via `fs/promises`). Store as hex string in `skills.contentHash`.
- Incremental logic in `syncDeployment`:
  1. Scan enabled skills via `skillRegistry.getEnabledSkills(userId)`.
  2. Compute current content hash for each enabled skill's `SKILL.md`.
  3. Compare with `deployedHash` in DB.
  4. **Delete** skills present in `.claude/skills/` but not in enabled list.
  5. **Skip** skills whose hash matches `deployedHash`.
  6. **Copy** skills with mismatching or missing `deployedHash`.
  7. Update `deployedHash` to match `contentHash` for copied skills.

> **Note**: `skillRegistry.getEnabledSkills` already returns merged data including `skillPath`. No new scanning code is needed.

### 3.2 Hermes Lifecycle Callback

**File**: `packages/hermes-agent/src/skill-tools/register.ts` (existing)

**New optional field in `SkillToolsConfig`**:

```typescript
export interface SkillToolsConfig {
  // ... existing fields ...

  /**
   * Optional callback invoked after a successful skill_manage mutation.
   * Allows the caller (e.g., server-side service layer) to sync DB state
   * and trigger deployment.
   */
  onSkillChanged?: (event: { action: 'create' | 'edit' | 'patch' | 'delete' | 'write_file' | 'remove_file'; slug: string }) => void | Promise<void>;
}
```

**File**: `packages/hermes-agent/src/skill-tools/skill-manage.ts` (existing)

**Change**: After every successful mutation in `handleCreate`, `handleEdit`, `handlePatch`, `handleDelete`, `handleWriteFile`, `handleRemoveFile`, invoke:

```typescript
if (config.onSkillChanged) {
  await config.onSkillChanged({ action, slug: name });
}
```

This is a **non-breaking** change because `onSkillChanged` is optional.

### 3.3 HermesEngine Integration

**File**: `src/server/core/agents/hermes/engine.ts` (existing)

**Change**: Pass `onSkillChanged` when calling `registerSkillTools`:

```typescript
registerSkillTools(registry, {
  skillRoots: [...skillFileScanner.getSkillRoots()].reverse(),
  localSkillsDir: skillFileScanner.ensureSkillsRoot(),
  sessionId: String(userId),
  enabledSlugs: enabledSkills.map((s) => s.id),
  onSkillChanged: async (event) => {
    // 1. Ensure DB record exists (upsert preference)
    await skillService.ensureSkillRecord(userId, event.slug);
    // 2. Invalidate merged cache so subsequent queries see the change
    skillRegistry.invalidate(userId);
    // 3. Trigger incremental deployment
    await skillService.syncDeployment(userId);
  },
});
```

> **Rationale**: The Hermes agent package is intentionally transport-agnostic. Bridging to the application-specific `SkillService` must happen at the engine/integration layer, not inside the package.

### 3.4 Database Schema Changes

**File**: `drizzle/schema.ts`

Add two columns to the `skills` table:

```typescript
export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(),
  source: text('source').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  icon: text('icon'),
  userId: integer('user_id').notNull().references(() => users.id),
  // NEW: Content hash of SKILL.md for incremental deployment
  contentHash: text('content_hash'),
  // NEW: Hash of the last successfully deployed SKILL.md
  deployedHash: text('deployed_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => [
  index('idx_skills_user_id').on(table.userId),
  uniqueIndex('idx_skills_user_slug_unique').on(table.userId, table.slug),
]);
```

**Migration**: Generate a Drizzle migration (`pnpm db:generate`) that adds these two nullable columns. Existing rows will have `NULL` for both hashes; the first incremental deployment will compute and populate them.

### 3.5 Repository Extensions

**File**: `src/server/repository/skillRepository.ts` (existing)

**New methods** (follow existing naming conventions):

```typescript
async updateContentHash(userId: number, slug: string, hash: string): Promise<void> {
  await db.update(skills)
    .set({ contentHash: hash })
    .where(and(eq(skills.userId, userId), eq(skills.slug, slug)));
}

async updateDeployedHash(userId: number, slug: string, hash: string): Promise<void> {
  await db.update(skills)
    .set({ deployedHash: hash })
    .where(and(eq(skills.userId, userId), eq(skills.slug, slug)));
}

async findByUserIdWithHashes(userId: number): Promise<SkillEntity[]> {
  return db.query.skills.findMany({
    where: eq(skills.userId, userId),
    columns: { slug: true, contentHash: true, deployedHash: true, isEnabled: true },
  });
}
```

### 3.6 Validation Layer (Content Safety)

**File**: `src/server/service/skillService.ts` (existing) and new helper file.

Add a content-validation step to `createSkill` and `updateSkill` (and by extension, Hermes-created skills once they flow through the bridge):

```typescript
// src/server/lib/skill/skillContentValidator.ts (new)
export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export function validateSkillContent(content: string): ValidationResult {
  const violations: string[] = [];

  // 1. Detect inline shell markers when shell expansion is not explicitly intended
  const shellMarkerCount = (content.match(/!`/g) || []).length;
  if (shellMarkerCount > 0) {
    violations.push(`Detected ${shellMarkerCount} inline shell marker(s) (\`!\`cmd\`\`). Ensure these are intended and safe.`);
  }

  // 2. Detect risky filesystem deletion patterns in prompts
  const riskyPatterns = [
    { pattern: /rm\s+-rf\s+/i, name: 'recursive deletion command' },
    { pattern: /:\{\}\s*\+\s*\[\]:;/, name: 'fork bomb pattern' },
  ];
  for (const { pattern, name } of riskyPatterns) {
    if (pattern.test(content)) {
      violations.push(`Detected potentially dangerous pattern: ${name}`);
    }
  }

  // 3. YAML frontmatter must not contain unknown keys that could be exploited
  const { frontmatter } = parseFrontmatter(content);
  const allowedFrontmatterKeys = new Set([
    'name', 'description', 'category', 'version',
    'official', 'isOfficial', 'icon', 'author', 'license',
  ]);
  for (const key of Object.keys(frontmatter)) {
    if (!allowedFrontmatterKeys.has(key)) {
      violations.push(`Unknown frontmatter key "${key}"`);
    }
  }

  return { valid: violations.length === 0, violations };
}
```

**Integration point in `SkillService.createSkill`**:
```typescript
async createSkill(userId: number, data: CreateSkillRequest): Promise<Skill> {
  // ... existing slug check ...
  const skillContent = this.buildSkillMarkdown(data);
  const validation = validateSkillContent(skillContent);
  if (!validation.valid) {
    throw new Error(`Skill content validation failed: ${validation.violations.join('; ')}`);
  }
  // ... rest of method unchanged ...
}
```

> **Note**: This validation does not block agent operations silently; it throws a clear error that propagates back to the agent as a tool failure. The agent can then report the issue to the user.

---

### 3.7 Exclude Global Claude Skills Directory

**File**: `src/server/lib/skill/SkillFileScanner.ts` (existing)

**Change**: Remove `~/.claude/skills` from the scanned skill roots.

In `getSkillRoots()`, delete the block that reads the global Claude directory:

```typescript
getSkillRoots(primaryRoot?: string): string[] {
  const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
  const roots: string[] = [resolvedPrimary];

  // REMOVED: globalClaudeRoot scanning
  // const globalClaudeRoot = this.getClaudeSkillsRoot();
  // if (globalClaudeRoot && fs.existsSync(globalClaudeRoot)) {
  //   roots.push(globalClaudeRoot);
  // }

  // Optional: also remove projectClaudeRoot if it points to the deployment output
  // directory rather than a managed source. Evaluate after removing global.

  const appRoot = this.getBundledSkillsRoot();
  if (appRoot !== resolvedPrimary && fs.existsSync(appRoot)) {
    roots.push(appRoot);
  }
  return roots;
}
```

> **Rationale**: The application should be a closed skill ecosystem. Skills must be installed explicitly via the application's own installer (or bundled at build time) to appear in the registry. Allowing the global `~/.claude/skills` directory to leak in breaks this boundary and makes skill provenance untraceable.

> **Note**: `getClaudeSkillsRoot()` itself can be kept as a private helper (it is used elsewhere for deployment target path calculation) or renamed for clarity, but it must no longer be called inside `getSkillRoots()`.

### 3.8 User-Isolated Hermes Skills Directory

**Files**: `src/server/lib/skill/SkillFileScanner.ts`, `src/server/core/agents/hermes/engine.ts`, `src/server/service/skillService.ts`

**Goal**: Align Hermes skill storage with Claude's per-user workspace pattern:
- Claude deploys skills to `{workspace}/{userId}/.claude/skills/`
- Hermes should read/write custom skills to `{workspace}/{userId}/.hermes/skills/`

**Changes to `SkillFileScanner`**:

Add a per-user skills root method:

```typescript
getUserSkillsRoot(userId: number): string {
  return path.resolve(getProjectRoot(), 'workspace', String(userId), '.hermes', 'skills');
}

ensureUserSkillsRoot(userId: number): string {
  const root = this.getUserSkillsRoot(userId);
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}
```

Update `getSkillRoots(primaryRoot?: string)` to accept the per-user root as the highest-priority source:

```typescript
getSkillRoots(primaryRoot?: string): string[] {
  const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
  const roots: string[] = [resolvedPrimary];

  // REMOVED: globalClaudeRoot scanning (see 3.7)

  const appRoot = this.getBundledSkillsRoot();
  if (appRoot !== resolvedPrimary && fs.existsSync(appRoot)) {
    roots.push(appRoot);
  }
  return roots;
}
```

**Changes to `HermesEngine`**:

```typescript
const userSkillsDir = skillFileScanner.ensureUserSkillsRoot(userId);

registerSkillTools(registry, {
  skillRoots: [
    ...skillFileScanner.getSkillRoots(userSkillsDir).reverse(), // user skills highest priority
  ],
  localSkillsDir: userSkillsDir,
  sessionId: String(userId),
  enabledSlugs: enabledSkills.map((s) => s.id),
  onSkillChanged: async (event) => {
    await skillService.ensureSkillRecord(userId, event.slug);
    skillRegistry.invalidate(userId);
    await skillService.syncDeployment(userId);
  },
});
```

**Changes to `SkillService`**:

All `createSkill`, `updateSkill`, `deleteSkill` operations that target custom skills must use the requesting user's skills directory. This means `SkillInstaller` methods need access to the user-scoped root.

`SkillService.createSkill` currently calls:
```typescript
skillInstaller.createCustomSkill(data.slug, skillContent); // uses scanner.ensureSkillsRoot() — GLOBAL
```

This must change to:
```typescript
skillInstaller.createCustomSkill(data.slug, skillContent, userId); // or pass the per-user root
```

**Decision**: Pass `userId` through the `SkillInstaller` public API so it can resolve the per-user root internally. Update all `SkillInstaller` custom-skill methods (`createCustomSkill`, `updateCustomSkillFiles`, `deleteCustomSkillFiles`) to accept an optional `userId` parameter and fall back to the global root when omitted (for backward compatibility during transition).

> **Impact**: `SkillRegistry.resolve(userId)` currently calls `this.scanner.scan()` which uses the global `ensureSkillsRoot()`. To pick up per-user custom skills, `SkillRegistry` must either:
> 1. Accept an injected per-user scanner instance, or
> 2. Call a new `scanForUser(userId)` method on the scanner.
>
> **Chosen**: Add `SkillFileScanner.scanForUser(userId: number)` which uses `getUserSkillsRoot(userId)` as the primary root. `SkillRegistry.resolve(userId)` calls `this.scanner.scanForUser(userId)` instead of `this.scanner.scan()`.

---

## 4. Skill Root Priority Clarification (No Change Required)

The original proposal suggested standardizing skill root priority between Hermes and `SkillFileScanner`. **This is not required and potentially dangerous.**

- **`SkillFileScanner.scan()`** uses forward iteration: lower-priority roots first, higher-priority roots later override them in a `Map`. This is correct for filesystem resolution (user skills > bundled skills).
- **`HermesEngine`** passes `[...roots].reverse()` to `registerSkillTools`. The comment in `engine.ts:53-54` states: "Reverse so that more specific/later skill roots override earlier ones in registerSkillTools (user skills > bundled skills)."

These are **two different operations** with the same goal but different mechanisms:
- `SkillFileScanner` deduplicates by overwriting a `Map`.
- Hermes registers tools in priority order (later wins).

Both already produce "user skills override bundled skills" semantics. **No code change needed.**

---

## 5. Migration Strategy

### Phase 1: Schema + Non-Breaking Hash Tracking
1. Add `contentHash` and `deployedHash` columns to `skills` table (nullable).
2. Generate and apply Drizzle migration.
3. Write migration helper script to compute initial `contentHash` for existing custom skills.
4. **Remove global Claude skills directory from `SkillFileScanner.getSkillRoots()`**.

**Files touched**:
- `drizzle/schema.ts`
- `drizzle/migrations/xxxx_add_skill_hashes.sql`
- `src/server/lib/skill/SkillFileScanner.ts`

### Phase 2: Incremental Deployment
1. Implement `syncDeployment()` in `SkillService`.
2. Keep existing private `deployEnabledSkills()` as a **fallback** under a temporary feature flag (e.g., `FORCE_FULL_DEPLOY` env var).
3. Update all internal callers (`toggleSkill`, `createSkill`, `updateSkill`, `deleteSkill`, `installSkill`, `syncBuiltinSkills`) to use `syncDeployment()`.
4. Add unit tests for the incremental logic.

**Files touched**:
- `src/server/service/skillService.ts`
- `src/server/repository/skillRepository.ts`

### Phase 3: Hermes → Service Bridge + Per-User Skill Roots
1. Add `onSkillChanged` to `SkillToolsConfig` (`register.ts`).
2. Wire `onSkillChanged` invocation into each `skill_manage` handler.
3. Implement `ensureSkillRecord()` in `SkillService`.
4. Wire the callback in `HermesEngine` to call `ensureSkillRecord()` + `syncDeployment()`.
5. Add `getUserSkillsRoot`, `ensureUserSkillsRoot`, and `scanForUser` to `SkillFileScanner`.
6. Update `HermesEngine` to pass per-user `localSkillsDir` and `skillRoots` to `registerSkillTools`.
7. Update `SkillRegistry.resolve()` to call `scanForUser(userId)`.
8. Update `SkillInstaller` custom-skill methods to accept `userId` and write to per-user directory.
9. Update `SkillService` to pass `userId` into `SkillInstaller` calls.

**Files touched**:
- `packages/hermes-agent/src/skill-tools/register.ts`
- `packages/hermes-agent/src/skill-tools/skill-manage.ts`
- `src/server/service/skillService.ts`
- `src/server/core/agents/hermes/engine.ts`
- `src/server/lib/skill/SkillFileScanner.ts`
- `src/server/lib/skill/SkillInstaller.ts`
- `src/server/lib/skill/SkillRegistry.ts`

### Phase 4: Validation Layer
1. Implement `skillContentValidator.ts`.
2. Integrate validation into `SkillService.createSkill` and `updateSkill`.
3. Add allowlist config for frontmatter keys (can be loaded from `skills.config.json` or hardcoded initially).

**Files touched**:
- `src/server/lib/skill/skillContentValidator.ts` (new)
- `src/server/service/skillService.ts`

---

## 6. Testing Strategy

### Unit Tests

**`src/server/service/__tests__/skillService.test.ts`**
- `syncDeployment`: only copies skills whose hash changed.
- `syncDeployment`: deletes `.claude/skills/{slug}` for disabled skills.
- `syncDeployment`: leaves matching-hash skills untouched.
- `ensureSkillRecord`: creates DB record when skill exists on filesystem but not in DB.
- `ensureSkillRecord`: returns existing record when already present.
- `createSkill`: rejects content with dangerous patterns.
- `createSkill`: accepts safe content.

**`src/server/repository/__tests__/skillRepository.test.ts`**
- `updateContentHash`: updates the column correctly.
- `updateDeployedHash`: updates the column correctly.

**`packages/hermes-agent/src/__tests__/skill-tools.test.ts`**
- `skill_manage` with `onSkillChanged`: callback fires after successful create.
- `skill_manage` without `onSkillChanged`: works as before (backward compatibility).

**`src/server/lib/skill/__tests__/SkillFileScanner.test.ts`**
- `getUserSkillsRoot`: returns path containing userId and `.hermes/skills`.
- `scanForUser`: picks up skills from per-user directory while still including bundled skills.
- `scanForUser`: user custom skill with same slug as bundled skill overrides the bundled one.

### Integration Tests

- Hermes `skill_manage create` → callback fires → DB record created → `syncDeployment` copies skill to `.claude/skills/`.
- Hermes `skill_manage patch` → callback fires → `syncDeployment` detects hash change and recopies skill.
- UI `toggleSkill` → `syncDeployment` removes/adds skill from `.claude/skills/` based on enabled state.
- User A creates a custom skill → skill file lands in `{userA}/.hermes/skills/` → User B does not see it in their skill list.

### E2E Test

- Full flow: user enables skill in UI → skill appears in `.claude/skills/` → Claude session can use it.
- Full flow: agent creates skill via Hermes → skill appears in UI list → appears in `.claude/skills/`.

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Incremental deployment misses a skill due to hash bug | Keep `FORCE_FULL_DEPLOY` fallback env var for Phase 2. Always compute hash from the actual file on disk, not from cached data. |
| `onSkillChanged` callback throws and breaks Hermes tool | Wrap callback invocation in `try/catch` inside `skill-manage.ts`. Log error but do not fail the tool call. |
| Content validation is too strict and blocks legitimate skills | Start with **warn-only** mode (log violations but do not throw). Enable hard-block after burn-in period. |
| Concurrent `syncDeployment` from UI toggle + Hermes edit | File copy operations are idempotent. DB `deployedHash` updates can race; use per-user sequential queue in `SkillService` if needed. |
| Migration leaves rows with NULL hashes | First `syncDeployment` computes hashes lazily for NULL rows and writes them back. |
| Per-user skill directory migration breaks existing custom skills | Phase 1: copy existing global custom skills into each user's `.hermes/skills/` during first `syncBuiltinSkills` call. Or run a one-time migration script at startup. |
| `SkillFileScanner.scanForUser` performance hit from per-user disk scan | Cache per-user scan results inside `SkillRegistry` (already done). The cache invalidation mechanism remains the same. |

---

## 8. Rollback Plan

1. **Feature flags**: Keep the old `deployEnabledSkills` full-delete-and-copy available behind an environment variable for at least one release.
2. **Schema**: New columns are nullable and unused by old code paths.
3. **Hermes callback**: `onSkillChanged` is optional; removing the wiring in `HermesEngine` instantly reverts to old behavior.

---

## 9. Open Questions (Resolved)

1. **Deployment trigger timing?** — Use eager deployment: every mutation (UI toggle or Hermes edit) triggers `syncDeployment` immediately. This is already the current behavior; we are only making it incremental.
2. **Version history?** — Out of scope. The filesystem already holds the latest content. If version history is needed later, use a separate `skill_revisions` table.
3. **Conflict resolution (filesystem vs DB)?** — Filesystem is source of truth for content; DB is source of truth for preferences. This is already the design.

---

## 10. Affected Files Summary

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `contentHash`, `deployedHash` columns |
| `drizzle/migrations/*.sql` | Migration to add columns |
| `src/server/service/skillService.ts` | Add `ensureSkillRecord`, `syncDeployment`, validation hook |
| `src/server/repository/skillRepository.ts` | Add hash update methods |
| `src/server/lib/skill/skillContentValidator.ts` | **New** — content validation logic |
| `packages/hermes-agent/src/skill-tools/register.ts` | Add `onSkillChanged` to config interface |
| `packages/hermes-agent/src/skill-tools/skill-manage.ts` | Invoke `onSkillChanged` after mutations |
| `src/server/core/agents/hermes/engine.ts` | Wire `onSkillChanged` callback to `skillService`; use per-user skill roots |
| `src/server/lib/skill/SkillFileScanner.ts` | Remove `~/.claude/skills` from scanned roots; add per-user skill root methods |
| `src/server/lib/skill/SkillInstaller.ts` | Accept `userId` in custom-skill methods for per-user directory writes |
| `src/server/lib/skill/SkillRegistry.ts` | Call `scanForUser(userId)` instead of global `scan()` |
