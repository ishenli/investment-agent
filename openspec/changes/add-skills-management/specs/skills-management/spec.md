## ADDED Requirements

### Requirement: Skills List Display
The system SHALL provide a view of all available AI skills for the current user, displaying skill name, description, category badge, source badge, and enable/disable toggle switch.

#### Scenario: View all skills
- **WHEN** user navigates to `/setting/skills`
- **THEN** display all skills belonging to the authenticated user
- **AND** show skill name, description, category, source, and enable status for each skill
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
- **THEN** send PUT request to `/api/skills` with updated isEnabled=true
- **AND** persist the change to the database
- **AND** update the UI to show the skill as enabled

#### Scenario: Disable a skill
- **WHEN** user clicks the toggle on an enabled skill
- **THEN** send PUT request to `/api/skills` with updated isEnabled=false
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

### Requirement: Skills Category Filter
The system SHALL provide category-based filtering using tabs or dropdown (all, brainstorming, debugging, tdd, etc.).

#### Scenario: Filter by category
- **WHEN** user selects a category tab
- **THEN** display only skills matching the selected category
- **AND** highlight the active category tab

#### Scenario: Show all categories
- **WHEN** user selects "all" or clears category filter
- **THEN** display all skills regardless of category

---

### Requirement: Custom Skills Creation
The system SHALL allow users to create custom skills with name, slug, description, category, and optional icon.

#### Scenario: Create custom skill
- **WHEN** user fills the "Add Skill" form with valid data
- **THEN** send POST request to `/api/skills` with the skill data
- **AND** persist the new skill to database with source='custom'
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
- **IF** user confirms, send DELETE request to `/api/skills`
- **AND** remove the skill from the database
- **AND** remove the skill from the displayed list
- **AND** show success toast

#### Scenario: Protect official skill from deletion
- **WHEN** user attempts to delete an official skill (source='official')
- **THEN** display error "Official skills cannot be deleted"
- **AND** do not show delete button for official skills

---

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

---

### Requirement: Skills API Routes
The system SHALL provide REST API endpoints for skills CRUD operations: GET (list), POST (create), PUT (update), DELETE (delete), optionally POST `/api/skills/sync` (sync builtin).

#### Scenario: GET /api/skills
- **WHEN** authenticated user makes GET request to `/api/skills`
- **THEN** return all skills belonging to the user
- **AND** include skill metadata (id, slug, name, description, category, source, isEnabled, icon)

#### Scenario: POST /api/skills
- **WHEN** authenticated user sends POST request with skill data
- **THEN** validate the request body (required fields, slug uniqueness)
- **AND** create the skill if valid
- **AND** return the created skill object
- **OR** return 400 error if validation fails

#### Scenario: PUT /api/skills
- **WHEN** authenticated user sends PUT request with skill updates
- **THEN** update the skill if it belongs to the user
- **AND** return the updated skill object
- **OR** return 404 if skill not found
- **OR** return 403 if attempting to modify another user's skill

#### Scenario: DELETE /api/skills
- **WHEN** authenticated user sends DELETE request with skillId
- **THEN** delete the skill if it belongs to user and is not official
- **AND** return success status
- **OR** return 403 if attempting to delete official skill

---

### Requirement: Skills State Management
The system SHALL use Zustand store to manage skills state, including actions: fetchSkills, toggleSkill, searchSkills, filterByCategory, createCustomSkill, deleteCustomSkill.

#### Scenario: Fetch skills on store initialization
- **WHEN** the skills store is first accessed
- **THEN** fetch skills from `/api/skills`
- **AND** store the results in the skills state
- **AND** set loading state to false

#### Scenario: Toggle skill via store action
- **WHEN** store action toggleSkill(skillId) is called
- **THEN** call API to update the skill
- **AND** update the local skills state if successful
- **OR** revert on error

#### Scenario: Search and filter as computed state
- **WHEN** searchQuery or selectedCategory changes
- **THEN** compute filteredSkills from the skills list
- **AND** update components automatically via reactivity

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
- **AND** include skill categories, actions, and messages

#### Scenario: Support new languages
- **WHEN** a new language is added to the project
- **THEN** add corresponding translation keys for Skills Management