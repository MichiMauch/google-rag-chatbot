CREATE TABLE `chat_configs` (
	`chat_name` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`upload_type` text NOT NULL,
	`theme_id` text NOT NULL,
	`file_search_store_name` text,
	`files` text NOT NULL,
	`sitemap_urls` text,
	`allowed_domains` text,
	`system_instruction` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_configs_chat_name` ON `chat_configs` (`chat_name`);