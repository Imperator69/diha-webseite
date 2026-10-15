ALTER TABLE `rates` ADD `basis` text DEFAULT 'booking' NOT NULL;
--> statement-breakpoint
UPDATE rates SET basis = 'zone' WHERE code = 'zone_half_day';
