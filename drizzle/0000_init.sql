CREATE TABLE `activity_types` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_de` text NOT NULL,
	`name_en` text NOT NULL,
	`desc_de` text DEFAULT '' NOT NULL,
	`desc_en` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`allowed_zone_kinds` text NOT NULL,
	`required_roles` text NOT NULL,
	`required_docs` text NOT NULL,
	`conditional` text NOT NULL,
	`conflicts_with` text NOT NULL,
	`detail_fields` text NOT NULL,
	`checklist` text NOT NULL,
	`lead_days` integer DEFAULT 0 NOT NULL,
	`requires_site_clearance` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_types_code_idx` ON `activity_types` (`code`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_time_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_activities` (
	`booking_id` text NOT NULL,
	`activity_code` text NOT NULL,
	PRIMARY KEY(`booking_id`, `activity_code`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_checks` (
	`booking_id` text NOT NULL,
	`key` text NOT NULL,
	`done_at` integer,
	`done_by` text,
	`note` text,
	PRIMARY KEY(`booking_id`, `key`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_counters` (
	`year` integer PRIMARY KEY NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`message` text,
	`visible_to_project` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `booking_events_booking_idx` ON `booking_events` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`name` text NOT NULL,
	`organization` text,
	`is_guest` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `booking_periods_time_idx` ON `booking_periods` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `booking_periods_booking_idx` ON `booking_periods` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_persons` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`qualification` text,
	`on_site` integer DEFAULT true NOT NULL,
	`verified_at` integer,
	`verified_by` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `booking_zones` (
	`booking_id` text NOT NULL,
	`zone_id` text NOT NULL,
	PRIMARY KEY(`booking_id`, `zone_id`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`project_id` text NOT NULL,
	`created_by` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`participants_count` integer DEFAULT 1 NOT NULL,
	`guests_count` integer DEFAULT 0 NOT NULL,
	`details` text NOT NULL,
	`notes_project` text,
	`notes_internal` text,
	`price_estimate_cents` integer,
	`terms_accepted_at` integer,
	`lead_time_override` integer DEFAULT false NOT NULL,
	`submitted_at` integer,
	`decided_at` integer,
	`decided_by` text,
	`completed_at` integer,
	`site_cleared_at` integer,
	`site_cleared_by` text,
	`first_start` integer,
	`last_end` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_number_idx` ON `bookings` (`number`);--> statement-breakpoint
CREATE INDEX `bookings_project_idx` ON `bookings` (`project_id`);--> statement-breakpoint
CREATE INDEX `bookings_time_idx` ON `bookings` (`first_start`,`last_end`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`project_id` text,
	`booking_id` text,
	`permit_id` text,
	`zone_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`valid_until` text,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`uploaded_by` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permit_id`) REFERENCES `permits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `documents_project_idx` ON `documents` (`project_id`);--> statement-breakpoint
CREATE INDEX `documents_booking_idx` ON `documents` (`booking_id`);--> statement-breakpoint
CREATE INDEX `documents_permit_idx` ON `documents` (`permit_id`);--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`to_address` text NOT NULL,
	`subject` text NOT NULL,
	`body` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text,
	`zone_id` text,
	`occurred_at` integer NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`actions` text,
	`reported_to_authority` integer DEFAULT false NOT NULL,
	`authority_reference` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`organization` text,
	`phone` text,
	`topic` text NOT NULL,
	`message` text NOT NULL,
	`locale` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`handled_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_counters` (
	`year` integer PRIMARY KEY NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`tax_rate_bp` integer NOT NULL,
	`net_cents` integer NOT NULL,
	`tax_cents` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_lines_invoice_idx` ON `invoice_lines` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text,
	`kind` text DEFAULT 'invoice' NOT NULL,
	`ref_invoice_id` text,
	`project_id` text NOT NULL,
	`booking_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`locale` text DEFAULT 'de' NOT NULL,
	`issue_date` text,
	`service_from` text,
	`service_to` text,
	`due_date` text,
	`recipient` text,
	`issuer` text,
	`reverse_charge` integer DEFAULT false NOT NULL,
	`net_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`gross_cents` integer DEFAULT 0 NOT NULL,
	`paid_cents` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`payment_terms` text,
	`dunning_level` integer DEFAULT 0 NOT NULL,
	`last_dunning_at` text,
	`pdf_key` text,
	`created_by` text,
	`issued_by` text,
	`issued_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_idx` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`project_id`);--> statement-breakpoint
CREATE TABLE `notifications_sent` (
	`key` text PRIMARY KEY NOT NULL,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`received_on` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`method` text DEFAULT 'transfer' NOT NULL,
	`reference` text,
	`note` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `permits` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`authority` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`reference_no` text,
	`submitted_at` text,
	`decided_at` text,
	`valid_from` text,
	`valid_until` text,
	`next_deadline` text,
	`next_deadline_note` text,
	`responsible_user_id` text,
	`zone_id` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`street` text,
	`postal_code` text,
	`city` text,
	`country` text DEFAULT 'AT' NOT NULL,
	`vat_id` text,
	`company_register` text,
	`invoice_locale` text DEFAULT 'de' NOT NULL,
	`admission_status` text DEFAULT 'pending' NOT NULL,
	`admission_checks` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `range_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actual_start` integer,
	`actual_end` integer,
	`weather` text,
	`wind_kmh` real,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rates` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_de` text NOT NULL,
	`name_en` text NOT NULL,
	`unit` text NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`tax_rate_bp` integer DEFAULT 2000 NOT NULL,
	`zone_id` text,
	`activity_code` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mfa_verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `site_blocks_time_idx` ON `site_blocks` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `slot_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text,
	`name_de` text NOT NULL,
	`name_en` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`weekdays` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`password_hash` text,
	`locale` text DEFAULT 'de' NOT NULL,
	`phone` text,
	`totp_secret` text,
	`totp_enabled` integer DEFAULT false NOT NULL,
	`totp_last_step` integer,
	`recovery_codes` text,
	`failed_logins` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_de` text NOT NULL,
	`name_en` text NOT NULL,
	`desc_de` text DEFAULT '' NOT NULL,
	`desc_en` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`color` text DEFAULT '#1f3864' NOT NULL,
	`polygon` text NOT NULL,
	`bookable` integer DEFAULT true NOT NULL,
	`public_visible` integer DEFAULT true NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`area_ha` real,
	`safety_notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zones_code_idx` ON `zones` (`code`);