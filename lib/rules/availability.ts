import { addDays, isoWeekday, overlaps, zonedToUtc } from "@/lib/time";
import { activitiesConflict, type Block, type OtherBooking, type RuleActivity, type RuleZone } from "./engine";

export type SlotTemplate = { id: string; zoneId: string | null; nameDe: string; nameEn: string; startTime: string; endTime: string; weekdays: number[]; active: boolean };

export type CellStatus = "free" | "busy" | "conflict" | "blocked" | "lead" | "past" | "selected";

export type Cell = {
  key: string;
  date: string;
  slotId: string;
  label: { de: string; en: string };
  startTime: string;
  endTime: string;
  startsAt: number;
  endsAt: number;
  status: CellStatus;
};

/**
 * Verfügbarkeit je Tag und Slot für die gewählten Zonen und Nutzungsarten.
 * Belegt = Kapazität einer gewählten Zone erschöpft; Konflikt = ausgeschlossene Nutzung am Gelände.
 */
export function weekAvailability(opts: {
  weekStart: string;
  days?: number;
  slots: SlotTemplate[];
  zones: RuleZone[];
  zoneIds: string[];
  activityCodes: string[];
  activities: RuleActivity[];
  others: OtherBooking[];
  blocks: Block[];
  nowMs: number;
  leadDays: number;
}): Cell[] {
  const days = opts.days ?? 7;
  const selectedZones = opts.zones.filter((z) => opts.zoneIds.includes(z.id));
  const mine = opts.activities.filter((a) => opts.activityCodes.includes(a.code));
  const leadLimit = opts.nowMs + opts.leadDays * 86_400_000;
  const cells: Cell[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(opts.weekStart, i);
    const wd = isoWeekday(date);
    const applicable = opts.slots
      .filter((s) => s.active && s.weekdays.includes(wd) && (s.zoneId === null || opts.zoneIds.length === 0 || opts.zoneIds.includes(s.zoneId)))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const s of applicable) {
      const startsAt = zonedToUtc(date, s.startTime);
      const endsAt = zonedToUtc(date, s.endTime);
      let status: CellStatus = "free";
      if (startsAt < opts.nowMs) status = "past";
      else if (startsAt < leadLimit) status = "lead";
      else if (opts.blocks.some((b) => (b.zoneId === null || opts.zoneIds.includes(b.zoneId)) && overlaps(startsAt, endsAt, b.startsAt, b.endsAt))) status = "blocked";
      else {
        const overlapping = opts.others.filter((o) => o.periods.some((p) => overlaps(startsAt, endsAt, p.startsAt, p.endsAt)));
        if (selectedZones.some((z) => overlapping.filter((o) => o.zoneIds.includes(z.id)).length >= Math.max(z.capacity, 0))) status = "busy";
        else if (
          overlapping.some((o) => opts.activities.filter((a) => o.activityCodes.includes(a.code)).some((theirs) => mine.some((m) => activitiesConflict(m, theirs))))
        )
          status = "conflict";
      }
      cells.push({ key: `${date}|${s.id}`, date, slotId: s.id, label: { de: s.nameDe, en: s.nameEn }, startTime: s.startTime, endTime: s.endTime, startsAt, endsAt, status });
    }
  }
  return cells;
}
