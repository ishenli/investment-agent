PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_analysis_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`type` text DEFAULT 'weekly' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`generation_progress` integer DEFAULT 0,
	`generation_stage` text,
	`data_source_summary` text,
	`is_manually_edited` integer DEFAULT false,
	`last_edited_at` integer,
	`edit_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_analysis_reports`("id", "account_id", "type", "title", "content", "start_date", "end_date", "generation_progress", "generation_stage", "data_source_summary", "is_manually_edited", "last_edited_at", "edit_count", "created_at", "updated_at") SELECT "id", "account_id", "type", "title", "content", "start_date", "end_date", "generation_progress", "generation_stage", "data_source_summary", "is_manually_edited", "last_edited_at", "edit_count", "created_at", CASE WHEN "updated_at" = 0 THEN "created_at" ELSE "updated_at" END FROM `analysis_reports`;--> statement-breakpoint
DROP TABLE `analysis_reports`;--> statement-breakpoint
ALTER TABLE `__new_analysis_reports` RENAME TO `analysis_reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;