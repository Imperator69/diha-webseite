"use client";

import { useActionState } from "react";
import { saveProjectAction } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { admissionCheckLabels, admissionStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export type ProjectFormValues = {
  id?: string;
  name?: string;
  organization?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string;
  vatId?: string | null;
  companyRegister?: string | null;
  invoiceLocale?: string;
  admissionStatus?: string;
  admissionChecks?: Record<string, boolean> | null;
  notes?: string | null;
  status?: string;
};

export function ProjectForm({ locale, project = {} }: { locale: Locale; project?: ProjectFormValues }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveProjectAction, {});
  const checks = project.admissionChecks ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {project.id && <input type="hidden" name="id" value={project.id} />}
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Projektname", "Project name")} htmlFor="name" required>
          <Input id="name" name="name" defaultValue={project.name} required />
        </Field>
        <Field label={t("Organisation / Firma", "Organisation / company")} htmlFor="organization" required>
          <Input id="organization" name="organization" defaultValue={project.organization} required />
        </Field>
        <Field label={t("Ansprechpartner:in", "Contact person")} htmlFor="contact_name">
          <Input id="contact_name" name="contact_name" defaultValue={project.contactName ?? ""} />
        </Field>
        <Field label={t("E-Mail (Rechnungen, Status)", "Email (invoices, status)")} htmlFor="contact_email">
          <Input id="contact_email" name="contact_email" type="email" defaultValue={project.contactEmail ?? ""} />
        </Field>
        <Field label={t("Telefon", "Phone")} htmlFor="contact_phone">
          <Input id="contact_phone" name="contact_phone" defaultValue={project.contactPhone ?? ""} />
        </Field>
        <Field label={t("Straße", "Street")} htmlFor="street">
          <Input id="street" name="street" defaultValue={project.street ?? ""} />
        </Field>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label={t("PLZ", "Postcode")} htmlFor="postal_code">
            <Input id="postal_code" name="postal_code" defaultValue={project.postalCode ?? ""} />
          </Field>
          <Field label={t("Ort", "City")} htmlFor="city">
            <Input id="city" name="city" defaultValue={project.city ?? ""} />
          </Field>
        </div>
        <Field label={t("Land (ISO, z. B. AT, DE)", "Country (ISO, e.g. AT, DE)")} htmlFor="country" required>
          <Input id="country" name="country" maxLength={2} defaultValue={project.country ?? "AT"} required />
        </Field>
        <Field label={t("UID-Nummer", "VAT ID")} htmlFor="vat_id">
          <Input id="vat_id" name="vat_id" defaultValue={project.vatId ?? ""} />
        </Field>
        <Field label={t("Firmenbuchnummer", "Company register no.")} htmlFor="company_register">
          <Input id="company_register" name="company_register" defaultValue={project.companyRegister ?? ""} />
        </Field>
        <Field label={t("Rechnungssprache", "Invoice language")} htmlFor="invoice_locale">
          <Select id="invoice_locale" name="invoice_locale" defaultValue={project.invoiceLocale ?? "de"}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label={t("Status", "Status")} htmlFor="status">
          <Select id="status" name="status" defaultValue={project.status ?? "active"}>
            <option value="active">{t("Aktiv", "Active")}</option>
            <option value="archived">{t("Archiviert", "Archived")}</option>
          </Select>
        </Field>
      </div>
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{t("Zulassungsprüfung", "Admission check")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(admissionCheckLabels).map(([key, text]) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name={`check_${key}`} defaultChecked={Boolean(checks[key])} className="mt-0.5 size-4 accent-signal" />
              {text[locale]}
            </label>
          ))}
        </div>
        <div className="mt-4 max-w-xs">
          <Field label={t("Ergebnis", "Result")} htmlFor="admission_status">
            <Select id="admission_status" name="admission_status" defaultValue={project.admissionStatus ?? "pending"}>
              {Object.entries(admissionStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[locale]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>
      <Field label={t("Interne Notizen", "Internal notes")} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={project.notes ?? ""} />
      </Field>
      <Button type="submit" disabled={pending}>
        {project.id ? t("Speichern", "Save") : t("Projekt anlegen", "Create project")}
      </Button>
    </form>
  );
}
