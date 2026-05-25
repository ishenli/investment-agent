## ADDED Requirements

### Requirement: Task Creation in Chat Stream Context
The chat-api capability SHALL support returning task-related metadata in the chat stream when an Agent tool creates or updates a task, allowing the frontend to display a contextual "Task Created" confirmation in the chat UI.

#### Scenario: Tool result event is compatible with both LangChain and DeepAgents
- **GIVEN** the system running with either LangChain or DeepAgents.js implementation (controlled by `USE_DEEPAGENTS` feature flag)
- **WHEN** a task-related tool (`task_create`, `task_update`) completes execution during streaming
- **THEN** both implementations emit a `tool_result` SSE event with identical payload shape: `{ toolName, taskId, taskTitle, taskStatus, source: 'task-management' }`
- **AND** the frontend chat stream parser routes this event to the task inline card renderer regardless of backend implementation
- **AND** the event is emitted after the tool's function_call delta (as per existing tool call flow) and before the next text delta

#### Scenario: Frontend displays task card with quick actions
- **GIVEN** the frontend has received a `tool_result` event for `task_create`
- **WHEN** the inline task card is rendered in the chat message
- **THEN** the card displays: task title (truncated), status badge, priority indicator
- **AND** a "View in Tasks" link navigates to `/tasks?id=xyz`
- **AND** the card is styled consistently with the existing tool result display pattern

#### Scenario: Task update confirmation in stream
- **GIVEN** the Agent invokes `task_update` during a chat to mark a task complete
- **WHEN** the tool execution returns the updated task
- **THEN** the stream adapter emits a `tool_result` event for `task_update`
- **AND** the frontend renders a lightweight inline notice: "✓ Task updated: [title] marked as completed"

---

### Requirement: Task Context Awareness in Agent Prompt
The chat-api capability SHALL ensure the Agent's system prompt has awareness of the task system and can recognize when a user is referring to existing tasks, to prevent redundant task creation and improve conversational coherence.

#### Scenario: Agent avoids creating duplicate tasks
- **GIVEN** a task titled "Buy AAPL below $180" already exists in `pending` status
- **WHEN** the user asks "Should I buy AAPL soon?" in chat
- **AND** the Agent is about to suggest buying AAPL below $180
- **THEN** the Agent SHOULD reference the existing task instead of creating a duplicate
- **AND** the Agent's response includes: "You already have a pending task for this — 'Buy AAPL below $180'. Shall I update it?"
