CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`icon` text,
	`config` text,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_skills_user_id` ON `skills` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_skills_user_slug_unique` ON `skills` (`user_id`,`slug`);