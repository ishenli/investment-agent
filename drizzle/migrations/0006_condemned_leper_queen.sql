PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_asset_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`price_cents` integer NOT NULL,
	`asset_type` text DEFAULT 'stock' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`source` text DEFAULT 'finnhub' NOT NULL,
	`market` text DEFAULT 'US' NOT NULL,
	`chinese_name` text
);
--> statement-breakpoint
INSERT INTO `__new_asset_meta`("id", "symbol", "price_cents", "asset_type", "currency", "created_at", "updated_at", "source", "market", "chinese_name") SELECT "id", "symbol", "price_cents", "asset_type", "currency", "created_at", "updated_at", "source", "market", "chinese_name" FROM `asset_meta`;--> statement-breakpoint
DROP TABLE `asset_meta`;--> statement-breakpoint
ALTER TABLE `__new_asset_meta` RENAME TO `asset_meta`;--> statement-breakpoint
PRAGMA foreign_keys=ON;