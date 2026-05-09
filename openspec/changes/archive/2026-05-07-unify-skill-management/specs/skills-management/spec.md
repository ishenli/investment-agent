# skills-management Spec Deltas

## MODIFIED Requirements

### Requirement: Custom Skills Creation
The system SHALL allow users to create custom skills with name, slug, description, and prompt content. Skill creation MUST be atomic, updating both the filesystem (SKILL.md file) and database preference record simultaneously.

#### Scenario: Create custom skill
- **WHEN** user fills the "Add Skill" form with valid data including prompt
- **THEN** send POST request to `/api/skills` with the skill data
- **AND** create a SKILL.md file on the filesystem with frontmatter and prompt content
- **AND** create a database preference record with source='custom' in the same transaction
- **AND** calculate and store content hash for deployment tracking
- **AND** prepend the new skill to the displayed list
- **AND** show success toast

#### Scenario: Create skill via Hermes Agent
- **WHEN** Hermes Agent creates a skill using `skill_manage` tool
- **THEN** create both SKILL.md file AND database preference record atomically
- **AND** the skill MUST be immediately visible in the skills list UI
- **AND** the skill MUST be deployable to Claude Agent on next session start
- **AND** ensure validation of skill content before creation

#### Scenario: Validate skill content security
- **WHEN** creating or updating a skill
- **THEN** validate YAML frontmatter for required fields (name, description)
- **AND** validate no dangerous template variables if inlineShell is disabled
- **AND** reject skills containing potentially unsafe shell command patterns
- **AND** display specific validation error to user

---

### Requirement: Custom Skills Deletion
The system SHALL allow users to delete custom skills, with protection for official/community skills. Deletion MUST be atomic, removing both filesystem and database records.

#### Scenario: Delete custom skill
- **WHEN** user clicks delete button on a custom skill
- **THEN** show confirmation dialog
- **IF** user confirms, send DELETE request to `/api/skills/{slug}`
- **AND** remove the SKILL.md file from filesystem
- **AND** remove the skill preference record from database in the same transaction
- **AND** mark skill as deleted for deployed version tracking
- **AND** remove the skill from the displayed list
- **AND** show success toast

#### Scenario: Delete skill via Hermes Agent
- **WHEN** Hermes Agent deletes a skill using `skill_manage` tool
- **THEN** remove both SKILL.md file AND database preference record atomically
- **AND** trigger cleanup of deployed skill files on next deployment cycle

---

## ADDED Requirements

### Requirement: Unified Skill Registry
The system SHALL provide a single SkillRegistryService that coordinates all skill operations across Hermes and Claude agents, ensuring atomic updates to both filesystem and database.

#### Scenario: Atomic skill operations
- **WHEN** any skill operation (create, update, delete) is performed
- **THEN** the SkillRegistryService MUST update both SKILL.md file and database record
- **AND** rollback both if either operation fails
- **AND** emit change event for down-stream consumers

#### Scenario: Cross-agent skill visibility
- **WHEN** a skill is created or modified through any agent interface
- **THEN** the skill state MUST be immediately visible to all agents
- **AND** the skill MUST have a corresponding enabled/disabled preference in database
- **AND** the skill content hash MUST be calculated and stored

---

### Requirement: Incremental Skill Deployment
The system SHALL deploy skills to Claude Agent incrementally, only updating skills that have changed since last deployment, avoiding destructive full-directory replacement.

#### Scenario: Detect unchanged skills
- **WHEN** deploying skills for a user session
- **THEN** compare current skill content hashes with deployed hashes
- **AND** skip copying skills where hashes match
- **AND** log skipped skills for debugging

#### Scenario: Deploy only changed skills
- **WHEN** skills have been added, modified, or deleted
- **THEN** remove deployed files for deleted skills only
- **AND** copy only new or modified skill files
- **AND** update deployed hash records after successful deployment
- **AND** maintain continuous skill availability during deployment

#### Scenario: Handle concurrent deployment requests
- **WHEN** multiple deployment requests arrive simultaneously
- **THEN** serialize deployment operations per user
- **AND** use advisory locks to prevent race conditions
- **AND** return current deployment status to all waiters

---

### Requirement: Skill Content Hash Tracking
The system SHALL track skill content hashes to enable efficient change detection and incremental deployment.

#### Scenario: Calculate content hash on skill change
- **WHEN** a skill is created or modified
- **THEN** calculate SHA-256 hash of skill content (frontmatter + body)
- **AND** store hash in database skill record
- **AND** use hash for deployment change detection

#### Scenario: Store deployment metadata
- **WHEN** skills are deployed to Claude Agent
- **THEN** store deployedAt timestamp in database
- **AND** store deployedHash for each skill
- **AND** use metadata for next deployment comparison

---

### Requirement: Skill Security Validation
The system SHALL validate skill content for security risks, including dangerous template variables and unsafe shell patterns.

#### Scenario: Validate frontmatter fields
- **WHEN** a skill is created or updated
- **THEN** require non-empty `name` field
- **AND** require non-empty `description` field
- **AND** validate `slug` format (lowercase, alphanumeric, hyphens only)

#### Scenario: Check for dangerous patterns
- **WHEN** skill content is validated
- **THEN** scan for template injection patterns if inlineShell is disabled
- **AND** warn about potential command injection risks
- **AND** block skills with clearly malicious patterns

---

### Requirement: Skill Root Priority Consistency
The system SHALL use consistent skill root priority logic across Hermes and Claude agents, where user skills override built-in skills with the same slug.

#### Scenario: User skills override built-in skills
- **WHEN** both a built-in skill and user skill have the same slug
- **THEN** the user skill MUST take precedence
- **AND** this behavior MUST be consistent in both Hermes skills_list and Claude deployment
- **AND** use forward iteration over skill roots (later roots override earlier)

#### Scenario: Consistent root ordering
- **WHEN** skill roots are enumerated
- **THEN** both Hermes Agent and Claude deployment MUST use the same root order
- **AND** neither system SHALL reverse the root array independently
