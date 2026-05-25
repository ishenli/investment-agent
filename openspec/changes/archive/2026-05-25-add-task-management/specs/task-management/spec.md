# Capability: Task Management

## ADDED Requirements

### Requirement: Task Data Model
The system SHALL provide a relational `tasks` table that stores user-created and AI-suggested investment tasks with full state tracking, source provenance, and condition support.

#### Scenario: Schema includes all required fields
- **WHEN** inspecting the Drizzle schema definition
- **THEN** it contains `id`, `userId`, `title`, `description`, `status`, `type`, `priority`, `linkedSymbols`, `triggerPrice`, `triggerDirection`, `triggerExecutedAt`, `dueDate`, `completedAt`, `executionNotes`, `sourceType`, `sourceId`, `createdAt`, `updatedAt`, `deletedAt`

#### Scenario: Soft delete and indexing
- **WHEN** a task is deleted via API
- **THEN** the record is retained with `deletedAt` populated, and physical deletion is prohibited
- **AND** queries automatically exclude soft-deleted rows via WHERE `deletedAt IS NULL`
- **AND** indexes `idx_tasks_user_id`, `idx_tasks_user_status`, `idx_tasks_due_date`, and `idx_tasks_deleted_at` exist for query performance

---

### Requirement: Task CRUD API
The system SHALL expose a REST API under `/api/tasks` supporting full CRUD operations with authentication and input validation.

#### Scenario: Create a task
- **WHEN** an authenticated user POSTs to `/api/tasks` with `title`, `type`, `priority`, and optional `dueDate`, `linkedSymbols`, `description`, `triggerPrice`, `triggerDirection`
- **THEN** a new task is persisted with `status = 'pending'` and `userId = currentUser.id`
- **AND** the response returns the created task object with `201`

#### Scenario: List tasks with filtering
- **WHEN** an authenticated user GETs `/api/tasks?status=pending&priority=high&search=apple&limit=20&offset=0`
- **THEN** only tasks matching the filter criteria are returned
- **AND** the response includes total count for pagination

#### Scenario: Update task status
- **WHEN** an authenticated user PATCHes `/api/tasks/:id/status` with `{ "status": "in_progress" }`
- **THEN** the task status is updated and `updatedAt` is refreshed
- **AND** the response returns the updated task

#### Scenario: Update a completed task with execution notes
- **WHEN** an authenticated user updates a task to `status = 'completed'` via PUT `/api/tasks/:id`
- **AND** the payload includes `executionNotes`
- **THEN** `completedAt` is set to the current timestamp and `executionNotes` is persisted

#### Scenario: Soft delete a task
- **WHEN** an authenticated user DELETEs `/api/tasks/:id`
- **THEN** the task's `deletedAt` is set and the record is excluded from subsequent queries

#### Scenario: Unauthorized access
- **WHEN** an unauthenticated user calls any Task API endpoint
- **THEN** the API returns `401 Unauthorized`

#### Scenario: Cross-user isolation
- **WHEN** user A attempts to GET/PUT/DELETE a task belonging to user B
- **THEN** the API returns `404 Not Found` (not 403) to prevent ID enumeration

---

### Requirement: Task Status Lifecycle
The system SHALL enforce a well-defined task status lifecycle with automatic expiration.

#### Scenario: Valid transitions
- **GIVEN** a task in `pending` state
- **WHEN** the user moves it to `in_progress`
- **THEN** the transition succeeds
- **GIVEN** a task in `in_progress`
- **WHEN** the user moves it to `completed`
- **THEN** the transition succeeds and `completedAt` is recorded

#### Scenario: Invalid transitions
- **GIVEN** a task in `completed` state
- **WHEN** the user attempts to move it back to `pending`
- **THEN** the system returns `400 Bad Request` with message "Invalid status transition"

#### Scenario: Full status transition matrix
- **GIVEN** the following state transition rules:
  - `pending` → `in_progress` (✅ 允许)
  - `pending` → `cancelled` (✅ 允许)
  - `pending` → `expired` (✅ 仅系统自动触发)
  - `in_progress` → `completed` (✅ 允许)
  - `in_progress` → `cancelled` (✅ 允许)
  - `in_progress` → `expired` (✅ 仅系统自动触发)
  - `completed` → `pending` (❌ 禁止)
  - `completed` → `cancelled` (❌ 禁止)
  - `completed` → `in_progress` (❌ 禁止)
  - `cancelled` → `pending` (✅ 允许，重新激活任务)
  - `cancelled` → `in_progress` (✅ 允许，跳过 pending 直接执行)
  - `cancelled` → `completed` (❌ 禁止)
  - `expired` → any (❌ 禁止，过期任务视为终态)
- **WHEN** any transition request is submitted that violates these rules
- **THEN** the system returns `400 Bad Request` with message "Invalid status transition from {from} to {to}"

#### Scenario: Automatic expiration via scheduled-tasks
- **GIVEN** a task with `status = 'pending'` and `dueDate < CURRENT_DATE`
- **WHEN** the system's scheduled task executor runs (reusing the existing `scheduled-tasks` capability, e.g., daily at 00:00 UTC)
- **THEN** the task status is automatically updated to `expired`
- **AND** the `updatedAt` timestamp is refreshed
- **AND** no user-initiated transition is required

#### Scenario: Expired state is terminal
- **GIVEN** a task with `status = 'expired'`
- **WHEN** the user attempts to transition it to `pending`
- **THEN** the system returns `400 Bad Request` with message "Expired tasks cannot be modified"
- **WHEN** the user attempts to set it to `cancelled`
- **THEN** the same error is returned

---

### Requirement: Task Types and Conditions
The system SHALL support multiple task types, with Phase 1 delivering `one_time`, `date_driven`, and `monitoring`, reserving `price_trigger` infrastructure for Phase 2.

#### Scenario: One-time task
- **WHEN** a user creates a task with `type = 'one_time'`
- **THEN** the task appears in the task list with no special condition rendering

#### Scenario: Date-driven task
- **WHEN** a user creates a task with `type = 'date_driven'` and a `dueDate`
- **THEN** the task displays the due date prominently and expires automatically when past due

#### Scenario: Price trigger task (Phase 2)
- **WHEN** a user creates a task with `type = 'price_trigger'`, `triggerPrice`, `triggerDirection`, and `linkedSymbols`
- **THEN** the task displays the trigger condition (e.g., "When AAPL < $200, execute buy")
- **AND** Phase 2 background monitoring evaluates the condition periodically

#### Scenario: Input validation failure
- **WHEN** an authenticated user POSTs to `/api/tasks` with a `title` exceeding 200 characters
- **THEN** the API returns `400 Bad Request` with field-level error `{ "title": "Title must not exceed 200 characters" }`
- **WHEN** a required field `title` is missing
- **THEN** the API returns `400 Bad Request` with `{ "title": "Title is required" }`
- **WHEN** `status` contains an invalid value (e.g., `"deleted"`)
- **THEN** the API returns `400 Bad Request` with `{ "status": "Invalid status value" }`

#### Scenario: Pagination boundary
- **WHEN** a user requests `GET /api/tasks?offset=999&limit=20` but only 5 total tasks exist
- **THEN** the response returns an empty `data` array
- **AND** `total` is `5`
- **AND** HTTP status is `200` (not an error)

---

### Requirement: Task Frontend - Board and List Views
The system SHALL provide a dedicated `/tasks` page with both Kanban board and list views, allowing users to manage tasks intuitively.

#### Scenario: Kanban view displays columns by status
- **WHEN** a user navigates to `/tasks` and the active tab is "Board"
- **THEN** the page shows columns for Pending, In Progress, Completed, and Cancelled
- **AND** each column displays the count of tasks in that status
- **AND** tasks are rendered as cards with title, priority badge, and due date

#### Scenario: List view with search and sort
- **WHEN** the user switches to "List" tab
- **THEN** tasks are displayed in a table with columns: Status, Title, Linked Symbols, Priority, Due Date, Actions
- **AND** clicking a column header sorts by that field

#### Scenario: Search tasks
- **WHEN** the user types "apple" in the search box
- **THEN** the task list (in both Board and List views) filters to show only tasks whose title or description contains "apple"

#### Scenario: Filter by status badge
- **WHEN** the user clicks the "Pending" status badge in the filter bar
- **THEN** only pending tasks are shown
- **AND** multiple status badges can be selected simultaneously

#### Scenario: Create task from UI
- **WHEN** the user clicks "New Task" in the task page
- **THEN** a modal opens with a form for title, description, type, priority, due date, linked symbols, and trigger condition
- **AND** submitting the form creates the task and refreshes the board/list

#### Scenario: Edit and delete task
- **WHEN** the user clicks a task card or row
- **THEN** a detail drawer/modal opens showing all fields and editable form controls
- **AND** the user can update fields or delete the task

---

### Requirement: Agent Tool Integration
The system SHALL expose three new business tools allowing the AI Agent to create, list, and update tasks during conversations.

#### Scenario: Agent suggests creating a task
- **GIVEN** an ongoing chat where the Agent has recommended "Consider buying NVDA if it drops below $120"
- **WHEN** the Agent calls `task_create` with the suggestion as title, type `price_trigger`, and linkedSymbol `"NVDA"`
- **THEN** the task is persisted to the database
- **AND** the Agent's response includes a confirmation like "I've created a task to track this. Would you like to add a trigger price?"

#### Scenario: Agent queries user's tasks during chat
- **GIVEN** a user asks "What tasks do I have pending for next week?"
- **WHEN** the Agent calls `task_list` with filters `status = 'pending'` and date range
- **THEN** the Agent receives the matching tasks and summarizes them in natural language

#### Scenario: Agent marks task as completed on user's behalf
- **GIVEN** the user says "I already executed the AAPL buy task"
- **WHEN** the Agent calls `task_update` with `status = 'completed'` and `executionNotes` from the user's context
- **THEN** the task is marked complete with a timestamp

#### Scenario: Tool security - user isolation
- **WHEN** the Agent tool `task_create` is invoked
- **THEN** the `userId` is derived from the current session/chat context, NOT from user input
