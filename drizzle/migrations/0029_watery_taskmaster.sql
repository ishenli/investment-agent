PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`type` text NOT NULL,
	`symbol` text,
	`quantity` real,
	`price_cents` integer,
	`total_amount_cents` integer NOT NULL,
	`fee_cents` integer DEFAULT 0 NOT NULL,
	`market` text DEFAULT 'US',
	`description` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`trade_time` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "account_id", "type", "symbol", "quantity", "price_cents", "total_amount_cents", "fee_cents", "market", "description", "status", "created_at", "updated_at", "trade_time") SELECT "id", "account_id", "type", "symbol", "quantity", "price_cents", "total_amount_cents", "fee_cents", "market", "description", "status", "created_at", "updated_at", "trade_time" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;