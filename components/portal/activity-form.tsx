"use client";

import { useActionState } from "react";
import { saveActivityAction } from "@/lib/actions/site";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { activityCategoryLabels, docKindLabels, personRoleLabels, zoneKindLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export type ActivityValues = {
  id?: string;
  code: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  category: string;
  allowedZoneKinds: string[];
  requiredRoles: string[];
  requiredDocs: string[];
  conflictsWith: string[];
  detailFields: unknown[];
  checklist: unknown[];
  conditional: unknown[];
  leadDays: number;
  requiresSiteClearance: boolean;
  active: boolean;
  sortOrder: number;
};

function CheckGroup({ name, legend, options, selected, locale }: { name: string; legend: string; options: Record<string, { de: string; en: string }>; selected: string[]; locale: Locale }) {
  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {Object.entries(options).map(([k, v]) => (
          <label key={k} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} className="mt-0.5 size-4 accent-signal" />
            {v[locale]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ActivityForm({ locale, activity, otherCodes }: { locale: Locale; activity: ActivityValues; otherCodes: { code: string; name: string }[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveActivityAction, {});
  const conflictOptions: Record<string, { de: string; en: string }> = {};
  for (const [k, v] of Object.entries(activityCategoryLabels)) conflictOptions[k] = { de: `${t("Kategorie", "Category")}: ${v.de}`, en: `Category: ${v.en}` };
  for (const o of otherCodes) conflictOptions[o.code] = { de: o.name, en: o.name };
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {activity.id && <input type="hidden" name="id" value={activity.id} />}
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      {state.message === "json" && <p className="text-sm text-danger">{t("Die erweiterten Felder enthalten ungültiges JSON.", "The advanced fields contain invalid JSON.")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("Code (technisch)", "Code (technical)")} htmlFor="code" hint="a-z, 0-9, _" required>
          <Input id="code" name="code" defaultValue={activity.code} pattern="[a-z][a-z0-9_]{2,40}" required />
        </Field>
        <Field label={t("Kategorie", "Category")} htmlFor="category">
          <Select id="category" name="category" defaultValue={activity.category}>
            {Object.entries(activityCategoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[locale]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Name (Deutsch)", "Name (German)")} htmlFor="name_de" required>
          <Input id="name_de" name="name_de" defaultValue={activity.nameDe} required />
        </Field>
        <Field label={t("Name (Englisch)", "Name (English)")} htmlFor="name_en">
          <Input id="name_en" name="name_en" defaultValue={activity.nameEn} />
        </Field>
        <Field label={t("Beschreibung (Deutsch)", "Description (German)")} htmlFor="desc_de">
          <Textarea id="desc_de" name="desc_de" defaultValue={activity.descDe} rows={3} />
        </Field>
        <Field label={t("Beschreibung (Englisch)", "Description (English)")} htmlFor="desc_en">
          <Textarea id="desc_en" name="desc_en" defaultValue={activity.descEn} rows={3} />
        </Field>
        <Field label={t("Vorlaufzeit (Tage)", "Lead time (days)")} htmlFor="lead_days">
          <Input id="lead_days" name="lead_days" type="number" min={0} max={365} defaultValue={activity.leadDays} />
        </Field>
        <Field label={t("Reihenfolge", "Order")} htmlFor="sort_order">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={activity.sortOrder} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox name="requires_site_clearance" defaultChecked={activity.requiresSiteClearance} label={t("Schlussfreigabe des Geländes nach Abschluss erforderlich", "Site clearance required after completion")} />
        <Checkbox name="active" defaultChecked={activity.active} label={t("Buchbar (aktiv)", "Bookable (active)")} />
      </div>
      <CheckGroup name="zone_kinds" legend={t("Erlaubte Zonentypen", "Allowed zone types")} options={zoneKindLabels} selected={activity.allowedZoneKinds} locale={locale} />
      <CheckGroup name="roles" legend={t("Pflichtpersonen (vor Ort benannt)", "Required persons (named, on site)")} options={personRoleLabels} selected={activity.requiredRoles} locale={locale} />
      <CheckGroup name="docs" legend={t("Pflichtunterlagen", "Required documents")} options={docKindLabels} selected={activity.requiredDocs} locale={locale} />
      <CheckGroup name="conflicts" legend={t("Nicht gleichzeitig mit (gesamtes Gelände)", "Not at the same time as (entire site)")} options={conflictOptions} selected={activity.conflictsWith} locale={locale} />
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("Erweitert: Formularfelder, Checkliste, Bedingungen (JSON)", "Advanced: form fields, checklist, conditions (JSON)")}</summary>
        <div className="mt-4 space-y-4">
          <Field label={t("Formularfelder für Projekte", "Form fields for projects")} htmlFor="detail_fields" hint='[{"key":"uas_model","type":"text","de":"UAS-Typ","en":"UAS type","required":true}]'>
            <Textarea id="detail_fields" name="detail_fields" rows={10} className="font-mono text-xs" defaultValue={JSON.stringify(activity.detailFields, null, 2)} />
          </Field>
          <Field label={t("Prüf-Checkliste für Manager", "Review checklist for managers")} htmlFor="checklist">
            <Textarea id="checklist" name="checklist" rows={6} className="font-mono text-xs" defaultValue={JSON.stringify(activity.checklist, null, 2)} />
          </Field>
          <Field label={t("Bedingte Anforderungen", "Conditional requirements")} htmlFor="conditional" hint='[{"field":"transmits","equals":true,"doc":"radio_license"}]'>
            <Textarea id="conditional" name="conditional" rows={4} className="font-mono text-xs" defaultValue={JSON.stringify(activity.conditional, null, 2)} />
          </Field>
        </div>
      </details>
      <Button type="submit" disabled={pending}>
        {t("Speichern", "Save")}
      </Button>
    </form>
  );
}
