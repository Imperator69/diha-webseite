-- Ausgestellte Rechnungen sind unveränderlich (§ 11 UStG, § 131 BAO). Korrektur nur per Storno/Gutschrift.
CREATE TRIGGER invoice_lines_frozen_insert BEFORE INSERT ON invoice_lines
WHEN (SELECT status FROM invoices WHERE id = NEW.invoice_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_frozen_update BEFORE UPDATE ON invoice_lines
WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_frozen_delete BEFORE DELETE ON invoice_lines
WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
--> statement-breakpoint
CREATE TRIGGER invoices_frozen_delete BEFORE DELETE ON invoices
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
--> statement-breakpoint
CREATE TRIGGER invoices_frozen_update BEFORE UPDATE OF number, kind, ref_invoice_id, project_id, locale, issue_date, service_from, service_to, recipient, issuer, reverse_charge, net_cents, tax_cents, gross_cents, payment_terms, pdf_key ON invoices
WHEN OLD.status <> 'draft' AND (
  NEW.number IS NOT OLD.number OR NEW.kind IS NOT OLD.kind OR NEW.ref_invoice_id IS NOT OLD.ref_invoice_id OR NEW.project_id IS NOT OLD.project_id
  OR NEW.locale IS NOT OLD.locale OR NEW.issue_date IS NOT OLD.issue_date OR NEW.service_from IS NOT OLD.service_from OR NEW.service_to IS NOT OLD.service_to
  OR NEW.recipient IS NOT OLD.recipient OR NEW.issuer IS NOT OLD.issuer OR NEW.reverse_charge IS NOT OLD.reverse_charge OR NEW.net_cents IS NOT OLD.net_cents
  OR NEW.tax_cents IS NOT OLD.tax_cents OR NEW.gross_cents IS NOT OLD.gross_cents OR NEW.payment_terms IS NOT OLD.payment_terms
  -- das PDF wird nach dem Ausstellen einmalig abgelegt
  OR (NEW.pdf_key IS NOT OLD.pdf_key AND OLD.pdf_key IS NOT NULL)
)
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
--> statement-breakpoint
CREATE TRIGGER payments_restrict_delete BEFORE DELETE ON payments
WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) = 'cancelled'
BEGIN SELECT RAISE(ABORT, 'invoice_frozen'); END;
