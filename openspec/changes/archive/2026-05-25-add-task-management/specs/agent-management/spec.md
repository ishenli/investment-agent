## ADDED Requirements

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
