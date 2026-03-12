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

### Requirement: SkillRegistry Content Merging
The system SHALL merge filesystem content with database preferences in SkillRegistry.

#### Scenario: Resolve skill from FS and DB
- **WHEN** `SkillRegistry.resolve(userId)` is called
- **THEN** scan all SKILL.md files from filesystem
- **AND** load all preference records from database for the user
- **AND** merge by slug: content from FS, preference (isEnabled, icon) from DB

#### Scenario: Skill without preference record
- **WHEN** a skill exists on filesystem but has no DB preference
- **THEN** use default `isEnabled` from `skills.config.json` or `true`
- **AND** return skill without `dbId`

#### Scenario: Custom skill requires SKILL.md
- **WHEN** a skill has `source='custom'` in DB but no SKILL.md file
- **THEN** the skill MUST NOT appear in the resolved list
- **AND** a warning SHOULD be logged

---

### Requirement: SkillInstaller FS Operations
The system SHALL provide SKILL.md file operations via SkillInstaller for custom skills.

#### Scenario: Create custom skill files
- **WHEN** `skillInstaller.createCustomSkill(slug, content)` is called
- **THEN** create directory `{skillsRoot}/{slug}/`
- **AND** write SKILL.md file with frontmatter and prompt content
- **AND** return the path to created skill directory

#### Scenario: Update custom skill files
- **WHEN** `skillInstaller.updateCustomSkillFiles(slug, updates)` is called
- **THEN** read existing SKILL.md
- **AND** update frontmatter fields if provided (name, description)
- **AND** update prompt content if provided
- **AND** write updated SKILL.md back to filesystem

#### Scenario: Delete custom skill files
- **WHEN** `skillInstaller.deleteCustomSkillFiles(slug)` is called
- **THEN** remove the entire skill directory `{skillsRoot}/{slug}/`
- **AND** log success message

---

## MODIFIED Requirements

### Requirement: Skills Data Storage
The system SHALL store skill user preferences in a `skills` table with fields: id, slug, source, isEnabled, icon, userId, createdAt, updatedAt, deletedAt. Content data (name, description, prompt, category) SHALL be stored in SKILL.md files.

#### Scenario: Persist skill preference on create
- **WHEN** a new custom skill is created
- **THEN** create SKILL.md file with frontmatter and prompt
- **AND** insert a preference record into the skills table
- **AND** set createdAt and updatedAt timestamps

#### Scenario: Update skill on toggle
- **WHEN** skill enable status is toggled
- **THEN** update the isEnabled field in the skills table
- **AND** update the updatedAt timestamp

#### Scenario: Auto-sync built-in skills on initialisation
- **WHEN** the application initialises for an authenticated user
- **THEN** the system MUST call `skillService.syncBuiltinSkills(userId)`
- **AND** built-in SKILL.md files MUST have corresponding DB preference rows created if not already present
- **AND** the sync operation MUST be idempotent (safe to call multiple times)
- **AND** synced skills MUST have `source = 'official'` and `isEnabled = true` by default
- **AND** stale DB rows (skills no longer on FS) MUST be pruned