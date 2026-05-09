# Hermes Observability Specification

## ADDED Requirements

### Requirement: Observability Configuration

The Hermes Agent SHALL support optional observability configuration for tracking execution, metrics, and costs.

#### Scenario: Enable observability

- **WHEN** a user creates a `HermesAgent` with `observability` config
- **THEN** the agent SHALL initialize the observability system with the specified sinks and callbacks
- **AND** traces and metrics SHALL be emitted to all configured sinks and callbacks

#### Scenario: Disable observability

- **WHEN** a user creates a `HermesAgent` without `observability` config
- **THEN** the agent SHALL operate without any observability overhead
- **AND** no spans, metrics, or traces SHALL be created

#### Scenario: Multiple sinks

- **WHEN** a user configures multiple sinks (e.g., console + file)
- **THEN** observability events SHALL be sent to all sinks in parallel
- **AND** failure in one sink SHALL NOT affect other sinks or agent execution

#### Scenario: Callbacks for external persistence

- **WHEN** a user configures observability callbacks (`onTraceEnd`, `onMetric`, etc.)
- **THEN** the agent SHALL invoke callbacks with trace/metric data
- **AND** the consumer (e.g., main project) SHALL be responsible for persisting the data
- **AND** callback invocation SHALL use fire-and-forget semantics — failures in consumer-side persistence MUST NOT block or interrupt agent execution

---

### Requirement: Trace and Span Management

The observability system SHALL provide hierarchical tracing for agent execution.

#### Scenario: Trace lifecycle

- **WHEN** `agent.run()` is called
- **THEN** a new trace SHALL be created with a unique `traceId`
- **AND** the trace SHALL capture start time, agent name, and initial context

#### Scenario: LLM call spans

- **WHEN** the agent makes an LLM API call
- **THEN** a span with `name: 'llm_call'` SHALL be created
- **AND** the span SHALL record model name, input tokens, output tokens, latency, and cost

#### Scenario: Tool call spans

- **WHEN** the agent executes a tool
- **THEN** a span with `name: 'tool_call'` SHALL be created
- **AND** the span SHALL record tool name, arguments summary, duration, and status

#### Scenario: Context compression events

- **WHEN** the context compressor triggers compression
- **THEN** an event SHALL be recorded in the current trace
- **AND** the event SHALL include token count before/after compression

---

### Requirement: Metrics Collection

The observability system SHALL collect quantitative metrics during agent execution.

#### Scenario: Token metrics

- **WHEN** an LLM response includes usage information
- **THEN** the system SHALL record input tokens, output tokens, cached tokens, and reasoning tokens
- **AND** cumulative totals SHALL be maintained per trace

#### Scenario: Latency metrics

- **WHEN** LLM calls or tool calls complete
- **THEN** the system SHALL record their duration
- **AND** latency breakdowns SHALL be available (LLM time vs tool time)

#### Scenario: Budget tracking

- **WHEN** iterations are consumed in the agent loop
- **THEN** the system SHALL track iteration count against the budget
- **AND** budget exhaustion SHALL be reflected in final metrics

---

### Requirement: Cost Tracking

The observability system SHALL calculate and track API costs based on token usage and an externally provided pricing table.

#### Scenario: External pricing injection

- **WHEN** an LLM call completes with a known model name
- **THEN** the cost SHALL be calculated using the pricing table provided via `ObservabilityConfig.pricing`
- **AND** costs SHALL be accumulated per trace

#### Scenario: Custom pricing

- **WHEN** a user provides a custom pricing configuration
- **THEN** the custom prices SHALL be used for the specified models
- **AND** unconfigured models SHALL use a zero-cost fallback or user-defined default

#### Scenario: Cost summary

- **WHEN** a trace completes
- **THEN** the system SHALL provide a cost summary with input cost, output cost, and total cost
- **AND** costs SHALL be denominated in USD

---

### Requirement: Structured Logging

The observability system SHALL support structured JSON logging to console and file.

#### Scenario: JSON Lines format

- **WHEN** an observability event is emitted
- **THEN** the event SHALL be serialized as a single JSON line
- **AND** each line SHALL include timestamp, level, traceId, spanId, and event-specific fields

#### Scenario: Log level filtering

- **WHEN** a minimum log level is configured (e.g., 'warn')
- **THEN** only events at or above the configured level SHALL be emitted
- **AND** debug and info events SHALL be suppressed

#### Scenario: File output

- **WHEN** a file sink is configured
- **THEN** logs SHALL be appended to the specified file
- **AND** the file SHALL use UTF-8 encoding with newline-delimited JSON

#### Scenario: Console output

- **WHEN** a console sink is configured with color mode
- **THEN** logs SHALL be formatted with ANSI colors for readability
- **AND** the format SHALL distinguish between trace/span/event types

---

### Requirement: Agent Integration

The Hermes Agent SHALL provide hooks for observability without breaking existing APIs.

#### Scenario: Callbacks extension

- **WHEN** observability is enabled
- **THEN** `AgentCallbacks` SHALL be extended with `onTraceStart`, `onSpanStart`, `onSpanEnd`, `onTraceEnd`
- **AND** existing callbacks (`onToolStart`, `onToolEnd`, etc.) SHALL remain compatible

#### Scenario: Result enrichment

- **WHEN** an agent run completes with observability enabled
- **THEN** the `HermesAgentResult` SHALL include an optional `observability` field
- **AND** the field SHALL contain trace summary with metrics and cost breakdown

#### Scenario: Engine result propagation

- **WHEN** an engine produces an observability-enriched result
- **THEN** the `EngineRunResult` type SHALL also include an optional `observability` field
- **AND** the engine runner SHALL propagate the observability data from the engine back to the caller
- **AND** the SSE result event emitted via `sendResult` SHALL include token usage and cost data

#### Scenario: Error resilience

- **WHEN** an observability sink or callback throws an error
- **THEN** the error SHALL be caught and logged
- **AND** the agent execution SHALL continue without interruption

---

### Requirement: Database Persistence

The main project SHALL persist trace data to the database for historical queries and UI visualization, receiving data via callbacks from `hermes-agent`.

#### Scenario: Store trace on completion

- **WHEN** an agent run completes and `onTraceEnd` callback is invoked
- **THEN** the main project service SHALL persist the trace data to the `chat_traces` table
- **AND** the trace SHALL be associated with the session and topic

#### Scenario: Store spans

- **WHEN** a trace is persisted
- **THEN** all spans SHALL be stored in the `chat_spans` table
- **AND** each span SHALL reference its parent span and trace

#### Scenario: Query traces by session

- **WHEN** a user requests traces for a session
- **THEN** the system SHALL return all traces ordered by creation time descending
- **AND** each trace SHALL include summary metrics

---

### Requirement: Real-time Streaming

The observability system SHALL support real-time streaming of observability events to the frontend.

#### Scenario: SSE endpoint for trace events

- **WHEN** a client connects to `/api/chat/observability-stream`
- **THEN** the system SHALL establish a Server-Sent Events connection
- **AND** observability events SHALL be pushed in real-time as JSON

#### Scenario: Event types

- **WHEN** observability events are streamed
- **THEN** the system SHALL emit `trace_start`, `span_start`, `span_end`, `trace_end`, `metric` event types
- **AND** each event type SHALL be declared in the `AgentStreamEvent` discriminated union type so the frontend receives type-safe events

---

### Requirement: Observability Dashboard UI

The system SHALL provide a UI for viewing observability data for chat sessions.

#### Scenario: Access observability panel

- **WHEN** a user is on a chat session page
- **THEN** the system SHALL provide an "Observability" tab or panel
- **AND** the panel SHALL display real-time observability data when enabled

#### Scenario: Display execution timeline

- **WHEN** a user views the observability panel
- **THEN** the system SHALL display a timeline of spans for the current trace
- **AND** each span SHALL show name, duration, and status

#### Scenario: Display metrics summary

- **WHEN** a trace completes or is in progress
- **THEN** the system SHALL display cumulative metrics (tokens, cost, latency)
- **AND** the metrics SHALL update in real-time during streaming

#### Scenario: View trace history

- **WHEN** a user requests historical traces for the session
- **THEN** the system SHALL list past traces with summary information
- **AND** selecting a trace SHALL show its detailed span breakdown

---

### Requirement: Trace Database Schema

The system SHALL define database tables using Drizzle ORM for storing observability data.

#### Scenario: chat_traces table

- **WHEN** the database schema is defined
- **THEN** the Drizzle schema SHALL define a `chat_traces` table with:
  - `id` (text primary key)
  - `session_id` (text, not null, foreign key to `chat_sessions.id`, onDelete: 'cascade')
  - `topic_id` (text, nullable, foreign key to `chat_topics.id`, onDelete: 'set null')
  - `agent_name` (text, not null)
  - `status` (text enum: 'running', 'completed', 'error', not null)
  - `total_tokens` (integer, not null, default 0)
  - `input_tokens` (integer, not null, default 0)
  - `output_tokens` (integer, not null, default 0)
  - `total_cost` (real, not null, default 0)
  - `input_cost` (real, not null, default 0)
  - `output_cost` (real, not null, default 0)
  - `latency_ms` (integer, not null, default 0)
  - `tool_call_count` (integer, not null, default 0)
  - `error` (text, nullable)
  - `metadata` (text, nullable) -- Reserved for extensible JSON data (e.g., model name, provider)
  - `created_at` and `updated_at` (integer, mode: 'timestamp', with `$defaultFn(() => new Date())`)
  - Index on `(session_id, created_at)`
  - Index on `topic_id`

#### Scenario: chat_spans table

- **WHEN** the database schema is defined
- **THEN** the Drizzle schema SHALL define a `chat_spans` table with:
  - `id` (text primary key)
  - `trace_id` (text, not null, foreign key to `chat_traces.id`, onDelete: 'cascade')
  - `parent_span_id` (text, nullable, foreign key to `chat_spans.id`, onDelete: 'set null')
  - `name` (text, not null, enum: 'llm_call', 'tool_call', 'context_compression')
  - `kind` (text, not null, enum: 'client', 'internal')
  - `status` (text, not null, enum: 'ok', 'error')
  - `attributes` (text, nullable) -- Structured JSON for span-specific metadata (e.g., model name, tool arguments summary)
  - `events` (text, nullable) -- Structured JSON array of span events
  - `start_time` and `end_time` (integer, mode: 'timestamp')
  - `duration_ms` (integer, nullable)
  - `token_input` (integer, nullable)
  - `token_output` (integer, nullable)
  - `cost` (real, nullable)
  - Index on `trace_id`
  - Index on `parent_span_id`
