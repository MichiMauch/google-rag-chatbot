ALTER TABLE `chat_messages` ADD `feedback` integer;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `feedback_at` integer;--> statement-breakpoint
CREATE INDEX `idx_messages_feedback` ON `chat_messages` (`feedback`);