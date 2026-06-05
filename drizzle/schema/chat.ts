/**
 * Chat Storage Schema
 *
 * 聊天存储相关表定义，用于替代现有的 Dexie.js (IndexedDB) 存储。
 * 所有表使用 `chat_` 前缀命名，遵循 snake_case 命名规范。
 */
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { users } from '../schema';

// ============== Session Groups ==============

/**
 * 会话分组表
 * 对应 Dexie: sessionGroups
 */
export const chatSessionGroups = sqliteTable('chat_session_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============== Sessions ==============

/**
 * Agent 配置类型（存储为 JSON）
 */
export type AgentConfig = {
  chatConfig?: {
    enableAutoCreateTopic?: boolean;
    enableHistoryCount?: boolean;
    historyCount?: number;
  };
  model: string;
  openingMessage?: string;
  openingQuestions?: string[];
  params: {
    frequency_penalty?: number;
    max_tokens?: number;
    presence_penalty?: number;
    temperature?: number;
    top_p?: number;
  };
  plugins?: string[];
  provider: string;
  systemRole: string;
  tts?: {
    showAllLocaleVoice?: boolean;
    sttLocale?: string;
    ttsService?: string;
    voice?: {
      openai?: string;
      microsoft?: string;
    };
  };
};

/**
 * 会话元数据类型（存储为 JSON）
 */
export type SessionMeta = {
  title: string;
  description?: string;
  avatar?: string;
  backgroundColor?: string;
  tags?: string[];
};

/**
 * 聊天会话表
 * 对应 Dexie: sessions
 */
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['agent', 'group'] }).notNull(),
  groupId: text('group_id').references(() => chatSessionGroups.id, { onDelete: 'set null' }),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  config: text('config', { mode: 'json' }).notNull().$type<AgentConfig>(),
  meta: text('meta', { mode: 'json' }).notNull().$type<SessionMeta>(),
  agentId: text('agent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_sessions_user_id').on(table.userId),
  index('idx_chat_sessions_group_id').on(table.groupId),
  index('idx_chat_sessions_updated_at').on(table.updatedAt),
  index('idx_chat_sessions_pinned').on(table.pinned),
]);

// ============== Topics ==============

/**
 * 聊天话题表
 * 对应 Dexie: topics
 */
export const chatTopics = sqliteTable('chat_topics', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_topics_session_id').on(table.sessionId),
  index('idx_chat_topics_favorite').on(table.favorite),
]);

// ============== Messages ==============

/**
 * 工具调用类型（存储为 JSON）
 */
export type ToolCall = {
  id: string;
  index: number;
  function: {
    name: string;
    arguments: string;
  };
  type: 'function';
};

/**
 * 插件类型（存储为 JSON）
 */
export type PluginInfo = {
  identifier: string;
  apiName?: string;
  arguments?: string;
  type?: string;
};

/**
 * 翻译类型（存储为 JSON）
 */
export type TranslateInfo = {
  content?: string;
  from?: string;
  to?: string;
};

/**
 * 聊天消息表
 * 对应 Dexie: messages
 */
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  topicId: text('topic_id').references(() => chatTopics.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  role: text('role', { enum: ['user', 'system', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull(),
  files: text('files', { mode: 'json' }).$type<string[]>(),
  favorite: integer('favorite').notNull().default(0),
  userLikeTag: text('user_like_tag', { enum: ['like', 'dislike', 'unknown'] }),
  dislikeReason: text('dislike_reason'),
  error: text('error', { mode: 'json' }),
  reasoning: text('reasoning', { mode: 'json' }),
  search: text('search', { mode: 'json' }),
  imageList: text('image_list', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  tools: text('tools', { mode: 'json' }).$type<ToolCall[]>(),
  toolCallId: text('tool_call_id'),
  plugin: text('plugin', { mode: 'json' }).$type<PluginInfo>(),
  pluginState: text('plugin_state', { mode: 'json' }),
  pluginError: text('plugin_error', { mode: 'json' }),
  fromModel: text('from_model'),
  fromProvider: text('from_provider'),
  translate: text('translate', { mode: 'json' }).$type<TranslateInfo>(),
  tts: text('tts', { mode: 'json' }),
  traceId: text('trace_id'),
  observationId: text('observation_id'),
  quotaId: text('quota_id'),
  model: text('model'),
  provider: text('provider'),
  related: text('related', { mode: 'json' }).$type<string[]>(),
  uiArtifacts: text('ui_artifacts', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  // 复合索引用于查询会话下的话题消息
  index('idx_chat_messages_session_topic').on(table.sessionId, table.topicId),
  index('idx_chat_messages_parent_id').on(table.parentId),
  index('idx_chat_messages_role').on(table.role),
  index('idx_chat_messages_created_at').on(table.createdAt),
  index('idx_chat_messages_trace_id').on(table.traceId),
  index('idx_chat_messages_tool_call_id').on(table.toolCallId),
]);

// ============== Threads ==============

/**
 * 消息线程表
 * 对应 Dexie: threads
 */
// @ts-expect-error - Self-referencing table causes TypeScript inference issues
export const chatThreads = sqliteTable('chat_threads', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => chatTopics.id, { onDelete: 'cascade' }),
  sourceMessageId: text('source_message_id')
    .notNull()
    .references(() => chatMessages.id, { onDelete: 'cascade' }),
  // @ts-expect-error - Self-referencing causes TypeScript inference issue
  parentThreadId: text('parent_thread_id').references(() => chatThreads.id, { onDelete: 'set null' }),
  title: text('title'),
  type: text('type', { enum: ['continuation', 'standalone'] }).notNull(),
  status: text('status', { enum: ['active', 'deprecated', 'archived'] }).notNull().default('active'),
  clientId: text('client_id'),
  userId: text('user_id'),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_threads_topic_id').on(table.topicId),
  index('idx_chat_threads_source_message_id').on(table.sourceMessageId),
  index('idx_chat_threads_parent_thread_id').on(table.parentThreadId),
  index('idx_chat_threads_status').on(table.status),
  // 复合索引用于查找话题下特定消息的线程
  index('idx_chat_threads_topic_source').on(table.topicId, table.sourceMessageId),
]);

// ============== Files ==============

/**
 * 聊天文件附件表
 * 对应 Dexie: files
 */
export const chatFiles = sqliteTable('chat_files', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => chatMessages.id, { onDelete: 'set null' }),
  sessionId: text('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fileType: text('file_type').notNull(),
  size: integer('size').notNull(),
  saveMode: text('save_mode', { enum: ['local', 'url'] }).notNull(),
  url: text('url'),
  data: text('data'), // Base64 encoded for small files
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_files_message_id').on(table.messageId),
  index('idx_chat_files_session_id').on(table.sessionId),
]);

// ============== Plugins ==============

/**
 * 插件清单类型（存储为 JSON）
 */
export type PluginManifest = {
  meta?: {
    title?: string;
    description?: string;
    author?: string;
    avatar?: string;
  };
  type?: string;
};

/**
 * 聊天插件表
 * 对应 Dexie: plugins
 */
export const chatPlugins = sqliteTable('chat_plugins', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull().unique(),
  type: text('type', { enum: ['plugin', 'customPlugin'] }).notNull(),
  manifest: text('manifest', { mode: 'json' }).$type<PluginManifest>(),
  settings: text('settings', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_plugins_type').on(table.type),
]);

// ============== Observability: Traces ==============

export const chatTraces = sqliteTable('chat_traces', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  topicId: text('topic_id'),
  agentName: text('agent_name').notNull(),
  status: text('status', { enum: ['running', 'completed', 'error'] }).notNull(),
  totalTokens: integer('total_tokens').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  inputCost: real('input_cost').notNull().default(0),
  outputCost: real('output_cost').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  toolCallCount: integer('tool_call_count').notNull().default(0),
  error: text('error'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_traces_session_created').on(table.sessionId, table.createdAt),
  index('idx_chat_traces_topic_id').on(table.topicId),
]);

// ============== Observability: Spans ==============

export const chatSpans = sqliteTable('chat_spans', {
  id: text('id').primaryKey(),
  traceId: text('trace_id').notNull(),
  parentSpanId: text('parent_span_id'),
  name: text('name', { enum: ['llm_call', 'tool_call', 'context_compression'] }).notNull(),
  kind: text('kind', { enum: ['client', 'internal'] }).notNull(),
  status: text('status', { enum: ['ok', 'error'] }).notNull(),
  attributes: text('attributes', { mode: 'json' }),
  events: text('events', { mode: 'json' }),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  durationMs: integer('duration_ms'),
  tokenInput: integer('token_input'),
  tokenOutput: integer('token_output'),
  cost: real('cost'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_chat_spans_trace_id').on(table.traceId),
  index('idx_chat_spans_parent_span_id').on(table.parentSpanId),
]);

// ============== Type Exports ==============

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatTopic = typeof chatTopics.$inferSelect;
export type NewChatTopic = typeof chatTopics.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Manually define ChatThread types to avoid self-referencing table inference issues
export interface ChatThread {
  id: string;
  topicId: string;
  sourceMessageId: string;
  parentThreadId: string | null;
  title: string | null;
  type: 'continuation' | 'standalone';
  status: 'active' | 'deprecated' | 'archived';
  clientId: string | null;
  userId: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface NewChatThread {
  id?: string;
  topicId: string;
  sourceMessageId: string;
  parentThreadId?: string | null;
  title?: string | null;
  type: 'continuation' | 'standalone';
  status?: 'active' | 'deprecated' | 'archived';
  clientId?: string | null;
  userId?: string | null;
  lastActiveAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ChatFile = typeof chatFiles.$inferSelect;
export type NewChatFile = typeof chatFiles.$inferInsert;
export type ChatSessionGroup = typeof chatSessionGroups.$inferSelect;
export type NewChatSessionGroup = typeof chatSessionGroups.$inferInsert;
export type ChatPlugin = typeof chatPlugins.$inferSelect;
export type NewChatPlugin = typeof chatPlugins.$inferInsert;

export type ChatTrace = typeof chatTraces.$inferSelect;
export type NewChatTrace = typeof chatTraces.$inferInsert;
export type ChatSpan = typeof chatSpans.$inferSelect;
export type NewChatSpan = typeof chatSpans.$inferInsert;export * from "./chat-observability";
