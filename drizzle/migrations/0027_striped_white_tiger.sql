CREATE TABLE `chat_files` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text,
	`session_id` text,
	`name` text NOT NULL,
	`file_type` text NOT NULL,
	`size` integer NOT NULL,
	`save_mode` text NOT NULL,
	`url` text,
	`data` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_files_message_id` ON `chat_files` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_files_session_id` ON `chat_files` (`session_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`topic_id` text,
	`parent_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`files` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`user_like_tag` text,
	`dislike_reason` text,
	`error` text,
	`reasoning` text,
	`search` text,
	`image_list` text,
	`metadata` text,
	`tools` text,
	`tool_call_id` text,
	`plugin` text,
	`plugin_state` text,
	`plugin_error` text,
	`from_model` text,
	`from_provider` text,
	`translate` text,
	`tts` text,
	`trace_id` text,
	`observation_id` text,
	`quota_id` text,
	`model` text,
	`provider` text,
	`related` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `chat_topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_session_topic` ON `chat_messages` (`session_id`,`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_parent_id` ON `chat_messages` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_role` ON `chat_messages` (`role`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_created_at` ON `chat_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_trace_id` ON `chat_messages` (`trace_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_tool_call_id` ON `chat_messages` (`tool_call_id`);--> statement-breakpoint
CREATE TABLE `chat_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`type` text NOT NULL,
	`manifest` text,
	`settings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_plugins_identifier_unique` ON `chat_plugins` (`identifier`);--> statement-breakpoint
CREATE INDEX `idx_chat_plugins_type` ON `chat_plugins` (`type`);--> statement-breakpoint
CREATE TABLE `chat_session_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`group_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`config` text NOT NULL,
	`meta` text NOT NULL,
	`agent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `chat_session_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_sessions_slug_unique` ON `chat_sessions` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_user_id` ON `chat_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_group_id` ON `chat_sessions` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_updated_at` ON `chat_sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_pinned` ON `chat_sessions` (`pinned`);--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`source_message_id` text NOT NULL,
	`parent_thread_id` text,
	`title` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`client_id` text,
	`user_id` text,
	`last_active_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `chat_topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_message_id`) REFERENCES `chat_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_thread_id`) REFERENCES `chat_threads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_chat_threads_topic_id` ON `chat_threads` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_threads_source_message_id` ON `chat_threads` (`source_message_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_threads_parent_thread_id` ON `chat_threads` (`parent_thread_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_threads_status` ON `chat_threads` (`status`);--> statement-breakpoint
CREATE INDEX `idx_chat_threads_topic_source` ON `chat_threads` (`topic_id`,`source_message_id`);--> statement-breakpoint
CREATE TABLE `chat_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_topics_session_id` ON `chat_topics` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_topics_favorite` ON `chat_topics` (`favorite`);