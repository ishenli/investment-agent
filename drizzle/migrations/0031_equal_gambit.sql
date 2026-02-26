DROP INDEX `idx_asset_positions_account_symbol_unique`;--> statement-breakpoint
ALTER TABLE `asset_positions` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_asset_positions_deleted_at` ON `asset_positions` (`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asset_positions_account_symbol_unique` ON `asset_positions` (`account_id`,`symbol`) WHERE "asset_positions"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE `accounts` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_accounts_deleted_at` ON `accounts` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_analysis_reports_deleted_at` ON `analysis_reports` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `notes` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_notes_deleted_at` ON `notes` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_transactions_deleted_at` ON `transactions` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_users_deleted_at` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_asset_meta_deleted_at` ON `asset_meta` (`deleted_at`);