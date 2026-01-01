CREATE TABLE `analysis_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`type` text DEFAULT 'weekly' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
