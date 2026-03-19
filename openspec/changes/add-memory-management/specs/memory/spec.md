# memory-management Specification

## Purpose

记忆管理系统为投资 AI 助手提供双层记忆能力：

1. **短期记忆（Session-Level）**：使用 Claude Agent SDK Hooks + Markdown 文件，实现对话过程中实时记忆提取和上下文保持，3 天自动清理
2. **长期记忆（Persistent）**：使用 SQLite 数据库存储，支持用户手动管理和跨会话持久化，支持 Vector + BM25 混合搜索
3. **身份层（Identity Layer）**：使用 SQLite 存储 Agent 人格配置，每次会话必定加载

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
- **THEN** the system SHALL create a markdown file in `{getProjectRoot()}/memory/users/{userId}/{category}.md`
- **AND** include YAML frontmatter with category, source, importance, created_at, updated_at
- **AND** include markdown content with the memory details

#### Scenario: Load short-term memory on conversation start

- **WHEN** conversation starts or resumes
- **THEN** the system SHALL read all markdown files from `{getProjectRoot()}/memory/users/{userId}/`
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
- **THEN** the system SHALL store the memory in the `agent_memories` table
- **AND** set `source` to `manual`
- **AND** generate auto-increment id
- **AND** set `createdAt` and `updatedAt` timestamps

#### Scenario: Create memory automatically

- **WHEN** AI extracts a memory during conversation with importance >= 7
- **THEN** the system SHALL store the memory in the `agent_memories` table
- **AND** set `source` to `agent_extracted`
- **AND** automatically promote from short-term memory

#### Scenario: Soft delete memory

- **WHEN** user deletes a memory
- **THEN** the system SHALL set `deletedAt` timestamp
- **AND** the memory SHALL NOT appear in active memory lists

---

### Requirement: Agent Profiles (Identity Layer)

The system SHALL provide persistent storage for agent identity configuration in SQLite database.

#### Scenario: Profile types

- **WHEN** the system initializes agent profiles
- **THEN** the system SHALL support the following profile types:
  - `soul`: Agent core identity and behavior guidelines
  - `user_context`: User-specific context and background
  - `investment_style`: User's investment style and preferences

#### Scenario: Load profiles on session start

- **WHEN** conversation starts
- **THEN** the system SHALL load all profile types for the user
- **AND** inject into the system prompt for AI context

#### Scenario: Get profile

- **WHEN** `GET /api/memory/profile?type={profileType}` is called
- **THEN** return the profile content for the specified type
- **OR** return null if not found

#### Scenario: Upsert profile

- **WHEN** `PUT /api/memory/profile` is called with profile data
- **THEN** create or update the profile for the user
- **AND** set `updatedAt` timestamp
- **AND** return the updated profile

---

### Requirement: Memory Categories

The system SHALL support the following memory categories: investment_preference, trading_strategy, position_rule, market_view, investment_decision, personal_info.

#### Scenario: Categorize investment preference

- **WHEN** user creates a memory about investment style or risk appetite (e.g., "偏好科技股", "价值投资", "风险承受能力中等")
- **THEN** the system SHALL categorize it as `investment_preference`

#### Scenario: Categorize trading strategy

- **WHEN** user creates a memory about trading approach (e.g., "止损线5%", "分批建仓", "止盈条件")
- **THEN** the system SHALL categorize it as `trading_strategy`

#### Scenario: Categorize position rule

- **WHEN** user creates a memory about position management (e.g., "单一持仓不超过20%", "分散投资")
- **THEN** the system SHALL categorize it as `position_rule`

#### Scenario: Categorize market view

- **WHEN** user creates a memory about market outlook (e.g., "看好AI板块", "谨慎看待高估值股票")
- **THEN** the system SHALL categorize it as `market_view`

#### Scenario: Categorize investment decision

- **WHEN** user creates a memory about specific buy/sell decisions (e.g., "买入 AAPL，理由是...")
- **THEN** the system SHALL categorize it as `investment_decision`

#### Scenario: Categorize personal info

- **WHEN** user creates a memory about personal background (e.g., "5年投资经验", "主要投资美股")
- **THEN** the system SHALL categorize it as `personal_info`

---

### Requirement: Memory API Endpoints

The system SHALL provide REST API endpoints for memory CRUD operations and profile management.

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

#### Scenario: GET /api/memory/profile

- **WHEN** authenticated user makes GET request to `/api/memory/profile?type={profileType}`
- **THEN** return the profile content for the specified type
- **AND** profileType SHALL be one of: `soul`, `user_context`, `investment_style`
- **OR** return null if not found

#### Scenario: PUT /api/memory/profile

- **WHEN** authenticated user sends PUT request with profile data
- **THEN** validate required fields: `profileType`, `content`
- **AND** create or update the profile for the user
- **AND** set `updatedAt` timestamp
- **AND** return the updated profile object

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

#### Scenario: Promote short-term to long-term

- **WHEN** `promoteToLongTerm(userId, category, content, importance)` is called
- **AND** importance >= 7
- **THEN** create long-term memory record in `agent_memories` table
- **AND** set `source` to `agent_extracted`
- **AND** optionally delete the corresponding short-term memory file

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

#### Scenario: Get profile

- **WHEN** `getProfile(userId, profileType)` is called
- **THEN** return the profile content for the specified type
- **OR** return null if not found

#### Scenario: Upsert profile

- **WHEN** `upsertProfile(userId, profileType, content)` is called
- **THEN** create or update the profile
- **AND** return the updated profile

---

### Requirement: Memory Repository Layer

The system SHALL provide a MemoryRepository for memory data access and a ProfileRepository for profile data access.

#### Scenario: MemoryRepository inheritance

- **WHEN** the `MemoryRepository` is created
- **THEN** it SHALL extend `BaseIntRepository`
- **AND** it SHALL provide type-safe CRUD operations for `agent_memories` table

#### Scenario: Find memories by user

- **WHEN** `findByUserId(userId)` is called
- **THEN** return all non-deleted memories for the user
- **AND** order by `importance` DESC, `updatedAt` DESC

#### Scenario: Find memories by user and category

- **WHEN** `findByUserIdAndCategory(userId, category)` is called
- **THEN** return non-deleted memories matching both criteria
- **AND** order by `importance` DESC, `updatedAt` DESC

#### Scenario: ProfileRepository inheritance

- **WHEN** the `ProfileRepository` is created
- **THEN** it SHALL extend `BaseIntRepository`
- **AND** it SHALL provide type-safe CRUD operations for `agent_profiles` table

#### Scenario: Find profile by user and type

- **WHEN** `findByUserIdAndType(userId, profileType)` is called
- **THEN** return the profile for the specified user and type
- **OR** return null if not found

#### Scenario: Upsert profile

- **WHEN** `upsertProfile(userId, profileType, content)` is called
- **THEN** create or update the profile
- **AND** update `updatedAt` timestamp

---

### Requirement: Short-term Memory File Service (User-Level, 3 Days)

The system SHALL provide a service for managing short-term memory markdown files at user level with automatic 3-day cleanup.

#### Scenario: Write short-term memory (user-level)

- **WHEN** `writeShortTermMemory(userId, category, content, importance)` is called
- **THEN** create `{getProjectRoot()}/memory/users/{userId}/{category}.md`
- **AND** include YAML frontmatter (category, source, importance, created_at, updated_at)
- **AND** write markdown content

#### Scenario: Read short-term memories (user-level)

- **WHEN** `readShortTermMemories(userId)` is called
- **THEN** trigger automatic cleanup of expired memories
- **AND** read all markdown files from `{getProjectRoot()}/memory/users/{userId}/`
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

The system SHALL automatically inject identity profiles, short-term and long-term memories into chat context.

#### Scenario: Inject memories on conversation start

- **WHEN** user starts a new conversation or sends a message
- **THEN** load identity profiles from `agent_profiles` table
- **AND** retrieve relevant long-term memories via MemoryService
- **AND** read short-term memory files
- **AND** format memories as context text
- **AND** include in the system prompt for the AI

#### Scenario: Memory context format

- **WHEN** memories are injected into context
- **THEN** format as:
  ```
  ## 关于你的用户

  ### 投资风格画像
  {agent_profiles.investment_style 内容}

  ### 长期记忆（核心偏好）
  - [investment_preference] 偏好科技股投资
  - [position_rule] 单一持仓不超过 20%

  ### 近期会话记忆（最近3天）
  {短期记忆 Markdown 文件内容}
  ```
- **AND** limit to top 10 most important long-term memories
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