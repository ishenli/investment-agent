CREATE TABLE `asset_market_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_meta_id` integer NOT NULL,
	`title` text NOT NULL,
	`symbol` text NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`importance` integer DEFAULT 5 NOT NULL,
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
