# chat-api Specification

## Purpose
管理投资顾问聊天 API，支持通过 LangChain 或 DeepAgents.js 实现，提供流式 AI 响应。
## Requirements
### Requirement: Investment Advisor Chat Endpoint
系统 MUST 提供投资顾问聊天能力，通过统一 Agent 引擎（默认 Hermes，可选 Claude）以 SSE 流式返回 AI 响应。

#### Scenario: 投资顾问基础对话
- **GIVEN** 用户已登录并有有效账户
- **WHEN** 用户发送聊天消息
- **THEN** 系统必须（MUST）验证用户身份并获取当前用户 ID
- **THEN** 系统必须（MUST）将消息转换为统一的 `EngineMessage` 格式
- **THEN** 系统必须（MUST）通过 `runEngine` 调用统一引擎（默认 `hermes`）
- **THEN** 系统必须（MUST）通过 SSE 流式返回响应
- **THEN** 返回的格式必须是 AI SDK 兼容的 UIMessageChunk 格式（**与实现方式无关**）

#### Scenario: 投资顾问流式响应
- **GIVEN** 用户发起投资顾问对话请求
- **WHEN** 引擎开始处理
- **THEN** 系统必须（MUST）发送 `text-start` 事件标识响应开始
- **THEN** 系统必须（MUST）流式发送消息块（chunks）
- **THEN** 系统必须（MUST）将引擎 `text` 增量事件转换并发送为目标格式
- **THEN** 系统必须（MUST）在结束时发送 `text-end` 事件
- **THEN** 系统必须（MUST）关闭 SSE 连接

---

### Requirement: Chat Service Integration
系统 MUST 通过统一的引擎抽象提供聊天服务，根据配置的 `engineType`（`hermes` 或 `claude`）路由到对应引擎，缺省回退到 `hermes`。

#### Scenario: 默认引擎调用
- **GIVEN** 会话 `engineType` 为 `hermes` 或未配置
- **WHEN** 用户发送消息
- **THEN** 系统必须（MUST）调用 `runEngine('hermes', ...)`
- **THEN** 系统必须（MUST）接受统一 `EngineMessage` 输入
- **THEN** 系统必须（MUST）返回统一的 SSE 输出格式

#### Scenario: Claude 引擎调用
- **GIVEN** 会话 `engineType` 为 `claude`
- **WHEN** 用户发送消息
- **THEN** 系统必须（MUST）调用 `runEngine('claude', ...)`

#### Scenario: 简化 chatService
- **GIVEN** 移除 langchain/DeepAgents 之后
- **WHEN** 调用聊天服务
- **THEN** 系统不得（MUST NOT）创建 Graph 实例或管理 Graph 状态
- **THEN** 调用代码必须（MUST）简化为 `runEngine` 单一入口

---

### Requirement: Skills Context Injection into Claude SDK systemPrompt
The system SHALL inject enabled Skills prompt content into the `systemPrompt` field of `streamClaude()` when processing requests via the `/api/chat/claude` endpoint, so that the Claude Agent SDK subprocess receives skill guidance as part of its system context.

#### Scenario: Global skills injected by default
- **GIVEN** a user has one or more skills with `isEnabled = true`
- **WHEN** a POST request is made to `/api/chat/claude` without a `skills` field
- **THEN** the system MUST call `skillService.getEnabledSkills(userId)` to fetch all enabled skills
- **AND** build a `skillsSystemPrompt` string by concatenating each skill's prompt under a `## Skill: <name>` heading
- **AND** pass the combined system prompt to `streamClaude()` as `systemPrompt`
- **AND** skills with empty prompt content MUST be excluded from the concatenation

#### Scenario: Session-level skills filter
- **GIVEN** a POST request to `/api/chat/claude` contains `skills: ["lobe-artifacts"]`
- **WHEN** the system builds the skills system prompt
- **THEN** it MUST filter the globally enabled skills to only those whose `slug` is in the `skills` array
- **AND** only the matching skills' prompts MUST be injected into `systemPrompt`
- **AND** other globally enabled skills MUST NOT be injected in this request

#### Scenario: Empty skills array disables session-level filter
- **GIVEN** a POST request to `/api/chat/claude` contains `skills: []`
- **WHEN** the system builds the skills system prompt
- **THEN** all globally enabled skills MUST be injected (empty array means "no restriction")

#### Scenario: No enabled skills results in no skills injection
- **GIVEN** a user has no enabled skills OR all enabled skills have empty prompts
- **WHEN** a POST request is made to `/api/chat/claude`
- **THEN** `skillsSystemPrompt` MUST be empty or undefined
- **AND** `streamClaude()` MUST be called with `systemPrompt: undefined` (or only the mode override if present)

#### Scenario: Mode override and skills prompts are combined
- **GIVEN** the request mode is `'ask'` (which sets a `systemPromptOverride`) AND skills are enabled
- **WHEN** the system builds the final system prompt
- **THEN** `systemPromptOverride` and `skillsSystemPrompt` MUST both be included, joined with `\n\n`
- **AND** the order MUST be: mode override first, then skills prompts

---

### Requirement: Claude SDK Chat Session-Level Skill Activation
The system SHALL support an optional `skills` field in the Claude SDK chat request body that allows callers to specify which skill slugs should be activated for the current session, overriding the default behaviour of using all globally enabled skills.

#### Scenario: Request schema accepts skills field
- **WHEN** a POST request is sent to `/api/chat/claude` with `skills: ["slug1", "slug2"]`
- **THEN** the request MUST pass schema validation
- **AND** the `skills` field MUST be treated as an array of skill slugs to activate

#### Scenario: Request without skills field uses global defaults
- **WHEN** a POST request is sent to `/api/chat/claude` without a `skills` field
- **THEN** the `skills` field MUST default to `undefined`
- **AND** all globally enabled skills for the user MUST be used

### Requirement: Task Creation in Chat Stream Context
The chat-api capability SHALL support returning task-related metadata in the chat stream when an Agent tool creates or updates a task, allowing the frontend to display a contextual "Task Created" confirmation in the chat UI.

#### Scenario: Tool result event is emitted by the unified engine
- **GIVEN** the system running with the unified agent engine (hermes or claude)
- **WHEN** a task-related tool (`task_create`, `task_update`) completes execution during streaming
- **THEN** the engine emits a `tool_result` SSE event with identical payload shape: `{ toolName, taskId, taskTitle, taskStatus, source: 'task-management' }`
- **AND** the frontend chat stream parser routes this event to the task inline card renderer regardless of backend engine
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

### Requirement: Chat Stream UI Artifact Events
The chat API SHALL support streaming generated UI artifact events alongside normal text deltas, allowing the frontend to update `content` and `uiArtifacts` on the same assistant message.

#### Scenario: Agent emits artifact during assistant response
- **GIVEN** the agent is streaming an assistant response
- **WHEN** a controlled UI artifact tool produces a valid `UIArtifact`
- **THEN** the stream MUST emit an artifact event that includes the target message id and artifact payload
- **AND** the frontend stream parser MUST append or update the artifact in the assistant message `uiArtifacts`
- **AND** text streaming MUST continue independently of the artifact event

#### Scenario: Artifact event fails validation server-side
- **GIVEN** the agent attempts to emit a UI artifact
- **WHEN** the artifact fails server-side schema validation
- **THEN** the API MUST NOT stream the invalid artifact to the client
- **AND** the API MUST continue the text response when possible
- **AND** the API SHOULD include safe fallback text in the assistant `content`

### Requirement: Controlled UI Artifact Creation Tool
The chat agent layer SHALL expose controlled artifact creation through a business tool rather than allowing the model to freely construct arbitrary UI payloads.

#### Scenario: Tool creates stock quote card artifact
- **GIVEN** a user asks for a stock quote and market data tools return structured quote data
- **WHEN** the agent decides a richer UI is useful
- **THEN** it MUST call a controlled artifact creation tool with `type: "stock_quote_card"`, validated props, and `fallbackText`
- **AND** the tool MUST return a normalized `UIArtifact`
- **AND** the stream layer MUST expose that artifact through a UI artifact event

#### Scenario: Text-only answer remains allowed
- **GIVEN** the user asks a normal conversational question
- **WHEN** no registered UI artifact adds value
- **THEN** the agent MAY return only text
- **AND** the API MUST NOT require an artifact event

### Requirement: Explicit Skill Request Protocol
The chat API SHALL accept an optional `explicitSkill` slug for Claude and Hermes chat requests, representing the single skill explicitly invoked for the current user message.

#### Scenario: Claude request accepts explicit skill
- **GIVEN** the frontend sends a POST request to `/api/chat/claude`
- **WHEN** the request body includes `explicitSkill: "code-review"`
- **THEN** the request MUST pass schema validation when the value is a non-empty skill slug string
- **AND** the controller MUST treat `explicitSkill` as a single-message instruction
- **AND** the existing optional `skills` array MUST continue to represent implicit session-level skill activation

#### Scenario: Hermes request accepts explicit skill
- **GIVEN** the frontend sends a POST request to `/api/chat/hermes`
- **WHEN** the request body includes `explicitSkill: "code-review"`
- **THEN** the request MUST pass schema validation when the Hermes engine supports skill prompts
- **AND** the request MUST pass the slug to the Hermes engine context using the existing engine `extra` mechanism or an equivalent typed parameter
- **AND** the absence of `explicitSkill` MUST preserve current Hermes behavior

#### Scenario: Frontend stream parameters include explicit skill
- **GIVEN** the user selected a pending explicit skill in the chat input
- **WHEN** `createAssistantMessageStream` is called
- **THEN** its params MUST include `explicitSkill` with the selected skill slug
- **AND** `bailingLLMStream` MUST forward `explicitSkill` to Claude or Hermes endpoints
- **AND** DeepAgents requests MUST NOT receive `explicitSkill`

#### Scenario: Backward-compatible omission
- **GIVEN** no explicit skill is selected
- **WHEN** the user sends a chat message
- **THEN** the request body MUST omit `explicitSkill` or set it to `undefined`
- **AND** all existing implicit skill injection, mode handling, permission handling, and streaming behavior MUST remain unchanged

### Requirement: Explicit Skill Prompt Precedence
The chat API SHALL give an explicitly invoked skill higher prompt precedence than implicitly enabled skills while keeping both mechanisms compatible.

#### Scenario: Explicit skill prompt injected first
- **GIVEN** the request includes `explicitSkill: "code-review"`
- **AND** the authenticated user can access a skill with slug `code-review`
- **WHEN** the server builds the final system prompt
- **THEN** the prompt for `code-review` MUST be injected before the implicit skills prompt block
- **AND** the injected block MUST clearly identify the skill as explicitly invoked
- **AND** the model instructions MUST communicate that this skill applies to the current user message

#### Scenario: Explicit skill may be outside implicit session filter
- **GIVEN** the request includes `skills: ["lobe-artifacts"]`
- **AND** the request also includes `explicitSkill: "code-review"`
- **WHEN** the server resolves skills
- **THEN** the implicit skills block MUST be filtered by the `skills` array
- **AND** the explicit skill MUST be resolved independently from the `skills` array
- **AND** the explicit skill prompt MUST still be injected if the user can access it

#### Scenario: Duplicate explicit and implicit skill
- **GIVEN** the request includes `explicitSkill: "code-review"`
- **AND** `code-review` also appears in the implicit enabled skills set
- **WHEN** the server builds the final system prompt
- **THEN** the explicit skill prompt MUST be injected only once in the explicit block
- **AND** the implicit skills block MUST NOT duplicate the same full prompt content
- **AND** the implicit skills summary MAY still mention the skill as available if it does not duplicate the prompt body

#### Scenario: Unknown explicit skill
- **GIVEN** the request includes `explicitSkill` with a slug that cannot be resolved for the authenticated user
- **WHEN** the server validates or resolves the skill
- **THEN** the server MUST reject the request with a client error
- **AND** the response MUST NOT fall back to silently ignoring the requested explicit skill
- **AND** no assistant response stream MUST be started

#### Scenario: Empty prompt explicit skill
- **GIVEN** the request includes an accessible explicit skill whose prompt is empty
- **WHEN** the server builds the final system prompt
- **THEN** the server MUST reject the request with a client error explaining that the selected skill has no prompt content
- **AND** no assistant response stream MUST be started

### Requirement: Explicit Skill Observability
The chat API SHALL make explicit skill invocation observable without exposing sensitive prompt content.

#### Scenario: Log explicit skill metadata
- **GIVEN** a request includes `explicitSkill`
- **WHEN** the server starts processing the request
- **THEN** logs SHOULD include the explicit skill slug, session id, engine type, and user id
- **AND** logs MUST NOT include the full skill prompt content

#### Scenario: Prompt debug records preserve precedence
- **GIVEN** prompt recording is enabled for debugging
- **WHEN** a request includes `explicitSkill`
- **THEN** the recorded prompt SHOULD show the explicit skill block before implicit skills
- **AND** the record SHOULD make the single-message scope clear

### Requirement: Default Agent Engine Routing
The chat service SHALL default to the `hermes` engine and MUST NOT route to the removed `deepagents` engine.

#### Scenario: Missing engineType falls back to hermes
- **GIVEN** a chat request without an explicit `engineType`
- **WHEN** the chat service selects an engine
- **THEN** the service MUST use `hermes`
- **AND** MUST NOT use `deepagents`

#### Scenario: Unknown engineType falls back to hermes
- **GIVEN** a chat request with an `engineType` value other than `hermes` or `claude`
- **WHEN** the chat service selects an engine
- **THEN** the service MUST fall back to `hermes`

#### Scenario: Persisted deepagents config is treated as hermes
- **GIVEN** an existing chat session persisted with `engineType: 'deepagents'`
- **WHEN** the session is loaded
- **THEN** the session MUST be treated as `hermes`
- **AND** the `deepagents` value MUST NOT reach engine selection or the wire

#### Scenario: Engine picker exposes only claude and hermes
- **GIVEN** a user opens the chat engine selector
- **THEN** the selector MUST list only `hermes` and `claude`
- **AND** `deepagents` MUST NOT be present

