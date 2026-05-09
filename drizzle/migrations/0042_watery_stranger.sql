PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_spans` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`parent_span_id` text,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`attributes` text,
	`events` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`token_input` integer,
	`token_output` integer,
	`cost` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_chat_spans`("id", "trace_id", "parent_span_id", "name", "kind", "status", "attributes", "events", "start_time", "end_time", "duration_ms", "token_input", "token_output", "cost", "created_at", "updated_at") SELECT "id", "trace_id", "parent_span_id", "name", "kind", "status", "attributes", "events", "start_time", "end_time", "duration_ms", "token_input", "token_output", "cost", "created_at", "updated_at" FROM `chat_spans`;--> statement-breakpoint
DROP TABLE `chat_spans`;--> statement-breakpoint
ALTER TABLE `__new_chat_spans` RENAME TO `chat_spans`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_chat_spans_trace_id` ON `chat_spans` (`trace_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_spans_parent_span_id` ON `chat_spans` (`parent_span_id`);--> statement-breakpoint
CREATE TABLE `__new_chat_traces` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`topic_id` text,
	`agent_name` text NOT NULL,
	`status` text NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`input_cost` real DEFAULT 0 NOT NULL,
	`output_cost` real DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`tool_call_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_chat_traces`("id", "session_id", "topic_id", "agent_name", "status", "total_tokens", "input_tokens", "output_tokens", "total_cost", "input_cost", "output_cost", "latency_ms", "tool_call_count", "error", "metadata", "created_at", "updated_at") SELECT "id", "session_id", "topic_id", "agent_name", "status", "total_tokens", "input_tokens", "output_tokens", "total_cost", "input_cost", "output_cost", "latency_ms", "tool_call_count", "error", "metadata", "created_at", "updated_at" FROM `chat_traces`;--> statement-breakpoint
DROP TABLE `chat_traces`;--> statement-breakpoint
ALTER TABLE `__new_chat_traces` RENAME TO `chat_traces`;--> statement-breakpoint
CREATE INDEX `idx_chat_traces_session_created` ON `chat_traces` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_traces_topic_id` ON `chat_traces` (`topic_id`);