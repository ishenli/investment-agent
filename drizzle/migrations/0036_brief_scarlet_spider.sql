CREATE TABLE `exchange_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text DEFAULT 'USD' NOT NULL,
	`rate` real NOT NULL,
	`source` text DEFAULT 'manual',
	`last_updated` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exchange_rates_pair_unique` ON `exchange_rates` (`from_currency`,`to_currency`);