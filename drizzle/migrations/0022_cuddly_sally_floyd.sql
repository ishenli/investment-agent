CREATE TABLE `portfolio_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`snapshot_date` integer NOT NULL,
	`total_value_cents` integer NOT NULL,
	`cash_balance_cents` integer NOT NULL,
	`positions` text NOT NULL,
	`benchmark_value_cents` integer,
	`benchmark_symbol` text DEFAULT 'SPY',
	`source` text DEFAULT 'scheduled' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_portfolio_snapshots_account_date_unique` ON `portfolio_snapshots` (`account_id`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_portfolio_snapshots_date` ON `portfolio_snapshots` (`snapshot_date`);--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `generation_progress` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `generation_stage` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `data_source_summary` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `is_manually_edited` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `last_edited_at` integer;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `edit_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `updated_at` integer NOT NULL DEFAULT 0;