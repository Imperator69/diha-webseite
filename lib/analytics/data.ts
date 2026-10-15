import { and, asc, eq, gte, inArray, lt, lte, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { OFFSET_NOTE } from "@/lib/invoices/data";
import { addDays, zonedDate, zonedToUtc } from "@/lib/time";
import { utilization, type Interval } from "./intervals";

export const periodPresets = ["12m", "ytd", "py", "next3"] as const;
export type PeriodPreset = (typeof periodPresets)[number];

export type Period = { preset: PeriodPreset; from: string; to: string; months: string[]; fromMs: number; toMs: number };

function monthAdd(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Zeitraum aus Voreinstellung; Monate jeweils vollständig. */
export function periodFor(preset: PeriodPreset, today: string): Period {
  const current = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  let first: string;
  let last: string;
  if (preset === "ytd") [first, last] = [`${year}-01`, current];
  else if (preset === "py") [first, last] = [`${year - 1}-01`, `${year - 1}-12`];
  else if (preset === "next3") [first, last] = [current, monthAdd(current, 2)];
  else [first, last] = [monthAdd(current, -11), current];
  const months: string[] = [];
  for (let m = first; m <= last; m = monthAdd(m, 1)) months.push(m);
  const from = `${first}-01`;
  const to = addDays(`${monthAdd(last, 1)}-01`, -1);
  return { preset, from, to, months, fromMs: zonedToUtc(from, "00:00"), toMs: zonedToUtc(addDays(to, 1), "00:00") };
}

const firm = ["confirmed", "completed", "invoiced"] as const;

export async function loadAnalytics(period: Period, now: number) {
  const today = zonedDate(now);
  const [bookings, periods, bookingZones, bookingActivities, zones, slots, blocks, invoices, payments, permits, inquiries, activityTypes, projects] = await Promise.all([
    db()
      .select({ id: schema.bookings.id, status: schema.bookings.status, projectId: schema.bookings.projectId, firstStart: schema.bookings.firstStart, number: schema.bookings.number })
      .from(schema.bookings)
      .where(and(ne(schema.bookings.status, "draft"), lt(schema.bookings.firstStart, period.toMs), gte(schema.bookings.lastEnd, period.fromMs))),
    db()
      .select({ bookingId: schema.bookingPeriods.bookingId, startsAt: schema.bookingPeriods.startsAt, endsAt: schema.bookingPeriods.endsAt, status: schema.bookings.status })
      .from(schema.bookingPeriods)
      .innerJoin(schema.bookings, eq(schema.bookingPeriods.bookingId, schema.bookings.id))
      .where(and(inArray(schema.bookings.status, [...firm]), lt(schema.bookingPeriods.startsAt, period.toMs), gte(schema.bookingPeriods.endsAt, period.fromMs))),
    db().select().from(schema.bookingZones),
    db().select().from(schema.bookingActivities),
    db().select().from(schema.zones).where(eq(schema.zones.active, true)).orderBy(asc(schema.zones.sortOrder)),
    db().select().from(schema.slotTemplates),
    db().select().from(schema.siteBlocks).where(and(lt(schema.siteBlocks.startsAt, period.toMs), gte(schema.siteBlocks.endsAt, period.fromMs))),
    db()
      .select({ id: schema.invoices.id, kind: schema.invoices.kind, status: schema.invoices.status, projectId: schema.invoices.projectId, issueDate: schema.invoices.issueDate, dueDate: schema.invoices.dueDate, grossCents: schema.invoices.grossCents, paidCents: schema.invoices.paidCents })
      .from(schema.invoices)
      .where(ne(schema.invoices.status, "draft")),
    db()
      .select({ amountCents: schema.payments.amountCents, receivedOn: schema.payments.receivedOn, note: schema.payments.note })
      .from(schema.payments)
      .where(and(gte(schema.payments.receivedOn, period.from), lte(schema.payments.receivedOn, period.to))),
    db().select({ status: schema.permits.status }).from(schema.permits),
    db().select({ createdAt: schema.inquiries.createdAt, status: schema.inquiries.status }).from(schema.inquiries).where(and(gte(schema.inquiries.createdAt, period.fromMs), lt(schema.inquiries.createdAt, period.toMs))),
    db().select({ code: schema.activityTypes.code, nameDe: schema.activityTypes.nameDe, nameEn: schema.activityTypes.nameEn }).from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder)),
    db().select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects),
  ]);

  const inPeriod = (ms: number | null) => ms !== null && ms >= period.fromMs && ms < period.toMs;
  const monthOf = (ms: number) => zonedDate(ms).slice(0, 7);

  // Buchungen je Monat (Beginn), nach Ergebnis
  const outcome = (s: string) => (s === "requested" || s === "in_review" ? "open" : s === "rejected" || s === "cancelled" ? "declined" : "firm");
  const bookingsByMonth = period.months.map((m) => ({ month: m, open: 0, firm: 0, declined: 0 }));
  for (const b of bookings) {
    if (!inPeriod(b.firstStart)) continue;
    const row = bookingsByMonth.find((r) => r.month === monthOf(b.firstStart!));
    if (row) row[outcome(b.status)]++;
  }

  // Auslastung je Zone und Monat
  const bookable = zones.filter((z) => z.bookable);
  const zoneOf = new Map<string, string[]>();
  for (const bz of bookingZones) zoneOf.set(bz.bookingId, [...(zoneOf.get(bz.bookingId) ?? []), bz.zoneId]);
  const booked: Record<string, Interval[]> = {};
  for (const p of periods) for (const z of zoneOf.get(p.bookingId) ?? []) (booked[z] ??= []).push([p.startsAt, p.endsAt]);
  const days: string[] = [];
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) days.push(d);
  const util = utilization({ days, zoneIds: bookable.map((z) => z.id), slots, blocks, booked });
  const utilizationRows = bookable.map((z) => ({
    zoneId: z.id,
    code: z.code,
    nameDe: z.nameDe,
    nameEn: z.nameEn,
    cells: period.months.map((m) => util[z.id]?.[m] ?? { availableH: 0, bookedH: 0 }),
  }));

  // Umsatz: fakturiert (brutto, inkl. Gutschriften) und Zahlungseingang je Monat
  const revenue = period.months.map((m) => ({ month: m, invoiced: 0, received: 0 }));
  for (const i of invoices) {
    if (!i.issueDate || i.issueDate < period.from || i.issueDate > period.to) continue;
    const row = revenue.find((r) => r.month === i.issueDate!.slice(0, 7));
    if (row) row.invoiced += i.grossCents;
  }
  for (const p of payments) {
    if (p.note === OFFSET_NOTE) continue;
    const row = revenue.find((r) => r.month === p.receivedOn.slice(0, 7));
    if (row) row.received += p.amountCents;
  }

  // Offene Posten nach Alter (Stichtag heute)
  const agingBuckets = [
    { key: "not_due", de: "nicht fällig", en: "not yet due", cents: 0, count: 0 },
    { key: "d30", de: "1–30 Tage", en: "1–30 days", cents: 0, count: 0 },
    { key: "d60", de: "31–60 Tage", en: "31–60 days", cents: 0, count: 0 },
    { key: "d90", de: "61–90 Tage", en: "61–90 days", cents: 0, count: 0 },
    { key: "d90p", de: "über 90 Tage", en: "over 90 days", cents: 0, count: 0 },
  ];
  for (const i of invoices) {
    if (i.kind !== "invoice" || (i.status !== "issued" && i.status !== "partially_paid")) continue;
    const overdueDays = i.dueDate ? Math.round((zonedToUtc(today, "12:00") - zonedToUtc(i.dueDate, "12:00")) / 86_400_000) : 0;
    const idx = overdueDays <= 0 ? 0 : overdueDays <= 30 ? 1 : overdueDays <= 60 ? 2 : overdueDays <= 90 ? 3 : 4;
    agingBuckets[idx].cents += i.grossCents - i.paidCents;
    agingBuckets[idx].count++;
  }

  // Nutzungsarten (Buchungen mit Beginn im Zeitraum, ohne abgelehnte/stornierte)
  const counted = new Set(bookings.filter((b) => inPeriod(b.firstStart) && outcome(b.status) !== "declined").map((b) => b.id));
  const activityMix = activityTypes
    .map((a) => ({ code: a.code, nameDe: a.nameDe, nameEn: a.nameEn, count: bookingActivities.filter((ba) => ba.activityCode === a.code && counted.has(ba.bookingId)).length }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);

  // Projekte: Buchungen, gebuchte Stunden, fakturiert
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const bookingProject = new Map(bookings.map((b) => [b.id, b.projectId]));
  const projectStats = new Map<string, { name: string; bookings: number; hours: number; invoiced: number }>();
  const stat = (id: string) => {
    let s = projectStats.get(id);
    if (!s) projectStats.set(id, (s = { name: projectName.get(id) ?? id, bookings: 0, hours: 0, invoiced: 0 }));
    return s;
  };
  for (const b of bookings) if (inPeriod(b.firstStart) && outcome(b.status) === "firm") stat(b.projectId).bookings++;
  for (const p of periods) {
    const pid = bookingProject.get(p.bookingId);
    if (!pid) continue;
    const s = Math.max(p.startsAt, period.fromMs);
    const e = Math.min(p.endsAt, period.toMs);
    if (e > s) stat(pid).hours += (e - s) / 3_600_000;
  }
  for (const i of invoices) if (i.issueDate && i.issueDate >= period.from && i.issueDate <= period.to) stat(i.projectId).invoiced += i.grossCents;
  const topProjects = [...projectStats.values()].sort((a, b) => b.invoiced - a.invoiced || b.hours - a.hours).slice(0, 10);

  const permitCounts: Record<string, number> = {};
  for (const p of permits) permitCounts[p.status] = (permitCounts[p.status] ?? 0) + 1;

  const totals = {
    bookings: bookingsByMonth.reduce((s, r) => s + r.open + r.firm + r.declined, 0),
    firm: bookingsByMonth.reduce((s, r) => s + r.firm, 0),
    bookedH: utilizationRows.reduce((s, r) => s + r.cells.reduce((x, c) => x + c.bookedH, 0), 0),
    availableH: utilizationRows.reduce((s, r) => s + r.cells.reduce((x, c) => x + c.availableH, 0), 0),
    invoiced: revenue.reduce((s, r) => s + r.invoiced, 0),
    received: revenue.reduce((s, r) => s + r.received, 0),
    open: agingBuckets.reduce((s, b) => s + b.cents, 0),
    inquiries: inquiries.filter((i) => i.status !== "spam").length,
  };

  return { bookingsByMonth, utilizationRows, revenue, agingBuckets, activityMix, topProjects, permitCounts, totals };
}

export type Analytics = Awaited<ReturnType<typeof loadAnalytics>>;
