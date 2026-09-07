## REMOVED Requirements

### Requirement: DeepAgents.js Support
**Reason**: DeepAgents 引擎整体移除，基于 `deepagents` npm 的 investmentAdvisorAgent 不再维护，投资顾问能力由 Hermes/Claude 统一引擎替代。
**Migration**: `/api/chat/agent` 路由下线；投资顾问会话默认路由到 `hermes` 引擎。已废弃的 `USE_DEEPAGENTS` 功能标志不再生效。

### Requirement: Task Planning & Decomposition
**Reason**: 该能力由 DeepAgents.js 提供，随引擎移除，不再作为独立的 chat-api 需求。
**Migration**: 复杂多步任务的规划与分解由 Hermes 的多工具编排/反射与 Claude Agent SDK 的 agent loop 覆盖。

### Requirement: DeepAgents.js Streaming
**Reason**: 随 DeepAgents.js 移除，SSE 流式由统一 `EngineEventSink` 经 hermes/claude 引擎提供。
**Migration**: 流式事件一律经由 `runEngine` + `EngineEventSink`（`sendTextDelta` / `sendToolUseEvent` / `sendResult`）。

### Requirement: Architecture Simplification
**Reason**: 该需求描述的「迁移到 DeepAgents.js」方向已被推翻（改为移除 DeepAgents），其目标通过删除整个 langchain 子系统达成。
**Migration**: InvestmentAdvisorGraph 与 server 端 `chatService` 的 langgraph 图随 `src/server/core/agents/langchain/` 子树一并删除。

---

## MODIFIED Requirements

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

## ADDED Requirements

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