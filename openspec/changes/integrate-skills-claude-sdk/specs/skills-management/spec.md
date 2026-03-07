## ADDED Requirements

### Requirement: Built-in Plugin Migration to SKILL.md
The system SHALL provide built-in plugin capabilities (Artifacts, Local System) as SKILL.md files under the `SKILLs/` directory, managed through the unified Skills infrastructure instead of inline `systemRole` strings.

#### Scenario: Artifacts skill discovered by scanner
- **WHEN** `SkillFileScanner.scan()` is called
- **THEN** the scanner MUST discover `SKILLs/lobe-artifacts/SKILL.md`
- **AND** return a `ParsedSkill` with `id: 'lobe-artifacts'`, `isBuiltIn: true`, `isOfficial: true`
- **AND** the `prompt` field MUST contain the full Artifacts system role content

#### Scenario: Local System skill discovered by scanner
- **WHEN** `SkillFileScanner.scan()` is called
- **THEN** the scanner MUST discover `SKILLs/lobe-local-system/SKILL.md`
- **AND** return a `ParsedSkill` with `id: 'lobe-local-system'`, `isBuiltIn: true`, `isOfficial: true`
- **AND** the `prompt` field MUST contain the full Local System system role content

#### Scenario: SKILL.md frontmatter format for built-in plugins
- **WHEN** a built-in plugin SKILL.md is created
- **THEN** the frontmatter MUST include `name`, `description`, `official: true`, and `version`
- **AND** `SkillFileScanner.parseSkillDir()` MUST map `official: true` to `isOfficial = true`

---

### Requirement: SkillStorageManager Singleton
The system SHALL provide a `SkillStorageManager` singleton that serves as the canonical path-management and content-reading façade for Skills, following the `DatabaseManager` design pattern.

#### Scenario: Skills root path resolution
- **WHEN** `skillStorageManager.getSkillsRoot()` is called
- **THEN** it MUST return the resolved absolute path to the `SKILLs/` directory
- **AND** the path MUST be correct in both Electron and Web environments

#### Scenario: Read skills content by slugs
- **WHEN** `skillStorageManager.readSkillsContent(['lobe-artifacts', 'lobe-local-system'])` is called
- **THEN** it MUST return an array of prompt strings in the same order as the input slugs
- **AND** slugs that do not correspond to any discovered skill MUST be skipped (not throw)

#### Scenario: Singleton pattern enforcement
- **WHEN** `SkillStorageManager.getInstance()` is called multiple times
- **THEN** the same instance MUST be returned each time

---

## MODIFIED Requirements

### Requirement: Skills Data Storage
The system SHALL store skill configurations in a `skills` table with fields: id, slug, name, description, category, source, isEnabled, icon, config, userId, createdAt, updatedAt.

#### Scenario: Persist skill on create
- **WHEN** a new skill is created
- **THEN** insert a new record into the skills table
- **AND** generate auto-increment id
- **AND** set createdAt and updatedAt timestamps
- **AND** associate with the authenticated user's userId

#### Scenario: Update skill on toggle
- **WHEN** skill enable status is toggled
- **THEN** update the isEnabled field in the skills table
- **AND** update the updatedAt timestamp

#### Scenario: Auto-sync built-in skills on initialisation
- **WHEN** the application initialises for an authenticated user
- **THEN** the system MUST call `skillService.syncBuiltinSkills(userId)`
- **AND** built-in SKILL.md files (e.g. `lobe-artifacts`, `lobe-local-system`) MUST have corresponding DB rows created if not already present
- **AND** the sync operation MUST be idempotent (safe to call multiple times)
- **AND** synced skills MUST have `source = 'official'` and `isEnabled = true` by default
