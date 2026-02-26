DROP INDEX `model_providers_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_model_providers_user_slug_unique` ON `model_providers` (`user_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_funds_account_currency_unique` ON `account_funds` (`account_id`,`currency`);--> statement-breakpoint
CREATE INDEX `idx_account_funds_account_id` ON `account_funds` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_slug_unique` ON `agent` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asset_market_info_to_asset_meta_unique` ON `asset_market_info_to_asset_meta` (`asset_market_info_id`,`asset_meta_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asset_meta_symbol_market_unique` ON `asset_meta` (`symbol`,`market`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asset_positions_account_symbol_unique` ON `asset_positions` (`account_id`,`symbol`);--> statement-breakpoint
CREATE INDEX `idx_asset_price_symbol_date` ON `asset_price_history` (`symbol`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_provider_models_provider_slug_unique` ON `provider_models` (`provider_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_user_key_unique` ON `settings` (`user_id`,`key`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_created_at` ON `transactions` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_trade_time` ON `transactions` (`account_id`,`trade_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_selected_accounts_user_account_unique` ON `user_selected_accounts` (`user_id`,`account_id`);