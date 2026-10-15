import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Viewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import type { AvailableDoc, Block, OtherBooking, RuleActivity, RuleZone } from "@/lib/rules/engine";
import type { SlotTemplate } from "@/lib/rules/availability";
import type { Rate } from "@/lib/pricing";

/** Status, die das Gelände tatsächlich belegen. */
export const blockingStatuses = ["requested", "in_review", "confirmed"] as const;

export async function loadCatalog() {
  const [activities, zones, slots, rates] = await Promise.all([
    db().select().from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder)),
    db().select().from(schema.zones).orderBy(asc(schema.zones.sortOrder)),
    db().select().from(schema.slotTemplates).orderBy(asc(schema.slotTemplates.sortOrder)),
    db().select().from(schema.rates).orderBy(asc(schema.rates.sortOrder)),
  ]);
  return {
    activities: activities as RuleActivity[] & typeof activities,
    zones: zones.map((z) => ({ ...z })) as (RuleZone & (typeof zones)[number])[],
    slots: slots as SlotTemplate[],
    rates: rates as Rate[],
  };
}

/** Andere belegende Buchungen und Sperrzeiten im Zeitfenster. */
export async function loadOccupancy(fromMs: number, toMs: number, excludeBookingId?: string): Promise<{ others: OtherBooking[]; blocks: Block[] }> {
  const periodRows = await db()
    .select({ bookingId: schema.bookingPeriods.bookingId, startsAt: schema.bookingPeriods.startsAt, endsAt: schema.bookingPeriods.endsAt, number: schema.bookings.number })
    .from(schema.bookingPeriods)
    .innerJoin(schema.bookings, eq(schema.bookingPeriods.bookingId, schema.bookings.id))
    .where(and(inArray(schema.bookings.status, [...blockingStatuses]), lte(schema.bookingPeriods.startsAt, toMs), gte(schema.bookingPeriods.endsAt, fromMs)));
  const ids = [...new Set(periodRows.map((r) => r.bookingId))].filter((id) => id !== excludeBookingId);
  const [zoneRows, activityRows, blocks] = await Promise.all([
    ids.length ? db().select().from(schema.bookingZones).where(inArray(schema.bookingZones.bookingId, ids)) : Promise.resolve([]),
    ids.length ? db().select().from(schema.bookingActivities).where(inArray(schema.bookingActivities.bookingId, ids)) : Promise.resolve([]),
    db()
      .select()
      .from(schema.siteBlocks)
      .where(and(lte(schema.siteBlocks.startsAt, toMs), gte(schema.siteBlocks.endsAt, fromMs))),
  ]);
  const others: OtherBooking[] = ids.map((id) => ({
    id,
    number: periodRows.find((r) => r.bookingId === id)?.number ?? "",
    periods: periodRows.filter((r) => r.bookingId === id).map((r) => ({ startsAt: r.startsAt, endsAt: r.endsAt })),
    zoneIds: zoneRows.filter((r) => r.bookingId === id).map((r) => r.zoneId),
    activityCodes: activityRows.filter((r) => r.bookingId === id).map((r) => r.activityCode),
  }));
  return { others, blocks: blocks.map((b) => ({ id: b.id, zoneId: b.zoneId, startsAt: b.startsAt, endsAt: b.endsAt, reason: b.reason })) };
}

/** Unterlagen, die für eine Buchung zählen: eigene und gültige Projektunterlagen. */
export async function loadAvailableDocs(projectId: string, bookingId?: string): Promise<(AvailableDoc & { id: string; title: string; scope: string })[]> {
  const rows = await db()
    .select()
    .from(schema.documents)
    .where(
      bookingId
        ? or(eq(schema.documents.bookingId, bookingId), and(eq(schema.documents.projectId, projectId), eq(schema.documents.scope, "project")))
        : and(eq(schema.documents.projectId, projectId), eq(schema.documents.scope, "project")),
    )
    .orderBy(desc(schema.documents.createdAt));
  return rows.map((d) => ({ id: d.id, kind: d.kind, validUntil: d.validUntil, status: d.status, title: d.title, scope: d.scope }));
}

export type BookingFull = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

export async function loadBooking(id: string) {
  const booking = (await db().select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1))[0];
  if (!booking) return null;
  const [project, periods, zones, activities, persons, participants, checks, events, rangeLogs] = await Promise.all([
    db().select().from(schema.projects).where(eq(schema.projects.id, booking.projectId)).limit(1),
    db().select().from(schema.bookingPeriods).where(eq(schema.bookingPeriods.bookingId, id)).orderBy(asc(schema.bookingPeriods.startsAt)),
    db().select({ zoneId: schema.bookingZones.zoneId }).from(schema.bookingZones).where(eq(schema.bookingZones.bookingId, id)),
    db().select({ code: schema.bookingActivities.activityCode }).from(schema.bookingActivities).where(eq(schema.bookingActivities.bookingId, id)),
    db().select().from(schema.bookingPersons).where(eq(schema.bookingPersons.bookingId, id)),
    db().select().from(schema.bookingParticipants).where(eq(schema.bookingParticipants.bookingId, id)),
    db().select().from(schema.bookingChecks).where(eq(schema.bookingChecks.bookingId, id)),
    db()
      .select({ event: schema.bookingEvents, userName: schema.users.name })
      .from(schema.bookingEvents)
      .leftJoin(schema.users, eq(schema.bookingEvents.userId, schema.users.id))
      .where(eq(schema.bookingEvents.bookingId, id))
      .orderBy(asc(schema.bookingEvents.createdAt)),
    db().select().from(schema.rangeLogs).where(eq(schema.rangeLogs.bookingId, id)).orderBy(desc(schema.rangeLogs.createdAt)),
  ]);
  return {
    booking,
    project: project[0],
    periods,
    zoneIds: zones.map((z) => z.zoneId),
    activityCodes: activities.map((a) => a.code),
    persons,
    participants,
    checks,
    events,
    rangeLogs,
  };
}

export function canSeeBooking(viewer: Viewer, projectId: string): boolean {
  return isStaff(viewer.role) || viewer.projectIds.includes(projectId);
}

/** Fortlaufende Nummer je Jahr, atomar in einem Statement. */
export async function nextCounter(table: "booking" | "invoice", year: number): Promise<number> {
  const t = table === "booking" ? schema.bookingCounters : schema.invoiceCounters;
  const rows = await db()
    .insert(t)
    .values({ year, lastNumber: 1 })
    .onConflictDoUpdate({ target: t.year, set: { lastNumber: sql`${t.lastNumber} + 1` } })
    .returning({ value: t.lastNumber });
  return rows[0].value;
}

export async function staffEmails(): Promise<{ email: string; name: string; locale: "de" | "en" }[]> {
  return db()
    .select({ email: schema.users.email, name: schema.users.name, locale: schema.users.locale })
    .from(schema.users)
    .where(and(inArray(schema.users.role, ["admin", "manager"]), eq(schema.users.status, "active")));
}

export async function projectMemberEmails(projectId: string): Promise<{ email: string; name: string; locale: "de" | "en" }[]> {
  return db()
    .select({ email: schema.users.email, name: schema.users.name, locale: schema.users.locale })
    .from(schema.projectMembers)
    .innerJoin(schema.users, eq(schema.projectMembers.userId, schema.users.id))
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.users.status, "active")));
}
