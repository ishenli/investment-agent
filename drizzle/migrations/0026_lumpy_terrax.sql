ALTER TABLE `asset_market_info` ADD `original_content` text;--> statement-breakpoint
ALTER TABLE `asset_market_info` ADD `content_mode` text DEFAULT 'ai_summary' NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_meta` ADD `full_name` text;--> statement-breakpoint
ALTER TABLE `asset_meta` ADD `logo_url` text;