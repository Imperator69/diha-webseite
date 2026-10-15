-- Start-Tarife nur für die passende Nutzungsart (bestehende Datenbanken; neue erhalten das über 0001)
UPDATE rates SET activity_code = 'workshop' WHERE code = 'workshop_month' AND activity_code IS NULL;
--> statement-breakpoint
UPDATE rates SET activity_code = 'ground_energetics' WHERE code = 'energetics_surcharge' AND activity_code IS NULL;
