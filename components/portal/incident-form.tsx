"use client";

import { useActionState } from "react";
import { saveIncidentAction } from "@/lib/actions/permits";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { severityLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export type IncidentValues = {
  id?: string;
  date: string;
  time: string;
  severity: string;
  title: string;
  description: string;
  actions: string | null;
  zoneId: string | null;
  bookingId: string | null;
  reportedToAuthority: boolean;
  authorityReference: string | null;
  status: "open" | "closed";
};

export function IncidentForm({
  locale,
  incident,
  zones,
  bookings,
}: {
  locale: Locale;
  incident: IncidentValues;
  zones: { id: string; code: string; name: string }[];
  bookings: { id: string; label: string }[];
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveIncidentAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {incident.id && <input type="hidden" name="id" value={incident.id} />}
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("Datum", "Date")} htmlFor="inc_date" required>
          <Input id="inc_date" name="date" type="date" defaultValue={incident.date} required />
        </Field>
        <Field label={t("Uhrzeit", "Time")} htmlFor="inc_time">
          <Input id="inc_time" name="time" type="time" defaultValue={incident.time} />
        </Field>
        <Field label={t("Schwere", "Severity")} htmlFor="inc_severity">
          <Select id="inc_severity" name="severity" defaultValue={incident.severity}>
            {Object.entries(severityLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[locale]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("Kurzbeschreibung", "Summary")} htmlFor="inc_title" required>
        <Input id="inc_title" name="title" defaultValue={incident.title} required minLength={3} />
      </Field>
      <Field label={t("Was ist passiert?", "What happened?")} htmlFor="inc_description" required>
        <Textarea id="inc_description" name="description" rows={4} defaultValue={incident.description} required minLength={3} />
      </Field>
      <Field label={t("Getroffene Maßnahmen", "Actions taken")} htmlFor="inc_actions">
        <Textarea id="inc_actions" name="actions" rows={3} defaultValue={incident.actions ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Zone", "Zone")} htmlFor="inc_zone">
          <Select id="inc_zone" name="zone_id" defaultValue={incident.zoneId ?? ""}>
            <option value="">–</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code} · {z.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Buchung", "Booking")} htmlFor="inc_booking">
          <Select id="inc_booking" name="booking_id" defaultValue={incident.bookingId ?? ""}>
            <option value="">–</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-2">
        <Checkbox name="reported" defaultChecked={incident.reportedToAuthority} label={t("an Behörde gemeldet", "reported to authority")} />
        <Field label={t("Aktenzahl / Meldungsreferenz", "Authority reference")} htmlFor="inc_ref">
          <Input id="inc_ref" name="authority_reference" defaultValue={incident.authorityReference ?? ""} />
        </Field>
      </div>
      <Field label={t("Status", "Status")} htmlFor="inc_status">
        <Select id="inc_status" name="status" defaultValue={incident.status}>
          <option value="open">{t("offen", "open")}</option>
          <option value="closed">{t("abgeschlossen", "closed")}</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {incident.id ? t("Speichern", "Save") : t("Erfassen", "Record")}
      </Button>
    </form>
  );
}
