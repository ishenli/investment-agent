ALTER TABLE `accounts` ADD `risk_mode` text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `trade_time` integer;