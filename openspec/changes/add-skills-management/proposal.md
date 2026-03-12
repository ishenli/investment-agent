# Change: Add Skills Management Panel

## Why

Users need a centralized interface to view, enable/disable, and manage AI skills used by the agent system. Currently, skills are managed through configuration files or lack a unified UI, making it difficult for non-technical users to customize their agent capabilities.

## What Changes

- Add new database table `skills` to store skill configurations (slug, name, description, category, source, isEnabled, etc.)
- Create `SkillRepository` and `SkillService` following project layered architecture
- Add Zustand store at `store/skills/` for client-side state management
- Create new settings page at `/setting/skills` with search, filtering, and toggle controls
- Add API routes for CRUD operations on skills
- Update settings sidebar navigation to include Skills option
- Add internationalization support for Skills management

## Impact

- **Affected specs**: New capability `skills-management`
- **Affected code**:
  - `drizzle/schema/` - Add skills table schema
  - `server/repository/` - Add skillRepository.ts
  - `server/service/` - Add skillService.ts
  - `server/controller/` - Add skillController.ts
  - `store/skills/` - New Zustand store
  - `app/api/skills/` - New API routes
  - `app/(pages)/setting/skills/` - New settings page
  - `app/components/settings-sidebar.tsx` - Add Skills navigation item