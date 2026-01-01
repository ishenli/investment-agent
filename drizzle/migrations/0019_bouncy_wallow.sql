CREATE TABLE `asset_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`price_cents` integer NOT NULL,
	`open_cents` integer,
	`high_cents` integer,
	`low_cents` integer,
	`date` integer NOT NULL,
	`market` text DEFAULT 'US' NOT NULL,
	`source` text DEFAULT 'finnhub' NOT NULL,
	`created_at` integer NOT NULL
);
