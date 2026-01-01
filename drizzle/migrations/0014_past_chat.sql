CREATE TABLE `asset_company_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_meta_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`asset_meta_id`) REFERENCES `asset_meta`(`id`) ON UPDATE no action ON DELETE no action
);
