PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_asset_market_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_meta_id` integer NOT NULL,
	`title` text NOT NULL,
	`symbol` text NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`importance` text DEFAULT '5' NOT NULL,
	`summary` text NOT NULL,
	`key_topics` text,
	`market_impact` text NOT NULL,
	`key_data_points` text,
	`source_url` text,
	`source_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`asset_meta_id`) REFERENCES `asset_meta`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_asset_market_info`("id", "asset_meta_id", "title", "symbol", "sentiment", "importance", "summary", "key_topics", "market_impact", "key_data_points", "source_url", "source_name", "created_at", "updated_at") SELECT "id", "asset_meta_id", "title", "symbol", "sentiment", "importance", "summary", "key_topics", "market_impact", "key_data_points", "source_url", "source_name", "created_at", "updated_at" FROM `asset_market_info`;--> statement-breakpoint
DROP TABLE `asset_market_info`;--> statement-breakpoint
ALTER TABLE `__new_asset_market_info` RENAME TO `asset_market_info`;--> statement-breakpoint
PRAGMA foreign_keys=ON;