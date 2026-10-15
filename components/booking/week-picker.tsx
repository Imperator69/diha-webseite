"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatTime, formatWeekday } from "@/lib/i18n/format";
import { translator } from "@/lib/i18n/t";
import { weekAvailability, type CellStatus } from "@/lib/rules/availability";
import { addDays, overlaps, startOfIsoWeek, zonedDate, zonedToUtc, isValidDate, isValidTime } from "@/lib/time";
import type { WizardData } from "./types";

type Period = { startsAt: number; endsAt: number };

const statusStyle: Record<CellStatus, string> = {
  free: "bg-ok/10 text-fg ring-ok/30 hover:bg-ok/20",
  selected: "bg-signal text-white ring-signal",
  busy: "bg-bg-subtle text-fg-muted ring-border line-through cursor-not-allowed",
  conflict: "bg-warn/10 text-warn ring-warn/30 cursor-not-allowed",
  blocked: "bg-danger/10 text-danger ring-danger/30 cursor-not-allowed",
  lead: "bg-bg-subtle text-fg-muted ring-border cursor-not-allowed",
  past: "bg-transparent text-fg-muted/50 ring-border/50 cursor-not-allowed",
};

export function WeekPicker({
  locale,
  data,
  zoneIds,
  activityCodes,
  leadDays,
  periods,
  onChange,
}: {
  locale: Locale;
  data: WizardData;
  zoneIds: string[];
  activityCodes: string[];
  leadDays: number;
  periods: Period[];
  onChange: (periods: Period[]) => void;
}) {
  const t = translator(locale);
  const enforceLead = !data.staff && !data.leadTimeOverride;
  const firstFree = zonedDate(data.nowMs + (enforceLead ? leadDays : 0) * 86_400_000);
  const [weekStart, setWeekStart] = useState(startOfIsoWeek(periods.length ? zonedDate(periods[0].startsAt) : firstFree));
  const [custom, setCustom] = useState({ from: "", fromTime: "08:00", to: "", toTime: "17:00" });

  const cells = useMemo(
    () =>
      weekAvailability({
        weekStart,
        slots: data.slots,
        zones: data.zones,
        zoneIds,
        activityCodes,
        activities: data.activities,
        others: data.others,
        blocks: data.blocks,
        nowMs: data.nowMs,
        leadDays: enforceLead ? leadDays : 0,
      }),
    [weekStart, data, zoneIds, activityCodes, leadDays, enforceLead],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isSelected = (s: number, e: number) => periods.some((p) => p.startsAt === s && p.endsAt === e);

  const toggle = (startsAt: number, endsAt: number) => {
    if (isSelected(startsAt, endsAt)) onChange(periods.filter((p) => !(p.startsAt === startsAt && p.endsAt === endsAt)));
    else onChange([...periods.filter((p) => !overlaps(p.startsAt, p.endsAt, startsAt, endsAt)), { startsAt, endsAt }].sort((a, b) => a.startsAt - b.startsAt));
  };

  const addCustom = () => {
    const to = custom.to || custom.from;
    if (!isValidDate(custom.from) || !isValidDate(to) || !isValidTime(custom.fromTime) || !isValidTime(custom.toTime)) return;
    const startsAt = zonedToUtc(custom.from, custom.fromTime);
    const endsAt = zonedToUtc(to, custom.toTime);
    if (endsAt <= startsAt) return;
    onChange([...periods.filter((p) => !overlaps(p.startsAt, p.endsAt, startsAt, endsAt)), { startsAt, endsAt }].sort((a, b) => a.startsAt - b.startsAt));
  };

  const legend: [CellStatus, string][] = [
    ["free", t("frei", "free")],
    ["selected", t("gewählt", "selected")],
    ["busy", t("belegt", "booked")],
    ["conflict", t("nicht parallel möglich", "not possible in parallel")],
    ["blocked", t("gesperrt", "blocked")],
    ["lead", t("Vorlaufzeit", "lead time")],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t("Vorherige Woche", "Previous week")}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-56 text-center text-sm font-semibold">
            {formatDate(weekStart, locale)} – {formatDate(addDays(weekStart, 6), locale)}
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t("Nächste Woche", "Next week")}>
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setWeekStart(startOfIsoWeek(firstFree))}>
            {t("Erster möglicher Termin", "First possible date")}
          </Button>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-fg-muted">
          {legend.map(([s, l]) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={clsx("inline-block size-3 rounded ring-1", statusStyle[s].split(" hover:")[0])} />
              {l}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="grid" aria-label={t("Verfügbare Zeitfenster", "Available time slots")}>
        {days.map((d) => {
          const dayCells = cells.filter((c) => c.date === d);
          return (
            <div key={d} className="rounded-xl border border-border bg-card p-2" role="row">
              <p className="mb-2 text-center text-xs font-semibold">
                {formatWeekday(zonedToUtc(d, "12:00"), locale)} <span className="font-normal text-fg-muted">{formatDate(d, locale).slice(0, 6)}</span>
              </p>
              <div className="space-y-1.5">
                {dayCells.length === 0 && <p className="py-3 text-center text-[11px] text-fg-muted">{t("geschlossen", "closed")}</p>}
                {dayCells.map((c) => {
                  const selected = isSelected(c.startsAt, c.endsAt);
                  const status: CellStatus = selected ? "selected" : c.status;
                  const clickable = selected || c.status === "free";
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="gridcell"
                      aria-pressed={selected}
                      aria-disabled={!clickable}
                      disabled={!clickable}
                      onClick={() => toggle(c.startsAt, c.endsAt)}
                      className={clsx("block w-full rounded-lg px-2 py-1.5 text-left text-xs ring-1 transition-colors", statusStyle[status])}
                    >
                      <span className="block font-semibold">{locale === "en" ? c.label.en : c.label.de}</span>
                      <span className="tabular-nums">
                        {c.startTime}–{c.endTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("Eigenen Zeitraum hinzufügen (z. B. mehrtägig oder Werkstatt-Miete)", "Add a custom period (e.g. multi-day or workshop rental)")}</summary>
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_120px_1fr_120px_auto]">
          <label className="text-xs font-medium">
            {t("Von", "From")}
            <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="mt-1" />
          </label>
          <label className="text-xs font-medium">
            {t("Uhrzeit", "Time")}
            <Input type="time" value={custom.fromTime} onChange={(e) => setCustom({ ...custom, fromTime: e.target.value })} className="mt-1" />
          </label>
          <label className="text-xs font-medium">
            {t("Bis", "To")}
            <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="mt-1" />
          </label>
          <label className="text-xs font-medium">
            {t("Uhrzeit", "Time")}
            <Input type="time" value={custom.toTime} onChange={(e) => setCustom({ ...custom, toTime: e.target.value })} className="mt-1" />
          </label>
          <Button type="button" variant="secondary" onClick={addCustom}>
            <Plus className="size-4" />
            {t("Hinzufügen", "Add")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-fg-muted">{t("Eigene Zeiträume werden beim Absenden genauso auf Belegung und Sperrzeiten geprüft.", "Custom periods are checked for occupancy and blackouts just the same.")}</p>
      </details>

      <div>
        <h3 className="text-sm font-semibold">
          {t("Gewählte Termine", "Selected dates")} ({periods.length})
        </h3>
        {periods.length === 0 ? (
          <p className="mt-1 text-sm text-fg-muted">{t("Noch kein Termin gewählt.", "No date selected yet.")}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {periods.map((p) => (
              <li key={`${p.startsAt}-${p.endsAt}`} className="inline-flex items-center gap-2 rounded-full bg-bg-subtle px-3 py-1 text-xs ring-1 ring-border">
                {formatDateTime(p.startsAt, locale)} – {zonedDate(p.endsAt) === zonedDate(p.startsAt) ? formatTime(p.endsAt, locale) : formatDateTime(p.endsAt, locale)}
                <button type="button" onClick={() => onChange(periods.filter((x) => x !== p))} aria-label={t("Entfernen", "Remove")} className="text-fg-muted hover:text-danger">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
