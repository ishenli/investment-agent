CREATE TABLE IF NOT EXISTS `scheduled_job_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`result` text,
	`error_message` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `scheduled_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_job_logs_job_id` ON `scheduled_job_logs` (`job_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_job_logs_user_id` ON `scheduled_job_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_job_logs_status` ON `scheduled_job_logs` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `scheduled_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`cron_expression` text NOT NULL,
	`job_type` text NOT NULL,
	`account_id` integer,
	`config` text,
	`timeout_ms` integer DEFAULT 300000 NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`last_run_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_jobs_user_id` ON `scheduled_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_jobs_user_enabled` ON `scheduled_jobs` (`user_id`,`is_enabled`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scheduled_jobs_deleted_at` ON `scheduled_jobs` (`deleted_at`);
