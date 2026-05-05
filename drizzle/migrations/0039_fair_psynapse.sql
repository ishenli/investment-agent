CREATE TABLE `chat_spans` (
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
	FOREIGN KEY (`trace_id`) REFERENCES `chat_traces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_span_id`) REFERENCES `chat_spans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_chat_spans_trace_id` ON `chat_spans` (`trace_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_spans_parent_span_id` ON `chat_spans` (`parent_span_id`);--> statement-breakpoint
CREATE TABLE `chat_traces` (
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
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `chat_topics`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_chat_traces_session_created` ON `chat_traces` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_traces_topic_id` ON `chat_traces` (`topic_id`);