PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_model_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_model_providers`("id", "user_id", "slug", "name", "base_url", "api_key", "is_active", "display_order", "description", "created_at", "updated_at") SELECT "id", "account_id", "slug", "name", "base_url", "api_key", "is_active", "display_order", "description", "created_at", "updated_at" FROM `model_providers`;--> statement-breakpoint
DROP TABLE `model_providers`;--> statement-breakpoint
ALTER TABLE `__new_model_providers` RENAME TO `model_providers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `model_providers_slug_unique` ON `model_providers` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "user_id", "key", "value", "created_at", "updated_at") SELECT "id", "account_id", "key", "value", "created_at", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
ALTER TABLE `agent` ADD `is_builtin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agent` DROP COLUMN `api_key`;--> statement-breakpoint
ALTER TABLE `agent` DROP COLUMN `api_url`;