# memory-management Specification

## Purpose

记忆管理系统为投资 AI 助手提供双层记忆能力：

1. **短期记忆（Session-Level）**：使用 Claude Agent SDK Hooks + 工作区 Markdown 文件，实现对话过程中实时记忆提取和上下文保持
2. **长期记忆（Persistent）**：使用 SQLite 数据库存储，支持用户手动管理和跨会话持久化

## ADDED Requirements

### Requirement: Short-term Memory (SDK Hooks + Markdown, User-Level, 3 Days)

The system SHALL use Claude Agent SDK hooks to automatically extract and store user preferences during conversation at user level with 3-day retention.

#### Scenario: PostToolUse hook captures user preferences

- **WHEN** user mentions investment preferences during conversation
- **AND** AI responds with tool usage
- **THEN** the PostToolUse hook SHALL analyze the conversation context
- **AND** extract relevant memory information (preferences, risk tolerance, etc.)
- **AND** write to short-term memory markdown file at user level

#### Scenario: Short-term memory file format (user-level)

- **WHEN** short-term memory is created
- **THEN** the system SHALL create a markdown file in `.investment-agent/memory/users/{userId}/`
- **AND** include YAML frontmatter with category, source, importance, created_at, updated_at
- **AND** include markdown content with the memory details

#### Scenario: Load short-term memory on conversation start

- **WHEN** conversation starts or resumes
- **THEN** the system SHALL read all markdown files from `.investment-agent/memory/users/{userId}/`
- **AND** inject the content into the conversation context

#### Scenario: Auto-cleanup expired memories (3 days)

- **WHEN** short-term memories are read
- **THEN** the system SHALL check the `updated_at` timestamp in frontmatter
- **AND** delete files where `updated_at` is older than 3 days
- **AND** this cleanup SHALL happen automatically before each read operation

---

### Requirement: Long-term Memory Storage (SQLite)

The system SHALL provide persistent storage for user memories in SQLite database.

#### Scenario: Create memory manually

- **WHEN** user creates a new memory through the UI
- **THEN** the system SHALL store the memory in the `memories` table
- **AND** set `source` to `manual`
- **AND** generate auto-increment id
- **AND** set `createdAt` and `updatedAt` timestamps

#### Scenario: Create memory automatically

- **WHEN** AI extracts a memory during conversation and user confirms
- **THEN** the system SHALL store the memory in the `memories` table
- **AND** set `source` to `auto`
- **AND** link to the source session via `sessionId`

#### Scenario: Soft delete memory

- **WHEN** user deletes a memory
- **THEN** the system SHALL set `deletedAt` timestamp
- **AND** the memory SHALL NOT appear in active memory lists

---

### Requirement: Memory Categories

The system SHALL support the following memory categories: investment_preference, risk_tolerance, trading_strategy, position_rule, market_view, personal_info, other.

#### Scenario: Categorize investment preference

- **WHEN** user creates a memory about investment style (e.g., "偏好科技股", "价值投资")
- **THEN** the system SHALL categorize it as `investment_preference`

#### Scenario: Categorize risk tolerance

- **WHEN** user creates a memory about risk appetite (e.g., "风险承受能力中等", "保守型投资者")
- **THEN** the system SHALL categorize it as `risk_tolerance`

#### Scenario: Categorize trading strategy

- **WHEN** user creates a memory about trading approach (e.g., "止损线5%", "分批建仓")
- **THEN** the system SHALL categorize it as `trading_strategy`

#### Scenario: Categorize position rule

- **WHEN** user creates a memory about position management (e.g., "单一持仓不超过20%", "分散投资")
- **THEN** the system SHALL categorize it as `position_rule`

#### Scenario: Categorize market view

- **WHEN** user creates a memory about market outlook (e.g., "看好AI板块", "谨慎看待高估值股票")
- **THEN** the system SHALL categorize it as `market_view`

---

### Requirement: Memory API Endpoints

The system SHALL provide REST API endpoints for memory CRUD operations.

#### Scenario: GET /api/memory

- **WHEN** authenticated user makes GET request to `/api/memory`
- **THEN** return all non-deleted long-term memories for the user
- **AND** support optional `category` query parameter for filtering
- **AND** order by `importance` DESC, then `updatedAt` DESC

#### Scenario: POST /api/memory

- **WHEN** authenticated user sends POST request with memory data
- **THEN** validate required fields: `content`, `category`
- **AND** create the memory with `source=manual`
- **AND** return the created memory object
- **OR** return 400 error if validation fails

#### Scenario: PUT /api/memory/:id

- **WHEN** authenticated user sends PUT request with memory updates
- **THEN** update the memory if it belongs to the user
- **AND** update `updatedAt` timestamp
- **AND** return the updated memory object
- **OR** return 404 if memory not found

#### Scenario: DELETE /api/memory/:id

- **WHEN** authenticated user sends DELETE request
- **THEN** soft delete the memory if it belongs to the user
- **AND** set `deletedAt` to current timestamp
- **OR** return 404 if memory not found

#### Scenario: POST /api/memory/sync

- **WHEN** authenticated user requests to sync short-term to long-term memory
- **THEN** read markdown files from `.investment-agent/memory/users/{userId}/`
- **AND** parse each file's frontmatter and content
- **AND** create long-term memory records
- **AND** optionally delete the synced short-term memory files
- **AND** return the created long-term memories

---

### Requirement: Memory Service Layer

The system SHALL provide a MemoryService for memory business logic operations.

#### Scenario: Create memory

- **WHEN** `createMemory(userId, data)` is called
- **THEN** validate the data
- **AND** create memory record via MemoryRepository
- **AND** return the created memory

#### Scenario: Retrieve relevant memories

- **WHEN** `retrieveRelevantMemories(userId, limit)` is called
- **THEN** fetch non-deleted long-term memories for the user
- **AND** order by `importance` DESC
- **AND** limit to specified count (default 10)
- **AND** return the memories

#### Scenario: Sync short-term to long-term

- **WHEN** `syncShortTermToLongTerm(userId)` is called
- **THEN** read short-term memory files from `.investment-agent/memory/users/{userId}/`
- **AND** parse and validate memory content
- **AND** create long-term memory records
- **AND** optionally delete the synced short-term memory files
- **AND** return the created memories

#### Scenario: Update memory

- **WHEN** `updateMemory(userId, memoryId, data)` is called
- **THEN** verify ownership via MemoryRepository
- **AND** update the memory if owned by user
- **AND** return the updated memory
- **OR** return null if not found or not owned

#### Scenario: Delete memory

- **WHEN** `deleteMemory(userId, memoryId)` is called
- **THEN** verify ownership
- **AND** soft delete the memory if owned by user
- **AND** return success status
- **OR** return failure if not found or not owned

---

### Requirement: Memory Repository Layer

The system SHALL provide a MemoryRepository for memory data access.

#### Scenario: Repository inheritance

- **WHEN** the `MemoryRepository` is created
- **THEN** it SHALL extend `BaseIntRepository`
- **AND** it SHALL provide type-safe CRUD operations

#### Scenario: Find by user

- **WHEN** `findByUserId(userId)` is called
- **THEN** return all non-deleted memories for the user
- **AND** order by `importance` DESC, `updatedAt` DESC

#### Scenario: Find by user and category

- **WHEN** `findByUserIdAndCategory(userId, category)` is called
- **THEN** return non-deleted memories matching both criteria
- **AND** order by `importance` DESC, `updatedAt` DESC

---

### Requirement: Short-term Memory File Service (User-Level, 3 Days)

The system SHALL provide a service for managing short-term memory markdown files at user level with automatic 3-day cleanup.

#### Scenario: Write short-term memory (user-level)

- **WHEN** `writeShortTermMemory(userId, category, content)` is called
- **THEN** create `.investment-agent/memory/users/{userId}/{category}.md`
- **AND** include YAML frontmatter (category, source, importance, created_at, updated_at)
- **AND** write markdown content

#### Scenario: Read short-term memories (user-level)

- **WHEN** `readShortTermMemories(userId)` is called
- **THEN** trigger automatic cleanup of expired memories
- **AND** read all markdown files from `.investment-agent/memory/users/{userId}/`
- **AND** parse frontmatter and content
- **AND** return array of memory objects

#### Scenario: Delete short-term memory (user-level)

- **WHEN** `deleteShortTermMemory(userId, category)` is called
- **THEN** delete the corresponding markdown file

#### Scenario: Auto-cleanup memories older than 3 days

- **WHEN** `cleanupExpiredMemories(userId)` is called
- **THEN** calculate the timestamp for 3 days ago
- **AND** iterate through all markdown files in user's memory directory
- **AND** delete files where `updated_at` < three days ago
- **AND** return count of deleted files

---

### Requirement: Claude Agent SDK Hooks Integration

The system SHALL integrate memory hooks with Claude Agent SDK.

#### Scenario: Register PostToolUse hook

- **WHEN** conversation starts
- **THEN** the system SHALL register PostToolUse hook
- **AND** analyze each tool response for memory-worthy content

#### Scenario: Extract memory from conversation

- **WHEN** hook detects investment-related information
- **THEN** create short-term memory file
- **AND** notify user about potential memory creation

---

### Requirement: Memory State Management

The system SHALL use Zustand store to manage memory state on the client side.

#### Scenario: Fetch memories on store initialization

- **WHEN** the memory store is first accessed
- **THEN** fetch long-term memories from `/api/memory`
- **AND** store the results in the memories state
- **AND** set loading state to false

#### Scenario: Create memory via store action

- **WHEN** store action `createMemory(data)` is called
- **THEN** call API to create the memory
- **AND** add the new memory to local state if successful
- **OR** show error toast on failure

#### Scenario: Update memory via store action

- **WHEN** store action `updateMemory(id, data)` is called
- **THEN** call API to update the memory
- **AND** update the local state if successful
- **OR** revert on error

#### Scenario: Delete memory via store action

- **WHEN** store action `deleteMemory(id)` is called
- **THEN** call API to delete the memory
- **AND** remove from local state if successful
- **OR** show error toast on failure

---

### Requirement: Memory Management UI

The system SHALL provide a memory management page at `/settings/memory` for users to view, create, edit, and delete long-term memories.

#### Scenario: View memory list

- **WHEN** user navigates to `/settings/memory`
- **THEN** display all long-term memories for the authenticated user
- **AND** show content, category, importance, source for each memory
- **AND** display memories in a list layout

#### Scenario: Filter by category

- **WHEN** user selects a category filter
- **THEN** display only memories matching the selected category
- **AND** highlight the active filter

#### Scenario: Create new memory

- **WHEN** user clicks "Add Memory" button
- **THEN** show a form with content textarea, category selector, importance slider
- **AND** submit to create the memory on save

#### Scenario: Edit existing memory

- **WHEN** user clicks edit button on a memory
- **THEN** show the edit form pre-filled with current values
- **AND** submit to update the memory on save

#### Scenario: Delete memory

- **WHEN** user clicks delete button on a memory
- **THEN** show confirmation dialog
- **AND** soft delete the memory if confirmed

---

### Requirement: Memory Injection to Chat Context

The system SHALL automatically inject both short-term and long-term memories into chat context.

#### Scenario: Inject memories on conversation start

- **WHEN** user starts a new conversation or sends a message
- **THEN** retrieve relevant long-term memories via MemoryService
- **AND** read short-term memory files
- **AND** format memories as context text
- **AND** include in the system prompt for the AI

#### Scenario: Memory context format

- **WHEN** memories are injected into context
- **THEN** format as:
  ```
  ## 用户投资记忆

  ### 长期记忆
  - [偏好] 偏好科技股投资
  - [风险] 风险承受能力：中等

  ### 当前会话记忆
  - 用户提及：希望关注AI板块
  ```
- **AND** limit to top 10 most important memories
- **AND** include category label for each memory

---

### Requirement: Memory Navigation

The system SHALL add "Memory" item to the settings sidebar navigation.

#### Scenario: Display Memory navigation item

- **WHEN** user is on any settings page
- **THEN** show "Memory" option in the sidebar
- **AND** display with appropriate icon (e.g., Brain or Database icon)
- **AND** set active state when on `/settings/memory`

#### Scenario: Navigate to Memory page

- **WHEN** user clicks "Memory" in sidebar
- **THEN** navigate to `/settings/memory`
- **AND** load the Memory Management panel

---

### Requirement: Memory Internationalization

The system SHALL provide internationalization support for Memory Management UI in supported languages (zh-CN, en-US).

#### Scenario: Display localized text

- **WHEN** user's language preference is set
- **THEN** display all Memory Management text in the selected language
- **AND** include category labels, actions, and messages

#### Scenario: Support new languages

- **WHEN** a new language is added to the project
- **THEN** add corresponding translation keys for Memory Management