CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`platform_user_id` text NOT NULL,
	`display_name` text,
	`person_id` text NOT NULL,
	`linked_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_platform_user_unique` ON `accounts` (`platform`,`platform_user_id`);--> statement-breakpoint
CREATE INDEX `accounts_person_id_idx` ON `accounts` (`person_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`platform_conversation_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_platform_conversation_unique` ON `conversations` (`platform`,`platform_conversation_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`account_id` text,
	`type` text NOT NULL,
	`text` text,
	`payload_json` text NOT NULL,
	`platform_message_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_conversation_platform_message_unique` ON `messages` (`conversation_id`,`platform_message_id`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
