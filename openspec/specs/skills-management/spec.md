# skills-management Specification

## Purpose
TBD - created by archiving change add-skills-management. Update Purpose after archive.
## Requirements
### Requirement: Skills List Display
The system SHALL provide a view of all available AI skills for the current user, displaying skill name, description, source badge, and enable/disable toggle switch.

#### Scenario: View all skills
- **WHEN** user navigates to `/setting/skills`
- **THEN** display all skills belonging to the authenticated user
- **AND** show skill name, description, source, and enable status for each skill
- **AND** display skills in a responsive grid layout

#### Scenario: Lazy load skills on page mount
- **WHEN** the Skills Management page loads
- **THEN** fetch the user's skills from the API
- **AND** show loading indicator while fetching

---

### Requirement: Skill Enable/Disable Toggle
The system SHALL allow users to enable or disable skills via a toggle switch, with state persisted to the database.

#### Scenario: Enable a skill
- **WHEN** user clicks the toggle on a disabled skill
- **THEN** send PATCH request to `/api/skills/{slug}` with updated isEnabled=true
- **AND** persist the change to the database
- **AND** update the UI to show the skill as enabled

#### Scenario: Disable a skill
- **WHEN** user clicks the toggle on an enabled skill
- **THEN** send PATCH request to `/api/skills/{slug}` with updated isEnabled=false
- **AND** persist the change to the database
- **AND** update the UI to show the skill as disabled

#### Scenario: Handle toggle API failure
- **WHEN** toggle request fails
- **THEN** display error toast to user
- **AND** revert toggle to previous state

---

### Requirement: Skills Search
The system SHALL provide a search input to filter skills by name, description, or slug.

#### Scenario: Search skills
- **WHEN** user types in the search input
- **THEN** filter the displayed skills to match the query (case-insensitive)
- **AND** update search results in real-time

#### Scenario: Clear search
- **WHEN** user clears the search input
- **THEN** display all skills again

---

### Requirement: Skills Source Filter
The system SHALL provide source-based filtering using tabs (all, official, community, custom).

#### Scenario: Filter by source
- **WHEN** user selects a source tab
- **THEN** display only skills matching the selected source
- **AND** highlight the active source tab

#### Scenario: Show all sources
- **WHEN** user selects "all" or clears source filter
- **THEN** display all skills regardless of source

---

### Requirement: Custom Skills Creation
The system SHALL allow users to create custom skills with name, slug, description, and prompt content.

#### Scenario: Create custom skill
- **WHEN** user fills the "Add Skill" form with valid data including prompt
- **THEN** send POST request to `/api/skills` with the skill data
- **AND** create a SKILL.md file on the filesystem with frontmatter and prompt content
- **AND** create a database preference record with source='custom'
- **AND** prepend the new skill to the displayed list
- **AND** show success toast

#### Scenario: Validate slug uniqueness
- **WHEN** user attempts to create a skill with duplicate slug
- **THEN** display validation error "Slug already exists"

#### Scenario: Handle create API failure
- **WHEN** create request fails
- **THEN** display error toast to user
- **AND** keep the form open for correction

---

### Requirement: Custom Skills Deletion
The system SHALL allow users to delete custom skills, with protection for official/community skills.

#### Scenario: Delete custom skill
- **WHEN** user clicks delete button on a custom skill
- **THEN** show confirmation dialog
- **IF** user confirms, send DELETE request to `/api/skills/{slug}`
- **AND** remove the SKILL.md file from filesystem
- **AND** remove the skill preference record from database
- **AND** remove the skill from the displayed list
- **AND** show success toast

#### Scenario: Protect official skill from deletion
- **WHEN** user attempts to delete an official skill (source='official')
- **THEN** display error "Official skills cannot be deleted"
- **AND** do not show delete button for official skills

---

### Requirement: Skills Data Storage
The system SHALL store skill user preferences in a `skills` table with fields: id, slug, source, isEnabled, icon, userId, createdAt, updatedAt, deletedAt. Content data (name, description, prompt, category) SHALL be stored in SKILL.md files.

#### Scenario: Auto-sync built-in skills on initialisation
- **WHEN** the application initialises for an authenticated user
- **THEN** the system MUST call `skillService.syncBuiltinSkills(userId)`
- **AND** built-in SKILL.md files MUST have corresponding DB preference rows created if not already present
- **AND** the sync operation MUST be idempotent (safe to call multiple times)
- **AND** synced skills MUST have `source = 'official'` and `isEnabled = true` by default
- **AND** stale DB rows (skills no longer on FS) MUST be pruned

---

### Requirement: SKILL.md File Format
The system SHALL use a standardized SKILL.md file format with YAML frontmatter and Markdown content.

#### Scenario: SKILL.md structure
- **WHEN** a SKILL.md file is created or read
- **THEN** the file MUST start with YAML frontmatter delimited by `---`
- **AND** the frontmatter MUST include `name` and `description` fields
- **AND** the frontmatter MAY include `version`, `category`, and `official` fields
- **AND** the content after frontmatter is the skill prompt

#### Scenario: Parse SKILL.md frontmatter
- **WHEN** `SkillFileScanner.parseSkillDir()` reads a SKILL.md
- **THEN** extract frontmatter fields as metadata
- **AND** extract content as prompt
- **AND** set `isOfficial` based on frontmatter `official` field

---

### Requirement: Skills API Routes
The system SHALL provide REST API endpoints for skills CRUD operations using slug as the identifier: GET (list), POST (create), PATCH (toggle/update), DELETE (delete).

#### Scenario: GET /api/skills
- **WHEN** authenticated user makes GET request to `/api/skills`
- **THEN** merge filesystem skills with database preferences
- **AND** return all skills visible to the user
- **AND** include merged data (name, description from FS; isEnabled, icon from DB)

#### Scenario: POST /api/skills
- **WHEN** authenticated user sends POST request with skill data
- **THEN** validate the request body (required fields, slug uniqueness)
- **AND** create SKILL.md file on filesystem
- **AND** create database preference record
- **AND** return the created skill object
- **OR** return 400 error if validation fails

#### Scenario: PATCH /api/skills/{slug}
- **WHEN** authenticated user sends PATCH request with skill updates
- **THEN** update the skill preference if it belongs to the user
- **AND** update SKILL.md content for custom skills if name/description/prompt changed
- **AND** return the updated skill object
- **OR** return 404 if skill not found

#### Scenario: DELETE /api/skills/{slug}
- **WHEN** authenticated user sends DELETE request with skill slug
- **THEN** delete the skill if it belongs to user and is not official
- **AND** remove SKILL.md file for custom skills
- **AND** remove database preference record
- **AND** return success status
- **OR** return 403 if attempting to delete official skill

---

### Requirement: Skills State Management
The system SHALL use Zustand store to manage skills state, using slug as the primary identifier for operations.

#### Scenario: Fetch skills on store initialization
- **WHEN** the skills store is first accessed
- **THEN** fetch skills from `/api/skills`
- **AND** store the results in the skills state
- **AND** set loading state to false

#### Scenario: Toggle skill via store action
- **WHEN** store action toggleSkill(slug, isEnabled) is called
- **THEN** call API to update the skill
- **AND** update the local skills state if successful
- **OR** revert on error

#### Scenario: Search and filter as computed state
- **WHEN** searchQuery or selectedSource changes
- **THEN** compute filteredSkills from the skills list
- **AND** update components automatically via reactivity

---

### Requirement: Session-Level Skill Activation
The system SHALL allow session-level skill activation that overrides global enabled state.

#### Scenario: Toggle skill for specific session
- **WHEN** user toggles a skill in the chat tool panel
- **THEN** store the selection per session without persisting to database
- **AND** use session selection when making chat requests

#### Scenario: Session skills override global state
- **WHEN** chat request includes skills parameter
- **THEN** load skills by slug regardless of global isEnabled state

---

### Requirement: Skills Navigation
The system SHALL add "Skills" item to the settings sidebar navigation with appropriate icon and route to `/setting/skills`.

#### Scenario: Display Skills navigation item
- **WHEN** user is on any settings page
- **THEN** show "Skills" option in the sidebar
- **AND** display with appropriate icon (e.g., Lightning or Code icon)
- **AND** set active state when on `/setting/skills`

#### Scenario: Navigate to Skills page
- **WHEN** user clicks "Skills" in sidebar
- **THEN** navigate to `/setting/skills`
- **AND** load the Skills Management panel

---

### Requirement: Skills Internationalization
The system SHALL provide internationalization support for Skills Management UI in supported languages (zh-CN, en-US).

#### Scenario: Display localized text
- **WHEN** user's language preference is set
- **THEN** display all Skills Management text in the selected language
- **AND** include source labels, actions, and messages

#### Scenario: Support new languages
- **WHEN** a new language is added to the project
- **THEN** add corresponding translation keys for Skills Management

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
