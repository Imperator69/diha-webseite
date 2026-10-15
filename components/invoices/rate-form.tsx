"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { FormStatus } from "@/components/portal/form-status";
import type { FormState } from "@/lib/actions/auth";
import { saveRateAction } from "@/lib/actions/invoices";
import type { Locale } from "@/lib/i18n/config";
import { rateUnitLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";

export type RateValues = {
  id?: string;
  code: string;
  nameDe: string;
  nameEn: string;
  unit: string;
  basis: string;
  price: string;
  taxRateBp: number;
  zoneId: string | null;
  activityCode: string | null;
  active: boolean;
  sortOrder: number;
};

export function RateForm({ locale, rate, zones, activities }: { locale: Locale; rate: RateValues; zones: { id: string; code: string }[]; activities: { code: string; name: string }[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveRateAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {rate.id && <input type="hidden" name="id" value={rate.id} />}
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Bezeichnung (Deutsch)", "Name (German)")} htmlFor="rate_de" required>
          <Input id="rate_de" name="name_de" defaultValue={rate.nameDe} required />
        </Field>
        <Field label={t("Bezeichnung (Englisch)", "Name (English)")} htmlFor="rate_en" required>
          <Input id="rate_en" name="name_en" defaultValue={rate.nameEn} required />
        </Field>
        <Field label={t("Kürzel", "Code")} htmlFor="rate_code" hint="a-z, 0-9, _" required>
          <Input id="rate_code" name="code" defaultValue={rate.code} required pattern="[a-zA-Z0-9_\-]{2,40}" />
        </Field>
        <Field label={t("Preis netto (€)", "Net price (€)")} htmlFor="rate_price" required>
          <Input id="rate_price" name="price" inputMode="decimal" defaultValue={rate.price} required />
        </Field>
        <Field label={t("Einheit", "Unit")} htmlFor="rate_unit">
          <Select id="rate_unit" name="unit" defaultValue={rate.unit}>
            {Object.entries(rateUnitLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[locale]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Bezug", "Basis")} htmlFor="rate_basis">
          <Select id="rate_basis" name="basis" defaultValue={rate.basis}>
            <option value="booking">{t("je Buchung", "per booking")}</option>
            <option value="zone">{t("je gebuchter Zone", "per booked zone")}</option>
            <option value="person">{t("je Person", "per person")}</option>
          </Select>
        </Field>
        <Field label={t("Steuersatz", "Tax rate")} htmlFor="rate_tax">
          <Select id="rate_tax" name="tax_rate_bp" defaultValue={String(rate.taxRateBp)}>
            {[2000, 1300, 1000, 0].map((r) => (
              <option key={r} value={r}>
                {r / 100} %
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Reihenfolge", "Sort order")} htmlFor="rate_sort">
          <Input id="rate_sort" name="sort_order" type="number" defaultValue={rate.sortOrder} />
        </Field>
        <Field label={t("Nur für Zone", "Only for zone")} htmlFor="rate_zone">
          <Select id="rate_zone" name="zone_id" defaultValue={rate.zoneId ?? ""}>
            <option value="">{t("alle", "all")}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Nur für Nutzungsart", "Only for type of use")} htmlFor="rate_activity">
          <Select id="rate_activity" name="activity_code" defaultValue={rate.activityCode ?? ""}>
            <option value="">{t("alle", "all")}</option>
            {activities.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox name="active" defaultChecked={rate.active} label={t("aktiv (wird in Preisschätzung und Rechnungsentwürfen verwendet)", "active (used in estimates and draft invoices)")} />
      <Button type="submit" disabled={pending}>
        {rate.id ? t("Speichern", "Save") : t("Anlegen", "Create")}
      </Button>
    </form>
  );
}
