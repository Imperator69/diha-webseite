import { asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { deleteSlotTemplateAction, saveSlotTemplateAction } from "@/lib/actions/site";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

const weekdayNames = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

type Slot = typeof schema.slotTemplates.$inferSelect;
type Zone = { id: string; code: string };

function SlotForm({ locale, slot, zones }: { locale: "de" | "en"; slot?: Slot; zones: Zone[] }) {
  const t = translator(locale);
  return (
    <form action={saveSlotTemplateAction} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_130px_130px] xl:grid-cols-[1fr_1fr_130px_130px_150px_auto_auto]">
      <input type="hidden" name="locale" value={locale} />
      {slot && <input type="hidden" name="id" value={slot.id} />}
      <label className="text-xs font-medium">
        {t("Name DE", "Name DE")}
        <Input name="name_de" defaultValue={slot?.nameDe} required className="mt-1" />
      </label>
      <label className="text-xs font-medium">
        {t("Name EN", "Name EN")}
        <Input name="name_en" defaultValue={slot?.nameEn} className="mt-1" />
      </label>
      <label className="text-xs font-medium">
        {t("Von", "From")}
        <Input name="start_time" type="time" defaultValue={slot?.startTime ?? "08:00"} required className="mt-1" />
      </label>
      <label className="text-xs font-medium">
        {t("Bis", "To")}
        <Input name="end_time" type="time" defaultValue={slot?.endTime ?? "12:00"} required className="mt-1" />
      </label>
      <label className="text-xs font-medium">
        {t("Gilt für", "Applies to")}
        <Select name="zone_id" defaultValue={slot?.zoneId ?? ""} className="mt-1">
          <option value="">{t("alle Zonen", "all zones")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.code}
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="flex flex-wrap gap-2 text-xs">
        {weekdayNames[locale].map((d, i) => (
          <label key={d} className="flex items-center gap-1">
            <input type="checkbox" name="weekdays" value={i + 1} defaultChecked={slot ? slot.weekdays.includes(i + 1) : i < 5} className="accent-signal" />
            {d}
          </label>
        ))}
        <label className="flex items-center gap-1 font-medium">
          <input type="checkbox" name="active" defaultChecked={slot?.active ?? true} className="accent-signal" />
          {t("aktiv", "active")}
        </label>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {slot ? t("Speichern", "Save") : t("Hinzufügen", "Add")}
        </Button>
      </div>
    </form>
  );
}

export default async function SlotsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const slots = await db().select().from(schema.slotTemplates).orderBy(asc(schema.slotTemplates.sortOrder), asc(schema.slotTemplates.startTime));
  const zones = await db().select({ id: schema.zones.id, code: schema.zones.code }).from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  const q = await searchParams;
  return (
    <>
      <PageHeader
        title={t("Slot-Vorlagen", "Slot templates")}
        description={t(
          "Zeitfenster, die Projekte im Kalender buchen können. Sperrzeiten des Abbaubetriebs werden zusätzlich berücksichtigt.",
          "Time windows projects can book in the calendar. Quarry blackout periods are applied on top.",
        )}
      />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Gespeichert.", "Saved.")}</Alert>}
      {sp(q.error) && <Alert tone="danger" className="mb-4">{t("Bitte Name, Zeiten (Ende nach Beginn) und Wochentage angeben.", "Please enter name, times (end after start) and weekdays.")}</Alert>}
      <Card className="mb-6">
        <CardHeader title={t("Bestehende Vorlagen", "Existing templates")} />
        <CardBody className="divide-y divide-border">
          {slots.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
              <SlotForm locale={locale} slot={s} zones={zones} />
              <form action={deleteSlotTemplateAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className="text-xs text-danger hover:underline">
                  {t("Löschen", "Delete")}
                </button>
              </form>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Neue Vorlage", "New template")} />
        <CardBody>
          <SlotForm locale={locale} zones={zones} />
        </CardBody>
      </Card>
    </>
  );
}
