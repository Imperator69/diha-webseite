"use client";

import { useActionState } from "react";
import { createBlockAction } from "@/lib/actions/site";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { blockReasonLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export function BlockForm({ locale, zones }: { locale: Locale; zones: { id: string; code: string; name: string }[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(createBlockAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Sperrzeit eingetragen.", "Blackout added.")} />
      <Field label={t("Bereich", "Area")} htmlFor="zone_id">
        <Select id="zone_id" name="zone_id" defaultValue="">
          <option value="">{t("Gesamtes Gelände", "Entire site")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.code} {z.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Von (Datum)", "From (date)")} htmlFor="from_date" required>
          <Input id="from_date" name="from_date" type="date" required />
        </Field>
        <Field label={t("Uhrzeit", "Time")} htmlFor="from_time">
          <Input id="from_time" name="from_time" type="time" defaultValue="00:00" />
        </Field>
        <Field label={t("Bis (Datum)", "To (date)")} htmlFor="to_date">
          <Input id="to_date" name="to_date" type="date" />
        </Field>
        <Field label={t("Uhrzeit", "Time")} htmlFor="to_time">
          <Input id="to_time" name="to_time" type="time" defaultValue="23:59" />
        </Field>
      </div>
      <Field label={t("Grund", "Reason")} htmlFor="reason">
        <Select id="reason" name="reason" defaultValue="quarry_blasting">
          {Object.entries(blockReasonLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v[locale]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("Notiz", "Note")} htmlFor="note">
        <Input id="note" name="note" />
      </Field>
      <Button type="submit" disabled={pending}>
        {t("Sperrzeit eintragen", "Add blackout")}
      </Button>
    </form>
  );
}
