CREATE TABLE `chat_observability_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text,
	`topic_id` text,
	`agent_name` text,
	`time_bucket` text NOT NULL,
	`trace_count` integer DEFAULT 0 NOT NULL,
	`avg_latency_ms` real DEFAULT 0 NOT NULL,
	`max_latency_ms` integer DEFAULT 0 NOT NULL,
	`min_latency_ms` integer DEFAULT 0 NOT NULL,
	`p50_latency_ms` integer DEFAULT 0 NOT NULL,
	`p95_latency_ms` integer DEFAULT 0 NOT NULL,
	`p99_latency_ms` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`reflection_count` integer DEFAULT 0 NOT NULL,
	`reflection_skills_created` integer DEFAULT 0 NOT NULL,
	`reflection_memory_updates` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_obs_metrics_session` ON `chat_observability_metrics` (`session_id`,`time_bucket`);--> statement-breakpoint
CREATE INDEX `idx_obs_metrics_agent` ON `chat_observability_metrics` (`agent_name`,`time_bucket`);--> statement-breakpoint
CREATE INDEX `idx_obs_metrics_time` ON `chat_observability_metrics` (`time_bucket`);--> statement-breakpoint
CREATE TABLE `chat_spans_extended` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`parent_span_id` text,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`attributes` text,
	`events` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`token_input` integer,
	`token_output` integer,
	`token_cached` integer,
	`token_reasoning` integer,
	`cost` real,
	`model_name` text,
	`tool_name` text,
	`tool_call_id` text,
	`tool_error` text,
	`reflection_trigger` text,
	`reflection_skills_created` integer,
	`reflection_memory_updated` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_spans_ext_trace_id` ON `chat_spans_extended` (`trace_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_spans_ext_parent_span_id` ON `chat_spans_extended` (`parent_span_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_spans_ext_name` ON `chat_spans_extended` (`name`);--> statement-breakpoint
CREATE INDEX `idx_chat_spans_ext_status` ON `chat_spans_extended` (`status`);--> statement-breakpoint
CREATE TABLE `chat_traces_extended` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`topic_id` text,
	`agent_name` text NOT NULL,
	`status` text NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`input_cost` real DEFAULT 0 NOT NULL,
	`output_cost` real DEFAULT 0 NOT NULL,
	`cached_cost` real DEFAULT 0 NOT NULL,
	`reasoning_cost` real DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`llm_latency_ms` integer DEFAULT 0 NOT NULL,
	`tool_latency_ms` integer DEFAULT 0 NOT NULL,
	`api_call_count` integer DEFAULT 0 NOT NULL,
	`tool_call_count` integer DEFAULT 0 NOT NULL,
	`iteration_count` integer DEFAULT 0 NOT NULL,
	`reflection_triggered` integer DEFAULT false NOT NULL,
	`reflection_type` text,
	`reflection_skills_created` integer DEFAULT 0 NOT NULL,
	`reflection_memory_updated` integer,
	`reflection_latency_ms` integer DEFAULT 0 NOT NULL,
	`reflection_dimensions_checked` integer DEFAULT 0 NOT NULL,
	`reflection_dimensions_covered` integer DEFAULT 0 NOT NULL,
	`reflection_dimensions_missing` integer DEFAULT 0 NOT NULL,
	`compression_count` integer DEFAULT 0 NOT NULL,
	`tokens_saved_by_compression` integer DEFAULT 0 NOT NULL,
	`error` text,
	`error_stack` text,
	`metadata` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_traces_ext_session_created` ON `chat_traces_extended` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_traces_ext_topic_id` ON `chat_traces_extended` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_traces_ext_status` ON `chat_traces_extended` (`status`);--> statement-breakpoint
CREATE INDEX `idx_chat_traces_ext_reflection` ON `chat_traces_extended` (`reflection_triggered`);