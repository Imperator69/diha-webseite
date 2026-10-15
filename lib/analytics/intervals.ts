// Intervallrechnung für die Auslastung (reine Funktionen).
import { addDays, isoWeekday, zonedToUtc } from "@/lib/time";

export type Interval = [number, number];

export function union(list: Interval[]): Interval[] {
  const sorted = list
    .filter(([s, e]) => e > s)
    .map(([s, e]) => [s, e] as Interval)
    .sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  const ua = union(a);
  const ub = union(b);
  let i = 0;
  let j = 0;
  while (i < ua.length && j < ub.length) {
    const s = Math.max(ua[i][0], ub[j][0]);
    const e = Math.min(ua[i][1], ub[j][1]);
    if (e > s) out.push([s, e]);
    if (ua[i][1] < ub[j][1]) i++;
    else j++;
  }
  return out;
}

export function subtract(a: Interval[], b: Interval[]): Interval[] {
  let rest = union(a);
  for (const [bs, be] of union(b)) {
    const next: Interval[] = [];
    for (const [s, e] of rest) {
      if (be <= s || bs >= e) next.push([s, e]);
      else {
        if (bs > s) next.push([s, bs]);
        if (be < e) next.push([be, e]);
      }
    }
    rest = next;
  }
  return rest;
}

export function measure(list: Interval[]): number {
  return union(list).reduce((sum, [s, e]) => sum + (e - s), 0);
}

type Slot = { zoneId: string | null; startTime: string; endTime: string; weekdays: number[]; active: boolean };
type BlockLike = { zoneId: string | null; startsAt: number; endsAt: number };

/** Betriebsfenster einer Zone an einem Tag: Vereinigung der passenden Slot-Vorlagen abzüglich Sperrzeiten. */
export function openWindows(day: string, zoneId: string, slots: Slot[], blocks: BlockLike[]): Interval[] {
  const wd = isoWeekday(day);
  const windows = slots
    .filter((s) => s.active && (s.zoneId === null || s.zoneId === zoneId) && s.weekdays.includes(wd))
    .map((s) => [zonedToUtc(day, s.startTime), zonedToUtc(day, s.endTime)] as Interval);
  const dayStart = zonedToUtc(day, "00:00");
  const dayEnd = zonedToUtc(addDays(day, 1), "00:00");
  const blocked = blocks.filter((b) => (b.zoneId === null || b.zoneId === zoneId) && b.startsAt < dayEnd && b.endsAt > dayStart).map((b) => [b.startsAt, b.endsAt] as Interval);
  return subtract(windows, blocked);
}

export type UtilizationCell = { availableH: number; bookedH: number };

/**
 * Auslastung je Zone und Monat: gebuchte Stunden innerhalb der Betriebsfenster / verfügbare Stunden.
 * Buchungen außerhalb der Fenster (z. B. mehrtägig rund um die Uhr) zählen nur innerhalb der Fenster.
 */
export function utilization(input: { days: string[]; zoneIds: string[]; slots: Slot[]; blocks: BlockLike[]; booked: Record<string, Interval[]> }): Record<string, Record<string, UtilizationCell>> {
  const H = 3_600_000;
  const out: Record<string, Record<string, UtilizationCell>> = {};
  for (const zoneId of input.zoneIds) {
    out[zoneId] = {};
    const booked = union(input.booked[zoneId] ?? []);
    for (const day of input.days) {
      const month = day.slice(0, 7);
      const open = openWindows(day, zoneId, input.slots, input.blocks);
      const cell = (out[zoneId][month] ??= { availableH: 0, bookedH: 0 });
      cell.availableH += measure(open) / H;
      cell.bookedH += measure(intersect(open, booked)) / H;
    }
  }
  return out;
}
