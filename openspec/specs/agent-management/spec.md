# agent-management Specification

## Purpose
TBD - created by archiving change unify-agent-management. Update Purpose after archive.
## Requirements
### Requirement: System Base Agent (inbox)

The system SHALL maintain a hardcoded system base agent called `inbox` for default session creation.

#### Scenario: Inbox agent always exists

- **WHEN** the system initializes
- **THEN** the `inbox` session configuration SHALL always be available
- **AND** the `inbox` configuration SHALL be defined in code, not in database

#### Scenario: Inbox session creation

- **WHEN** a user creates a session without specifying an agent
- **THEN** the system SHALL use the `inbox` agent configuration
- **AND** the session's `agentId` SHALL be set to `inbox`

---

### Requirement: Builtin Agent Configuration

The system SHALL define builtin agent configurations in server-side code.

#### Scenario: Builtin agents config file

- **WHEN** the server starts
- **THEN** the system SHALL load `BUILTIN_AGENTS_CONFIG` from `src/server/const/builtinAgents.ts`
- **AND** each config SHALL include: `slug`, `name`, `description`, `systemRole`, `openingQuestions`, `logo`

#### Scenario: No inbox in builtin config

- **WHEN** defining builtin agents configuration
- **THEN** the `inbox` agent SHALL NOT be included in `BUILTIN_AGENTS_CONFIG`
- **AND** the `inbox` SHALL remain in `SESSION_CONFIG_MAP`

---

### Requirement: Agent Repository Layer

The system SHALL provide a repository layer for agent data access.

#### Scenario: Repository inheritance

- **WHEN** the `AgentRepository` is created
- **THEN** it SHALL extend `BaseIntRepository`
- **AND** it SHALL provide type-safe CRUD operations

#### Scenario: Repository methods

- **WHEN** using `AgentRepository`
- **THEN** it SHALL provide `findBySlug(slug)` method
- **AND** it SHALL provide `findByIsBuiltin(isBuiltin)` method
- **AND** it SHALL provide `existsBySlugAndIsBuiltin(slug, isBuiltin)` method

---

### Requirement: Agent Service Layer

The system SHALL provide a service layer for agent management operations.

#### Scenario: Initialize builtin agents to database

- **WHEN** the `initializeBuiltinAgents()` method is called
- **THEN** the system SHALL iterate through `BUILTIN_AGENTS_CONFIG`
- **AND** for each config, check if agent exists via `existsBySlugAndIsBuiltin(slug, true)`
- **AND** create missing agents with `isBuiltin=true`

#### Scenario: Get agent by slug

- **WHEN** the `getAgentBySlug(slug)` method is called with `inbox`
- **THEN** the system SHALL return the hardcoded inbox configuration

- **WHEN** the `getAgentBySlug(slug)` method is called with other slug
- **THEN** the system SHALL query from database via `AgentRepository.findBySlug(slug)`
- **OR** return null if not found

#### Scenario: List agents

- **WHEN** the `listAgents(options)` method is called
- **THEN** the system SHALL support filtering by `isBuiltin` flag
- **AND** return agents from database only (not including `inbox`)

---

### Requirement: Server-Side Initialization Hook

The system SHALL initialize builtin agents when the Next.js server starts.

#### Scenario: Instrumentation hook

- **WHEN** the Next.js server starts
- **THEN** the `instrumentation.ts` `register()` function SHALL execute
- **AND** it SHALL call `AgentService.initializeBuiltinAgents()`

#### Scenario: Idempotent initialization

- **WHEN** the initialization runs multiple times
- **THEN** only missing builtin agents SHALL be created
- **AND** existing builtin agents SHALL NOT be duplicated

#### Scenario: Initialization error handling

- **WHEN** the initialization fails
- **THEN** the error SHALL be logged
- **AND** the server SHALL continue to start (non-blocking)

---

### Requirement: Database Agent Storage

The system SHALL store non-inbox agents (builtin and user-defined) in the database `agent` table with a unified schema.

#### Scenario: Builtin agent storage

- **WHEN** `initializeBuiltinAgents()` creates an agent
- **THEN** the agent SHALL be stored in the `agent` table
- **AND** the agent SHALL have `isBuiltin` set to `true`
- **AND** `apiKey`/`apiUrl` SHALL be populated from system default settings

#### Scenario: User-defined agent storage

- **WHEN** a user creates a new agent through the UI
- **THEN** the agent SHALL be stored in the `agent` table
- **AND** the agent SHALL have `isBuiltin` set to `false`
- **AND** the agent's `slug` SHALL NOT be `inbox`

---

### Requirement: Builtin Agent Identification

The system SHALL provide a mechanism to identify builtin agents in the database.

#### Scenario: Builtin flag presence

- **WHEN** querying agents from the database
- **THEN** each agent SHALL have an `isBuiltin` boolean field
- **AND** builtin agents SHALL have `isBuiltin` set to `true`

#### Scenario: Builtin agent protection

- **WHEN** a user attempts to delete a builtin agent
- **THEN** the system SHALL prevent deletion
- **AND** the system SHALL display an appropriate error message

---

### Requirement: Agent Configuration Management

The system SHALL provide a unified UI for managing database-stored agents.

#### Scenario: View database agents

- **WHEN** a user navigates to the agent settings page
- **THEN** the system SHALL display all agents stored in database (builtin and user-defined)
- **AND** the `inbox` agent SHALL NOT appear in the list
- **AND** the system SHALL provide filtering options (All / Builtin / Custom)

#### Scenario: Edit builtin agent

- **WHEN** a user edits a builtin agent (from database)
- **THEN** the system SHALL allow editing of: `systemRole`, `openingQuestions`, `logo`
- **AND** the system SHALL NOT allow editing of: `slug`, `name`, `type`, `apiKey`, `apiUrl`

#### Scenario: Edit custom agent

- **WHEN** a user edits a custom agent
- **THEN** the system SHALL allow editing of all fields

---

### Requirement: Session-Agent Association

The system SHALL associate chat sessions with agents through the agent's slug.

#### Scenario: Create session with agentSlug parameter

- **WHEN** a user creates a new session via POST `/api/chat/sessions` with `agentSlug` parameter
- **THEN** the system SHALL resolve the agent configuration via `AgentService.getAgentBySlug(slug)`
- **AND** the session's `agentId` SHALL be set to the agent's `slug`
- **AND** the session SHALL inherit the agent's configuration

#### Scenario: Create session without agentSlug

- **WHEN** a user creates a new session without `agentSlug` parameter
- **THEN** the system SHALL use the `inbox` agent configuration
- **AND** the session's `agentId` SHALL be set to `inbox`

---

### Requirement: SESSION_CONFIG_MAP Simplification

The `SESSION_CONFIG_MAP` SHALL be simplified to only include the `inbox` configuration.

#### Scenario: Inbox config preserved

- **WHEN** the system loads `SESSION_CONFIG_MAP`
- **THEN** only `inbox` configuration SHALL be present
- **AND** other configurations (like `marketInfo`) SHALL be removed

### Requirement: Market Info Agent Tools

系统 SHALL 为 Agent 提供市场信息相关的工具。

#### Scenario: 查询市场信息列表

- **WHEN** Agent 调用 `market_info_list` 工具
- **THEN** 系统 SHALL 返回市场信息列表
- **AND** 支持分页和日期范围过滤

#### Scenario: 获取最新市场信息

- **WHEN** Agent 调用 `market_info_latest` 工具
- **THEN** 系统 SHALL 返回指定资产的最新市场信息
- **AND** 参数包括 `assetMetaId`

#### Scenario: 获取市场信息详情

- **WHEN** Agent 调用 `market_info_detail` 工具
- **THEN** 系统 SHALL 返回指定 ID 的市场信息详情
- **AND** 参数包括 `id`

#### Scenario: 保存市场信息

- **WHEN** Agent 调用 `market_info_save` 工具
- **THEN** 系统 SHALL 创建新的市场信息记录
- **AND** 参数包括 `assetMetaIds`, `title`, `summary`, `sentiment`, `importance` 等

#### Scenario: 更新市场信息

- **WHEN** Agent 调用 `market_info_update` 工具
- **THEN** 系统 SHALL 更新指定 ID 的市场信息
- **AND** 支持部分字段更新

#### Scenario: 删除市场信息

- **WHEN** Agent 调用 `market_info_delete` 工具
- **THEN** 系统 SHALL 删除指定 ID 的市场信息
- **AND** 需要确认参数 `id`

---

### Requirement: Report Agent Tools

系统 SHALL 为 Agent 提供报告相关的工具。

#### Scenario: 查询报告列表

- **WHEN** Agent 调用 `report_list` 工具
- **THEN** 系统 SHALL 返回报告列表
- **AND** 支持按类型（weekly/monthly/emergency）过滤
- **AND** 支持分页参数

#### Scenario: 获取报告详情

- **WHEN** Agent 调用 `report_detail` 工具
- **THEN** 系统 SHALL 返回指定 ID 的报告详情
- **AND** 参数包括 `id`

---

### Requirement: Tool Schema 定义

所有新增工具 SHALL 使用 TypeBox Schema 定义参数。

#### Scenario: Schema 一致性

- **WHEN** 定义工具 Schema
- **THEN** Schema SHALL 与 Controller 的 Zod Schema 保持一致
- **AND** 提供清晰的参数描述

#### Scenario: 错误处理

- **WHEN** 工具调用失败
- **THEN** 系统 SHALL 返回包含错误信息的响应
- **AND** 错误信息 SHALL 足够 Agent 理解问题

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

### Requirement: Task Management Business Tools
The agent-management capability SHALL expose three new business tools (`task_create`, `task_list`, `task_update`) allowing the AI Agent to interact with the user's task system during conversations, bridging the gap between AI recommendations and actionable follow-ups.

#### Scenario: Agent creates a task after giving advice
- **GIVEN** the Agent has just recommended "Consider accumulating AAPL if it drops below $180"
- **WHEN** the Agent invokes `task_create({ title: "Accumulate AAPL if < $180", type: "price_trigger", triggerPrice: 180, triggerDirection: "below", linkedSymbols: ["AAPL"] })`
- **THEN** a new task is persisted with `sourceType = 'agent_chat'` and `sourceId = currentSessionId`
- **AND** the userId is automatically resolved from the current chat session context, never from user input
- **AND** the tool response returns the created task `id`

#### Scenario: Agent lists user's pending tasks during chat
- **GIVEN** a user asks "What should I follow up on this week?"
- **WHEN** the Agent invokes `task_list({ status: "pending" })`
- **THEN** the tool returns the matching tasks ordered by `priority DESC, dueDate ASC`
- **AND** the Agent incorporates the task list into its natural language response

#### Scenario: Agent marks a task completed based on user feedback
- **GIVEN** a user says "I already bought NVDA at $115"
- **WHEN** the Agent invokes `task_update({ id: 42, status: "completed", executionNotes: "User executed buy order at $115" })`
- **THEN** the task status transitions to `completed` with `completedAt` timestamp
- **AND** the Agent confirms the completion in its response

#### Scenario: Tool registration in registerBusinessTools
- **WHEN** `registerBusinessTools()` builds the tool registry
- **THEN** it SHALL include `task_create`, `task_list`, and `task_update`
- **AND** each tool SHALL use the same `tool()` decorator pattern as existing business tools
- **AND** each tool SHALL have its description and parameters defined in `toolDefinitions` (consistent with the Phase 1 tool display system pattern)

