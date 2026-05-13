## ADDED Requirements

### Requirement: PermissionSystem Type Definitions

The system SHALL define `PermissionLevel`, `ToolCategory`, and `ToolPolicy` types to enable a centralized permission system for agent tool execution.

#### Scenario: Permission levels exist

- **WHEN** the system initializes the PermissionSystem
- **THEN** it SHALL support four permission levels: `safe`, `standard` (default), `power`, and `unrestricted`
- **AND** each level SHALL be represented as a string literal type

#### Scenario: Tool categories exist

- **WHEN** a tool is registered
- **THEN** it SHALL be assigned one of four categories: `read`, `write`, `system`, or `finance`
- **AND** `db_query` SHALL be categorized as `read` as it is a read-only database query operation

#### Scenario: Tool policy outcomes

- **WHEN** `PermissionPolicy.evaluate(category, level)` is called
- **THEN** it SHALL return one of three policies: `auto` (execute immediately), `confirm` (require user approval), or `deny` (block execution)

---

### Requirement: Permission Policy Matrix

The system SHALL implement a permission policy matrix that maps `(PermissionLevel, ToolCategory)` to execution policy.

#### Scenario: Safe permission level

- **WHEN** the agent runs at `safe` permission level
- **THEN** all `read` and `write` category tools SHALL execute with `auto`
- **AND** all `system` and `finance` category tools SHALL return `deny`

#### Scenario: Standard permission level (default)

- **WHEN** the agent runs at `standard` permission level
- **THEN** all `read` and `write` category tools SHALL execute with `auto`
- **AND** all `system` and `finance` category tools SHALL return `confirm`

#### Scenario: Power permission level

- **WHEN** the agent runs at `power` permission level
- **THEN** `read` and `write` category tools SHALL execute with `auto`
- **AND** `system` category tools SHALL return `confirm`
- **AND** `finance` category tools SHALL execute with `auto`

#### Scenario: Unrestricted permission level

- **WHEN** the agent runs at `unrestricted` permission level
- **THEN** all tool categories SHALL execute with `auto`
- **AND** only ContentGuard (Layer 2) rules still apply for `terminal` and `patch`

#### Scenario: Default permission level

- **WHEN** `AgentConfig` does not specify `permissionLevel`
- **THEN** the system SHALL default to `standard`

---

### Requirement: Tool Category Registration

The system SHALL support registering tools with a `ToolCategory` designation.

#### Scenario: Register tool with category

- **WHEN** a developer calls `registry.register(name, description, parameters, handler, category)`
- **THEN** the system SHALL store the provided `ToolCategory`
- **AND** execute the permission policy at runtime based on the current `PermissionLevel`

#### Scenario: Legacy registration without category

- **WHEN** a developer calls `registry.register()` without a `category` argument
- **THEN** the system SHALL default the category to `read`
- **AND** emit a one-time console warning in development mode to encourage explicit categorization

---

### Requirement: Content Guard Layer

The system SHALL maintain a ContentGuard layer that validates the actual content of tool arguments independently of permission levels.

#### Scenario: Terminal command dangerous pattern blocked

- **WHEN** the `terminal` tool is invoked with a command matching dangerous patterns (e.g., `rm -rf`, `sudo`, `dd if=`, commands piped to `sh`)
- **THEN** ContentGuard SHALL return a denial with the matched pattern reason
- **AND** the command SHALL NOT execute regardless of the current permission level

#### Scenario: Terminal working directory constraint

- **WHEN** the `terminal` tool receives a `workdir` argument
- **THEN** ContentGuard SHALL validate that the resolved path falls within allowed paths (`process.cwd()` by default, extensible via `HERMES_ALLOWED_WORKDIRS`)
- **AND** reject commands targeting paths outside the whitelist

#### Scenario: File patch path validation

- **WHEN** the `patch` tool targets a path outside the allowed directory whitelist
- **THEN** ContentGuard SHALL reject the operation
- **AND** the file SHALL NOT be modified

#### Scenario: Sensitive file protection

- **WHEN** the `patch` tool targets a sensitive file pattern (e.g., `.env`, `*.key`, `.git/config`, `id_rsa`)
- **THEN** ContentGuard SHALL reject the operation regardless of path resolution
- **AND** return an error identifying the file type as protected

#### Scenario: Content guard can be disabled via environment variable

- **WHEN** `HERMES_DISABLE_CONTENT_GUARD` is set to `"true"`
- **THEN** all ContentGuard checks SHALL be bypassed
- **AND** the system SHALL log a warning at startup about the disabled guard

---

### Requirement: Agent Loop Confirmation Handling

The system SHALL pause the agent loop and request user confirmation before executing tools whose policy evaluates to `confirm`.

#### Scenario: Confirm policy triggers callback

- **WHEN** the agent loop encounters a tool whose policy is `confirm`
- **THEN** the loop SHALL pause at that iteration
- **AND** invoke `callbacks.onConfirmationRequest({ toolName, args, permissionLevel, toolCategory })`

#### Scenario: User confirms pending operation

- **WHEN** the user confirms via the callback resolution
- **THEN** the agent loop SHALL resume and execute the tool handler
- **AND** proceed with normal message context advancement

#### Scenario: User declines pending operation

- **WHEN** the user declines via the callback rejection
- **THEN** the agent loop SHALL skip handler execution
- **AND** push a `toolResult` message with `isError: true` and the refusal reason into the context
- **AND** continue to the next iteration

#### Scenario: Confirmation timeout

- **WHEN** the confirmation callback remains unresolved after 60 seconds
- **THEN** the system SHALL auto-decline the operation
- **AND** the agent loop SHALL continue with an error result indicating "confirmation timeout"

#### Scenario: Deny policy bypasses handler

- **WHEN** the agent loop encounters a tool whose policy is `deny`
- **THEN** the system SHALL immediately construct a rejection result without invoking the handler
- **AND** the result SHALL include the reason (permission level insufficient for category)

---

### Requirement: Agent Loop Permission Integration

The system SHALL integrate PermissionSystem checks into the agent loop before tool handler execution.

#### Scenario: Execution order for auto policy

- **WHEN** a tool's policy evaluates to `auto`
- **THEN** the system SHALL additionally run ContentGuard validation
- **AND** only if ContentGuard also allows, execute the handler

#### Scenario: Deny policy short-circuits

#### Scenario: Confirm policy execution order

- **WHEN** a tool's policy evaluates to `confirm`
- **AND** the user confirms the operation via `onConfirmationRequest`
- **THEN** the system SHALL run ContentGuard validation before executing the handler
- **AND** if ContentGuard denies, the handler SHALL NOT be invoked
- **AND** if ContentGuard allows, the handler SHALL be executed
- **AND** the system SHALL return a clear error message if ContentGuard blocks the operation after user confirmation

- **WHEN** a tool's policy evaluates to `deny`
- **THEN** ContentGuard SHALL NOT be invoked (the denial is already final)
- **AND** the handler SHALL NOT be invoked

#### Scenario: Permission level is read from AgentConfig

- **WHEN** the agent loop starts processing tool calls
- **THEN** it SHALL read `config.permissionLevel` to determine the current level
- **AND** use that level for all permission policy evaluations in that session

---

### Requirement: Audit Logging Hook

The system SHALL provide an optional audit logging hook that records permission and content guard decisions.

#### Scenario: Audit log on permission deny

- **WHEN** a tool is denied by PermissionPolicy
- **THEN** the system SHALL call `auditLogger.log()` with `toolName`, `toolCategory`, `permissionLevel`, `policy: 'deny'`, and `reason`

#### Scenario: Audit log on content guard block

- **WHEN** a tool is blocked by ContentGuard despite passing PermissionPolicy
- **THEN** the system SHALL call `auditLogger.log()` with `toolName`, `contentGuardReason`, and `timestamp`

#### Scenario: Default audit logger behavior

- **WHEN** no custom `auditLogger` is configured
- **THEN** the system SHALL log permission decisions to `console.warn` in development mode
- **AND** SHALL remain silent in production mode
- **AND** SHALL NOT throw or block execution if logging fails
