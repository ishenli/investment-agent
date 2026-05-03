CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`is_read` integer DEFAULT false NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`link` text,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_type_priority` ON `notifications` (`type`,`priority`);--> statement-breakpoint
CREATE INDEX `idx_notifications_created_at` ON `notifications` (`created_at`);