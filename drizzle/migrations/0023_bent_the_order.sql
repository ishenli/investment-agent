ALTER TABLE `asset_market_info` ADD `original_content` text;--> statement-breakpoint
ALTER TABLE `asset_market_info` ADD `content_mode` text DEFAULT 'ai_summary' NOT NULL;