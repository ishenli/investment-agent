CREATE TABLE `evaluation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`engine` text NOT NULL,
	`categories` text NOT NULL,
	`threshold` real NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`total_cases` integer DEFAULT 0 NOT NULL,
	`passed_cases` integer DEFAULT 0 NOT NULL,
	`failed_cases` integer DEFAULT 0 NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`report_path` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evaluation_runs_engine_created` ON `evaluation_runs` (`engine`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_runs_status` ON `evaluation_runs` (`status`);--> statement-breakpoint
CREATE TABLE `evaluation_case_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`case_id` text NOT NULL,
	`category` text NOT NULL,
	`engine` text NOT NULL,
	`passed` integer NOT NULL,
	`score` real NOT NULL,
	`dimension_scores` text NOT NULL,
	`run_record` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `evaluation_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evaluation_case_results_run_case_unique` ON `evaluation_case_results` (`run_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_case_results_case_engine` ON `evaluation_case_results` (`case_id`,`engine`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_case_results_category` ON `evaluation_case_results` (`category`);--> statement-breakpoint
CREATE TABLE `evaluation_scorer_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_result_id` integer NOT NULL,
	`name` text NOT NULL,
	`dimension` text NOT NULL,
	`score` real NOT NULL,
	`passed` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_result_id`) REFERENCES `evaluation_case_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_evaluation_scorer_results_case` ON `evaluation_scorer_results` (`case_result_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_scorer_results_dimension` ON `evaluation_scorer_results` (`dimension`);--> statement-breakpoint
CREATE TABLE `evaluation_baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `evaluation_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evaluation_baselines_name_unique` ON `evaluation_baselines` (`name`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_baselines_run_id` ON `evaluation_baselines` (`run_id`);
