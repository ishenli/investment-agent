# Unify Skill Management Across Hermes and Claude Agents

## Why

The codebase currently has two independent skill management mechanisms that operate without coordination:

1. **Hermes Agent** uses `skill_manage` tool in `packages/hermes-agent/src/skill-tools/skill-manage.ts` for dynamic skill creation, editing, and deletion
2. **Claude Agent** uses `SkillService.deployEnabledSkills()` to deploy enabled skills from the database to `{workspaceRoot}/{userId}/.claude/skills/`

This architecture causes several issues:
- **P1**: When Hermes creates or modifies skills via `skill_manage`, these changes don't trigger Claude's skill redeployment, leading to inconsistent skill states
- **P2**: `skill_manage` operates directly on filesystem without creating corresponding `skills` table records, so new skills are invisible to Claude's deployment
- **P2**: `deployEnabledSkills` queries database for enabled skills, but Hermes creates skills outside this flow
- **P3**: Skill deployment is destructive (full delete + copy), inefficient for many skills and creates availability gaps
- **P3**: `skill_manage` lacks security validation for dangerous template variables or shell commands

## What Changes

### Unified Skill Registry Layer
- Create a single source of truth for skill state that both agents query
- Skill operations (create/edit/delete) should update this registry atomically
- Registry should support both database-backed preferences and filesystem-based skill content

### Synchronization Mechanism
- Hermes `skill_manage` tool must emit events when skills are created, modified, or deleted
- Claude Agent must subscribe to these events and trigger redeployment when needed
- Or use a shared service that handles both file operations and database updates

### Incremental Deployment
- Replace destructive deployment with incremental sync
- Track deployed skill versions/hashes to detect actual changes
- Only update skills that changed since last deployment

### Enhanced Validation
- Add comprehensive validation for skill content
- Check for dangerous template variables if `inlineShell` is enabled
- Validate YAML frontmatter thoroughly

## Impact

- **Hermes Agent**: `skill_manage` tool will need to integrate with database layer
- **Claude Agent**: Deployment will become event-driven and incremental
- **Backend Services**: New synchronization service or event system
- **Breaking Change**: Yes - skill operations workflow changes

## Affected Capabilities

- `skills-management` spec requires updates for unified behavior
- May need new capability for cross-agent skill synchronization

## Related Code

- `packages/hermes-agent/src/skill-tools/skill-manage.ts` - Hermes skill management
- `src/server/service/skillService.ts` - Claude skill deployment
- `src/server/lib/skill/SkillFileScanner.ts` - File scanning logic
- `src/server/core/agents/hermes/engine.ts` - Hermes engine configuration
