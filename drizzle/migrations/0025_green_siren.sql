CREATE TABLE `scheduled_task_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_type` text NOT NULL,
	`execution_date` integer NOT NULL,
	`status` text NOT NULL,
	`metadata` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_type_date_unique` ON `scheduled_task_logs` (`task_type`,`execution_date`);