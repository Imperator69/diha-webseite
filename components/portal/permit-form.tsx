"use client";

import { useActionState } from "react";
import { savePermitAction } from "@/lib/actions/permits";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { authorityLabels, permitKindLabels, permitStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export type PermitValues = {
  id?: string;
  title: string;
  authority: string;
  kind: string;
  status: string;
  referenceNo: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  nextDeadline: string | null;
  nextDeadlineNote: string | null;
  responsibleUserId: string | null;
  zoneId: string | null;
  notes: string | null;
};

export function PermitForm({ locale, permit, staff, zones }: { locale: Locale; permit: PermitValues; staff: { id: string; name: string }[]; zones: { id: string; code: string }[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(savePermitAction, {});
  const opts = (map: Record<string, { de: string; en: string }>) =>
    Object.entries(map).map(([k, v]) => (
      <option key={k} value={k}>
        {v[locale]}
      </option>
    ));
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {permit.id && <input type="hidden" name="id" value={permit.id} />}
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <Field label={t("Bezeichnung", "Title")} htmlFor="title" required>
        <Input id="title" name="title" defaultValue={permit.title} required />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("Behörde / Stelle", "Authority / body")} htmlFor="authority">
          <Select id="authority" name="authority" defaultValue={permit.authority}>
            {opts(authorityLabels)}
          </Select>
        </Field>
        <Field label={t("Art", "Type")} htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={permit.kind}>
            {opts(permitKindLabels)}
          </Select>
        </Field>
        <Field label={t("Status", "Status")} htmlFor="status">
          <Select id="status" name="status" defaultValue={permit.status}>
            {opts(permitStatusLabels)}
          </Select>
        </Field>
        <Field label={t("Aktenzahl / Referenz", "Reference no.")} htmlFor="reference_no">
          <Input id="reference_no" name="reference_no" defaultValue={permit.referenceNo ?? ""} />
        </Field>
        <Field label={t("Eingereicht am", "Submitted on")} htmlFor="submitted_at">
          <Input id="submitted_at" name="submitted_at" type="date" defaultValue={permit.submittedAt ?? ""} />
        </Field>
        <Field label={t("Entschieden am", "Decided on")} htmlFor="decided_at">
          <Input id="decided_at" name="decided_at" type="date" defaultValue={permit.decidedAt ?? ""} />
        </Field>
        <Field label={t("Gültig ab", "Valid from")} htmlFor="valid_from">
          <Input id="valid_from" name="valid_from" type="date" defaultValue={permit.validFrom ?? ""} />
        </Field>
        <Field label={t("Gültig bis", "Valid until")} htmlFor="valid_until" hint={t("Erinnerung 60 Tage vorher", "Reminder 60 days before")}>
          <Input id="valid_until" name="valid_until" type="date" defaultValue={permit.validUntil ?? ""} />
        </Field>
        <Field label={t("Verantwortlich", "Responsible")} htmlFor="responsible_user_id">
          <Select id="responsible_user_id" name="responsible_user_id" defaultValue={permit.responsibleUserId ?? ""}>
            <option value="">–</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Nächste Frist", "Next deadline")} htmlFor="next_deadline" hint={t("Erinnerung 14 Tage vorher", "Reminder 14 days before")}>
          <Input id="next_deadline" name="next_deadline" type="date" defaultValue={permit.nextDeadline ?? ""} />
        </Field>
        <Field label={t("Was ist zu tun?", "What needs doing?")} htmlFor="next_deadline_note" className="md:col-span-2">
          <Input id="next_deadline_note" name="next_deadline_note" defaultValue={permit.nextDeadlineNote ?? ""} />
        </Field>
        <Field label={t("Betrifft Zone", "Concerns zone")} htmlFor="zone_id">
          <Select id="zone_id" name="zone_id" defaultValue={permit.zoneId ?? ""}>
            <option value="">{t("Gesamtes Gelände", "Entire site")}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("Notizen", "Notes")} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={permit.notes ?? ""} rows={4} />
      </Field>
      <Button type="submit" disabled={pending}>
        {permit.id ? t("Speichern", "Save") : t("Anlegen", "Create")}
      </Button>
    </form>
  );
}
