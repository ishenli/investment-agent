## ADDED Requirements

### Requirement: Hermes Runtime Memory Asset Visibility
The system SHALL expose Hermes Agent file-backed memory assets for authenticated users through Agent Settings.

#### Scenario: List Hermes memory assets
- **WHEN** the Agent Settings runtime assets panel requests Hermes assets
- **THEN** the system SHALL list Hermes `MEMORY.md` and `USER.md` assets from the configured Hermes memory directory
- **AND** missing files SHALL be represented as creatable empty Markdown documents
- **AND** the listed assets SHALL include read-only and existence metadata

#### Scenario: Read Hermes memory asset content
- **WHEN** the user selects Hermes `MEMORY.md` or `USER.md`
- **THEN** the system SHALL read the same file content used by Hermes Agent's file-backed memory provider
- **AND** the content SHALL be returned as UTF-8 Markdown text

### Requirement: Hermes Runtime Memory Asset Editing
The system SHALL allow supported Hermes file-backed memory assets to be edited safely from Agent Settings.

#### Scenario: Save Hermes memory content
- **WHEN** a user edits Hermes `MEMORY.md` or `USER.md` from Agent Settings and saves
- **THEN** the system SHALL write the content to the configured Hermes memory directory
- **AND** future Hermes Agent turns SHALL read the updated memory content
- **AND** the save SHALL preserve the memory store's delimiter-compatible plain text format

#### Scenario: Enforce Hermes memory limits
- **WHEN** a Hermes memory asset save exceeds the configured memory size limit
- **THEN** the system SHALL reject the save
- **AND** no memory file SHALL be modified
- **AND** the UI SHALL display the configured limit in the error message

#### Scenario: Prevent Hermes memory directory escape
- **WHEN** resolving a Hermes memory asset
- **THEN** the final resolved path SHALL remain inside the configured Hermes memory directory
- **AND** path traversal input SHALL be rejected before file access
