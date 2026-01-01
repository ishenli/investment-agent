CREATE TABLE `agent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`system_role` text,
	`logo` text,
	`api_key` text NOT NULL,
	`api_url` text NOT NULL,
	`opening_questions` text DEFAULT '[]' NOT NULL,
	`type` text DEFAULT 'LOCAL' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
