/**
 * Chat Observability Extended Schema
 *
 * 扩展观测能力，支持 Reflection 指标和更丰富的追踪数据。
 */
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ============== Extended Traces with Reflection Metrics ==============

export const chatTracesExtended = sqliteTable(
  'chat_traces_extended',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    topicId: text('topic_id'),
    agentName: text('agent_name').notNull(),
    // Main trace status
    status: text('status', { enum: ['running', 'completed', 'error'] }).notNull(),
    // Token metrics
    totalTokens: integer('total_tokens').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    reasoningTokens: integer('reasoning_tokens').notNull().default(0),
    // Cost metrics
    totalCost: real('total_cost').notNull().default(0),
    inputCost: real('input_cost').notNull().default(0),
    outputCost: real('output_cost').notNull().default(0),
    cachedCost: real('cached_cost').notNull().default(0),
    reasoningCost: real('reasoning_cost').notNull().default(0),
    // Latency metrics
    latencyMs: integer('latency_ms').notNull().default(0),
    llmLatencyMs: integer('llm_latency_ms').notNull().default(0),
    toolLatencyMs: integer('tool_latency_ms').notNull().default(0),
    // Call counts
    apiCallCount: integer('api_call_count').notNull().default(0),
    toolCallCount: integer('tool_call_count').notNull().default(0),
    iterationCount: integer('iteration_count').notNull().default(0),
    // Reflection metrics
    reflectionTriggered: integer('reflection_triggered', { mode: 'boolean' })
      .notNull()
      .default(false),
    reflectionType: text('reflection_type', { enum: ['memory', 'skills', 'combined', 'none'] }),
    reflectionSkillsCreated: integer('reflection_skills_created').notNull().default(0),
    reflectionMemoryUpdated: integer('reflection_memory_updated', { mode: 'boolean' }),
    reflectionLatencyMs: integer('reflection_latency_ms').notNull().default(0),
    reflectionDimensionsChecked: integer('reflection_dimensions_checked').notNull().default(0),
    reflectionDimensionsCovered: integer('reflection_dimensions_covered').notNull().default(0),
    reflectionDimensionsMissing: integer('reflection_dimensions_missing').notNull().default(0),
    // Context compression metrics
    compressionCount: integer('compression_count').notNull().default(0),
    tokensSavedByCompression: integer('tokens_saved_by_compression').notNull().default(0),
    // Error info
    error: text('error'),
    errorStack: text('error_stack'),
    // Metadata
    metadata: text('metadata', { mode: 'json' }),
    // Timestamps
    startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
    endTime: integer('end_time', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_chat_traces_ext_session_created').on(table.sessionId, table.createdAt),
    index('idx_chat_traces_ext_topic_id').on(table.topicId),
    index('idx_chat_traces_ext_status').on(table.status),
    index('idx_chat_traces_ext_reflection').on(table.reflectionTriggered),
  ],
);

// ============== Extended Spans ==============

export const chatSpansExtended = sqliteTable(
  'chat_spans_extended',
  {
    id: text('id').primaryKey(),
    traceId: text('trace_id').notNull(),
    parentSpanId: text('parent_span_id'),
    name: text('name', {
      enum: [
        'llm_call',
        'tool_call',
        'skill_use',
        'context_compression',
        'reflection',
        'background_review',
        'background_review_audit',
        'background_review_skill_gen',
      ],
    }).notNull(),
    kind: text('kind', { enum: ['client', 'internal'] }).notNull(),
    status: text('status', { enum: ['ok', 'error'] }).notNull(),
    // Hierarchical depth for tree visualization
    depth: integer('depth').notNull().default(0),
    // Detailed attributes
    attributes: text('attributes', { mode: 'json' }),
    // Events within span
    events: text('events', { mode: 'json' }),
    // Timing
    startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
    endTime: integer('end_time', { mode: 'timestamp' }),
    durationMs: integer('duration_ms'),
    // Token usage (for LLM calls)
    tokenInput: integer('token_input'),
    tokenOutput: integer('token_output'),
    tokenCached: integer('token_cached'),
    tokenReasoning: integer('token_reasoning'),
    // Cost
    cost: real('cost'),
    // Model info (for LLM calls)
    modelName: text('model_name'),
    // Tool info (for tool calls)
    toolName: text('tool_name'),
    toolCallId: text('tool_call_id'),
    toolError: text('tool_error'),
    // Reflection-specific
    reflectionTrigger: text('reflection_trigger', { enum: ['memory', 'skills', 'combined'] }),
    reflectionSkillsCreated: integer('reflection_skills_created'),
    reflectionMemoryUpdated: integer('reflection_memory_updated', { mode: 'boolean' }),
    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_chat_spans_ext_trace_id').on(table.traceId),
    index('idx_chat_spans_ext_parent_span_id').on(table.parentSpanId),
    index('idx_chat_spans_ext_name').on(table.name),
    index('idx_chat_spans_ext_status').on(table.status),
  ],
);

// ============== Observability Metrics View ==============

export const chatObservabilityMetrics = sqliteTable(
  'chat_observability_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id'),
    topicId: text('topic_id'),
    agentName: text('agent_name'),
    // Time bucket (hourly aggregation)
    timeBucket: text('time_bucket').notNull(), // Format: YYYY-MM-DD HH:00
    // Aggregated metrics
    traceCount: integer('trace_count').notNull().default(0),
    avgLatencyMs: real('avg_latency_ms').notNull().default(0),
    maxLatencyMs: integer('max_latency_ms').notNull().default(0),
    minLatencyMs: integer('min_latency_ms').notNull().default(0),
    p50LatencyMs: integer('p50_latency_ms').notNull().default(0),
    p95LatencyMs: integer('p95_latency_ms').notNull().default(0),
    p99LatencyMs: integer('p99_latency_ms').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCost: real('total_cost').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    // Reflection metrics
    reflectionCount: integer('reflection_count').notNull().default(0),
    reflectionSkillsCreated: integer('reflection_skills_created').notNull().default(0),
    reflectionMemoryUpdates: integer('reflection_memory_updates').notNull().default(0),
    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_obs_metrics_session').on(table.sessionId, table.timeBucket),
    index('idx_obs_metrics_agent').on(table.agentName, table.timeBucket),
    index('idx_obs_metrics_time').on(table.timeBucket),
  ],
);

// ============== Type Exports ==============

export type ChatTraceExtended = typeof chatTracesExtended.$inferSelect;
export type NewChatTraceExtended = typeof chatTracesExtended.$inferInsert;
export type ChatSpanExtended = typeof chatSpansExtended.$inferSelect;
export type NewChatSpanExtended = typeof chatSpansExtended.$inferInsert;
export type ChatObservabilityMetric = typeof chatObservabilityMetrics.$inferSelect;
export type NewChatObservabilityMetric = typeof chatObservabilityMetrics.$inferInsert;
