CREATE TABLE IF NOT EXISTS `ai_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`account_id` integer,
	`job_id` integer,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`confidence` real,
	`metadata` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `scheduled_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_insights_user_id` ON `ai_insights` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_insights_account_id` ON `ai_insights` (`account_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_insights_job_id` ON `ai_insights` (`job_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_insights_created_at` ON `ai_insights` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_insights_user_source` ON `ai_insights` (`user_id`,`source`);
