"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { FormState } from "@/lib/actions/auth";
import { runJobsNowAction, saveCompanyAction, saveInvoiceSettingsAction, saveOperationsSettingsAction } from "@/lib/actions/settings";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import type { BookingSettings, CompanySettings, InvoiceSettings, RetentionSettings } from "@/lib/settings";
import { FormStatus } from "./form-status";

export function CompanyForm({ locale, value }: { locale: Locale; value: CompanySettings }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveCompanyAction, {});
  const f = (name: string, labelText: string, def: string, props: { type?: string; className?: string; hint?: string } = {}) => (
    <Field label={labelText} htmlFor={`co_${name}`} className={props.className} hint={props.hint}>
      <Input id={`co_${name}`} name={name} defaultValue={def} type={props.type ?? "text"} />
    </Field>
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 md:grid-cols-2">
        {f("name", t("Firmenwortlaut", "Company name"), value.name, { className: "md:col-span-2" })}
        {f("street", t("Straße", "Street"), value.street, { className: "md:col-span-2" })}
        {f("postal_code", t("PLZ", "Postcode"), value.postalCode)}
        {f("city", t("Ort", "City"), value.city)}
        {f("country", t("Land", "Country"), value.country)}
        {f("vat_id", t("UID-Nummer", "VAT ID"), value.vatId, { hint: "ATU…" })}
        {f("company_register", t("Firmenbuchnummer", "Company register no."), value.companyRegister, { hint: "FN …" })}
        {f("court", t("Firmenbuchgericht", "Register court"), value.court)}
        {f("email", t("E-Mail (Rechnungen)", "Email (invoices)"), value.email, { type: "email" })}
        {f("phone", t("Telefon", "Phone"), value.phone)}
        {f("iban", "IBAN", value.iban)}
        {f("bic", "BIC", value.bic)}
        {f("bank", t("Bank", "Bank"), value.bank)}
      </div>
      <p className="text-xs text-fg-muted">
        {t(
          "Diese Daten erscheinen als Aussteller auf Rechnungen (§ 11 UStG). Bereits ausgestellte Rechnungen behalten die Daten zum Ausstellungszeitpunkt.",
          "These details appear as issuer on invoices (§ 11 Austrian VAT Act). Invoices already issued keep the details as at issue.",
        )}
      </p>
      <Button type="submit" disabled={pending}>
        {t("Speichern", "Save")}
      </Button>
    </form>
  );
}

export function InvoiceSettingsForm({ locale, value }: { locale: Locale; value: InvoiceSettings }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveInvoiceSettingsAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("Nummernpräfix", "Number prefix")} htmlFor="inv_prefix" hint={`${value.prefix}-2026-0001`}>
          <Input id="inv_prefix" name="prefix" defaultValue={value.prefix} pattern="[A-Za-z0-9\-]{1,12}" />
        </Field>
        <Field label={t("Zahlungsziel (Tage)", "Payment term (days)")} htmlFor="inv_days">
          <Input id="inv_days" name="payment_days" type="number" min={0} max={120} defaultValue={value.paymentDays} />
        </Field>
        <Field label={t("Standard-Steuersatz", "Default tax rate")} htmlFor="inv_tax">
          <Select id="inv_tax" name="default_tax_rate_bp" defaultValue={String(value.defaultTaxRateBp)}>
            <option value="2000">20 %</option>
            <option value="1300">13 %</option>
            <option value="1000">10 %</option>
            <option value="0">0 %</option>
          </Select>
        </Field>
      </div>
      <Field label={t("Fußtext Rechnung (Deutsch)", "Invoice footer (German)")} htmlFor="inv_fde">
        <Textarea id="inv_fde" name="footer_de" rows={2} defaultValue={value.footerDe} />
      </Field>
      <Field label={t("Fußtext Rechnung (Englisch)", "Invoice footer (English)")} htmlFor="inv_fen">
        <Textarea id="inv_fen" name="footer_en" rows={2} defaultValue={value.footerEn} />
      </Field>
      <p className="text-xs text-fg-muted">
        {t(
          "Die Nummer wird erst beim Ausstellen vergeben, fortlaufend je Kalenderjahr. Ein geändertes Präfix gilt für neue Rechnungen.",
          "Numbers are assigned on issue, sequential per calendar year. A changed prefix applies to new invoices.",
        )}
      </p>
      <Button type="submit" disabled={pending}>
        {t("Speichern", "Save")}
      </Button>
    </form>
  );
}

export function OperationsForm({ locale, retention, booking }: { locale: Locale; retention: RetentionSettings; booking: BookingSettings }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveOperationsSettingsAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("Kontaktanfragen löschen nach (Monate)", "Delete enquiries after (months)")} htmlFor="ret_inq">
          <Input id="ret_inq" name="inquiry_months" type="number" min={1} max={60} defaultValue={retention.inquiryMonths} />
        </Field>
        <Field label={t("Spam löschen nach (Tage)", "Delete spam after (days)")} htmlFor="ret_spam">
          <Input id="ret_spam" name="spam_days" type="number" min={1} max={365} defaultValue={retention.spamDays} />
        </Field>
        <Field label={t("Postausgang löschen nach (Tage)", "Delete outbox after (days)")} htmlFor="ret_out">
          <Input id="ret_out" name="outbox_days" type="number" min={1} max={365} defaultValue={retention.outboxDays} />
        </Field>
        <Field
          label={t("Gästeliste Pflicht ab Gästen", "Guest list required above guests")}
          htmlFor="bk_guests"
          hint={t("Darüber verlangt die Buchung eine Teilnehmer- und Gästeliste.", "Above this, a booking requires a participant and guest list.")}
        >
          <Input id="bk_guests" name="guest_threshold" type="number" min={1} max={1000} defaultValue={booking.guestThreshold} />
        </Field>
      </div>
      <p className="text-xs text-fg-muted">
        {t(
          "Rechnungen, Zahlungen und Buchungsbelege werden nicht automatisch gelöscht (Aufbewahrung 7 Jahre, § 132 BAO).",
          "Invoices, payments and booking records are never deleted automatically (7-year retention, § 132 Austrian Federal Fiscal Code).",
        )}
      </p>
      <Button type="submit" disabled={pending}>
        {t("Speichern", "Save")}
      </Button>
    </form>
  );
}

export function RunJobsForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(runJobsNowAction, {});
  const r = state.data as { digestItems?: number; newItems?: number; mails?: number; permitsExpired?: number; purged?: Record<string, number> } | undefined;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="secondary" disabled={pending}>
        <Play className="size-4" />
        {pending ? t("Läuft …", "Running …") : t("Tagesjobs jetzt ausführen", "Run daily jobs now")}
      </Button>
      {state.error && <FormStatus state={state} locale={locale} />}
      {r && (
        <ul className="space-y-0.5 text-xs text-fg-muted" aria-live="polite">
          <li>
            {t("Offene Fristen", "Open deadlines")}: {r.digestItems} ({t("neu", "new")}: {r.newItems})
          </li>
          <li>
            {t("E-Mails", "Emails")}: {r.mails}
          </li>
          <li>
            {t("Genehmigungen auf „abgelaufen“ gesetzt", "Permits set to expired")}: {r.permitsExpired}
          </li>
          <li>
            {t("Gelöscht", "Deleted")}: {Object.entries(r.purged ?? {}).map(([k, v]) => `${k} ${v}`).join(", ")}
          </li>
        </ul>
      )}
    </form>
  );
}
