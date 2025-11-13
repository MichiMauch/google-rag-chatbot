CREATE TABLE `chat_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`chat_name` text NOT NULL,
	`total_messages` integer DEFAULT 0,
	`user_messages` integer DEFAULT 0,
	`bot_messages` integer DEFAULT 0,
	`error_messages` integer DEFAULT 0,
	`avg_response_time_ms` real,
	`min_response_time_ms` integer,
	`max_response_time_ms` integer,
	`unique_sessions` integer DEFAULT 0,
	`total_files_used` integer DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_date` ON `chat_analytics` (`date`);--> statement-breakpoint
CREATE INDEX `idx_analytics_chat` ON `chat_analytics` (`chat_name`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`response_time_ms` integer,
	`model_used` text,
	`tokens_used` integer,
	`sources_used` text,
	`had_error` integer DEFAULT false,
	`error_message` text,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_session` ON `chat_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_created` ON `chat_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_name` text NOT NULL,
	`display_name` text NOT NULL,
	`file_search_store_name` text,
	`upload_type` text NOT NULL,
	`theme_id` text NOT NULL,
	`system_instruction` text,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`total_messages` integer DEFAULT 0,
	`total_user_messages` integer DEFAULT 0,
	`total_bot_messages` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_chat_name` ON `chat_sessions` (`chat_name`);--> statement-breakpoint
CREATE INDEX `idx_sessions_created` ON `chat_sessions` (`created_at`);--> statement-breakpoint
CREATE TABLE `page_update_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`update_history_id` text NOT NULL,
	`url` text NOT NULL,
	`page_title` text,
	`action` text NOT NULL,
	`old_last_mod` integer,
	`new_last_mod` integer,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`update_history_id`) REFERENCES `update_history`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_page_logs_update` ON `page_update_logs` (`update_history_id`);--> statement-breakpoint
CREATE INDEX `idx_page_logs_action` ON `page_update_logs` (`action`);--> statement-breakpoint
CREATE TABLE `scraped_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_name` text NOT NULL,
	`url` text NOT NULL,
	`file_search_document_name` text,
	`last_scraped_at` integer NOT NULL,
	`sitemap_last_mod` integer,
	`title` text,
	`display_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scraped_chat_url` ON `scraped_pages` (`chat_name`,`url`);--> statement-breakpoint
CREATE INDEX `idx_scraped_url` ON `scraped_pages` (`url`);--> statement-breakpoint
CREATE INDEX `idx_scraped_chat` ON `scraped_pages` (`chat_name`);--> statement-breakpoint
CREATE TABLE `update_history` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_name` text NOT NULL,
	`triggered_by` text NOT NULL,
	`status` text NOT NULL,
	`total_pages` integer DEFAULT 0,
	`checked_pages` integer DEFAULT 0,
	`updated_pages` integer DEFAULT 0,
	`unchanged_pages` integer DEFAULT 0,
	`error_pages` integer DEFAULT 0,
	`started_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_updates_chat` ON `update_history` (`chat_name`);--> statement-breakpoint
CREATE INDEX `idx_updates_status` ON `update_history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_updates_created` ON `update_history` (`created_at`);