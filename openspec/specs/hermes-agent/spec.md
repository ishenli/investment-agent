# Hermes Agent Specification

## Purpose

Hermes Agent is a TypeScript/Node.js implementation of an AI agent with tool-calling capabilities, supporting memory management, skill creation, and background reflection.
## Requirements
### Requirement: Agent Run Loop

The agent MUST execute a tool-calling loop that:
1. Calls the LLM with messages and available tools
2. Executes any tool calls returned by the LLM
3. Adds tool results to the conversation context
4. Repeats until the LLM returns a final response or iteration budget is exhausted

#### Scenario: Successful tool execution
- **GIVEN** the agent has tools registered
- **WHEN** the LLM returns tool calls
- **THEN** each tool MUST be executed with the provided arguments
- **AND** the tool results MUST be appended to the conversation

#### Scenario: Iteration budget exhausted
- **GIVEN** maxIterations is set to N
- **WHEN** the loop reaches N iterations without a final response
- **THEN** the agent MUST return with completed=false and an error message

### Requirement: Memory Management

The agent MUST support persistent memory via MemoryManager:
- Prefetch relevant memories before each turn
- Sync new learnings after each turn
- Build a memory context block for the system prompt

#### Scenario: Memory prefetch before turn
- **GIVEN** a MemoryManager is configured
- **WHEN** a new user turn starts
- **THEN** the agent MUST prefetch relevant memories
- **AND** inject them as a memory-context block

#### Scenario: Memory sync after turn
- **GIVEN** a MemoryManager is configured
- **WHEN** a turn completes successfully
- **THEN** the agent MUST sync learnings to persistent storage

### Requirement: Background Reflection Review

The agent MUST support asynchronous background reflection review that runs independently from the main conversation turn.

#### Scenario: Background review spawns after turn completes
- **WHEN** a conversation turn completes successfully (not interrupted, has final response)
- **AND** the reflection trigger conditions are met (turn count or iteration count thresholds)
- **THEN** the agent MUST spawn a background thread to perform reflection review
- **AND** the main response MUST return immediately without waiting for reflection to complete

#### Scenario: Background review uses isolated message snapshot
- **WHEN** a background review is spawned
- **THEN** it MUST operate on a copy of the conversation messages
- **AND** it MUST NOT modify the main session's conversation history
- **AND** any memory or skill updates MUST be written to shared stores

#### Scenario: Background review trigger by turn count
- **GIVEN** `reflectionConfig.turnNudgeInterval` is set to a positive integer N
- **WHEN** the user turn count is a multiple of N
- **THEN** background memory review MUST be triggered

#### Scenario: Background review trigger by iteration count
- **GIVEN** `reflectionConfig.iterationNudgeInterval` is set to a positive integer M
- **WHEN** the tool-calling iterations in a turn reach or exceed M
- **THEN** background skill review MUST be triggered

#### Scenario: Background review failure isolation
- **WHEN** the background review encounters an error
- **THEN** the error MUST be logged but MUST NOT affect the main conversation
- **AND** the error MUST be reported via `onBackgroundReviewComplete` callback if provided

#### Scenario: Background review completion callback
- **GIVEN** `callbacks.onBackgroundReviewComplete` is defined
- **WHEN** a background review completes (success or failure)
- **THEN** the callback MUST be invoked with the review result summary

### Requirement: Reflection Configuration

The `ReflectionConfig` interface MUST support both sync and async reflection modes:

#### Scenario: Enable background review mode (default)
- **GIVEN** `reflectionConfig.enabled` is true
- **AND** `reflectionConfig.backgroundMode` is true or undefined
- **THEN** reflection MUST run asynchronously in a background thread
- **AND** the main conversation MUST NOT be blocked

#### Scenario: Disable background review (synchronous mode)
- **GIVEN** `reflectionConfig.enabled` is true
- **AND** `reflectionConfig.backgroundMode` is explicitly false
- **THEN** reflection MUST run synchronously (blocking mode)
- **AND** the main response MUST wait for reflection to complete

### Requirement: Reflection Callbacks

The `AgentCallbacks` interface MUST support background review lifecycle callbacks:

#### Scenario: Review start notification
- **GIVEN** `callbacks.onBackgroundReviewStart` is defined
- **WHEN** a background review thread starts
- **THEN** the callback MUST be invoked with the trigger type

#### Scenario: Review complete notification
- **GIVEN** `callbacks.onBackgroundReviewComplete` is defined
- **WHEN** a background review thread completes
- **THEN** the callback MUST be invoked with the review summary

### Requirement: Observability

The agent MUST support optional observability tracing:
- Trace spans for LLM calls and tool executions
- Token counting and cost estimation
- Export to configurable sinks (file, console, remote)

#### Scenario: Tracing enabled
- **GIVEN** observability configuration is provided
- **WHEN** the agent runs
- **THEN** trace spans MUST be created for each LLM call
- **AND** tool executions MUST be tracked with duration

#### Scenario: Cost tracking
- **GIVEN** pricing configuration is provided
- **WHEN** the agent completes
- **THEN** the result MUST include estimated costs

### Requirement: Hermes Runtime Memory Asset Visibility
The system SHALL expose Hermes Agent file-backed memory assets for authenticated users through Agent Settings.

#### Scenario: List Hermes memory assets
- **WHEN** the Agent Settings runtime assets panel requests Hermes assets
- **THEN** the system SHALL list Hermes `MEMORY.md` and `USER.md` assets from the configured Hermes memory directory
- **AND** missing files SHALL be represented as creatable empty Markdown documents
- **AND** the listed assets SHALL include read-only and existence metadata

#### Scenario: Read Hermes memory asset content
- **WHEN** the user selects Hermes `MEMORY.md` or `USER.md`
- **THEN** the system SHALL read the same file content used by Hermes Agent's file-backed memory provider
- **AND** the content SHALL be returned as UTF-8 Markdown text

### Requirement: Hermes Runtime Memory Asset Editing
The system SHALL allow supported Hermes file-backed memory assets to be edited safely from Agent Settings.

#### Scenario: Save Hermes memory content
- **WHEN** a user edits Hermes `MEMORY.md` or `USER.md` from Agent Settings and saves
- **THEN** the system SHALL write the content to the configured Hermes memory directory
- **AND** future Hermes Agent turns SHALL read the updated memory content
- **AND** the save SHALL preserve the memory store's delimiter-compatible plain text format

#### Scenario: Enforce Hermes memory limits
- **WHEN** a Hermes memory asset save exceeds the configured memory size limit
- **THEN** the system SHALL reject the save
- **AND** no memory file SHALL be modified
- **AND** the UI SHALL display the configured limit in the error message

#### Scenario: Prevent Hermes memory directory escape
- **WHEN** resolving a Hermes memory asset
- **THEN** the final resolved path SHALL remain inside the configured Hermes memory directory
- **AND** path traversal input SHALL be rejected before file access

