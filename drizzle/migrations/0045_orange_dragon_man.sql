CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`type` text DEFAULT 'one_time' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`linked_symbols` text DEFAULT '[]',
	`trigger_price` real,
	`trigger_direction` text,
	`trigger_executed_at` integer,
	`due_date` integer,
	`completed_at` integer,
	`execution_notes` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_user_id` ON `tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_user_status` ON `tasks` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_due_date` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_deleted_at` ON `tasks` (`deleted_at`);