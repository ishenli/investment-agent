## ADDED Requirements

### Requirement: Agent Settings as Runtime Assets Workspace
The system SHALL restructure `/setting/agent` as a dedicated Agent runtime assets viewer and editor.

#### Scenario: Runtime assets are the primary view
- **WHEN** an authenticated user navigates to `/setting/agent`
- **THEN** the page SHALL directly present Claude Code and Hermes Agent runtime file assets
- **AND** Memory and User profile files SHALL be viewable and editable
- **AND** the page SHALL NOT include database Agent profile management or Skill editing UI

### Requirement: Agent Runtime Assets Panel
The system SHALL provide an Agent Settings runtime assets panel that lets authenticated users inspect runtime files used by Claude Code and Hermes Agent.

#### Scenario: View runtime assets from Agent Settings
- **WHEN** an authenticated user navigates to `/setting/agent`
- **THEN** the system SHALL show a runtime assets view with runtime selection for `claude` and `hermes`
- **AND** the view SHALL provide asset selection for memory and user profile files

#### Scenario: Runtime asset metadata
- **WHEN** runtime assets are listed
- **THEN** each asset SHALL include display name, runtime, asset type, read-only state, existence state, last updated time when available, and a logical asset id
- **AND** the API response SHALL NOT expose arbitrary writable filesystem paths from client input

### Requirement: Agent Runtime Memory Editing
The system SHALL allow authenticated users to edit supported runtime Memory and User profile Markdown files from Agent Settings.

#### Scenario: Load Memory and User profile content
- **WHEN** the user selects a Claude Code or Hermes Agent memory or user profile asset
- **THEN** the system SHALL load the current UTF-8 Markdown content
- **AND** the editor SHALL show an empty editable document if the allowlisted file does not yet exist
- **AND** the editor SHALL show a read-only state if the file is outside an editable runtime location

#### Scenario: Save Memory and User profile content
- **WHEN** the user edits a supported Memory or User profile asset and clicks save
- **THEN** the system SHALL persist the content to the resolved allowlisted file
- **AND** the system SHALL use an atomic write strategy
- **AND** the system SHALL return updated metadata including updated time or content hash
- **AND** subsequent reloads SHALL show the saved content

#### Scenario: Reject unsafe runtime asset writes
- **WHEN** a save request contains an unknown runtime, unknown asset type, unknown logical asset id, oversized content, or invalid UTF-8 text
- **THEN** the system SHALL reject the request
- **AND** no file SHALL be written
- **AND** the UI SHALL show a specific error message

### Requirement: Claude Code Runtime Asset Resolution
The system SHALL resolve Claude Code runtime assets from the authenticated user's Claude workspace root.

#### Scenario: Resolve Claude Code runtime files
- **WHEN** the system lists Claude Code assets for a user
- **THEN** it SHALL use `ClaudeService.getUserWorkspaceRoot(userId)` as the root
- **AND** it SHALL include supported profile/memory files such as `CLAUDE.md`, `USER.md`, or `User.md` when present or creatable

#### Scenario: Prevent Claude workspace escape
- **WHEN** resolving a Claude Code runtime asset
- **THEN** the final resolved path SHALL remain inside the authenticated user's Claude workspace root
- **AND** path traversal input SHALL be rejected before file access

### Requirement: Electron Runtime Asset Storage Compatibility
The system SHALL store editable Agent runtime assets in Electron-compatible user data directories.

#### Scenario: Resolve editable assets under Electron userData
- **WHEN** the application runs in Electron mode
- **THEN** editable Claude Code runtime assets SHALL resolve under `NEXT_APP_USER_DATA/workspace/{userId}`
- **AND** editable Hermes Agent runtime assets SHALL resolve under `NEXT_APP_USER_DATA/workspace/{userId}/.hermes`
- **AND** packaged application resources SHALL NOT be used as write targets

#### Scenario: Read bundled defaults without mutating packaged resources
- **WHEN** a runtime asset has a bundled or packaged default source
- **THEN** the system MAY read that source as a default template
- **AND** any user save SHALL create or update a user-owned copy under Electron userData

### Requirement: Agent Runtime Asset API
The system SHALL expose server-side API routes for listing, reading, and updating Agent runtime assets.

#### Scenario: List and read runtime assets
- **WHEN** an authenticated user sends `GET /api/agent/runtime-assets`
- **THEN** the system SHALL return available Claude Code and Hermes Agent runtime assets scoped to that user
- **AND** it SHALL support optional query filters for runtime, asset type, and logical asset id

#### Scenario: Update runtime asset
- **WHEN** an authenticated user sends `PUT /api/agent/runtime-assets` with runtime, asset type, logical asset id, and Markdown content
- **THEN** the system SHALL validate the request with Zod
- **AND** save the asset only if it maps to an editable allowlisted location
- **AND** return the updated asset content and metadata

#### Scenario: Unauthorized runtime asset access
- **WHEN** a request is made without an authenticated user
- **THEN** the system SHALL return an unauthorized error
- **AND** no runtime asset content SHALL be returned or written
