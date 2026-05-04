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

