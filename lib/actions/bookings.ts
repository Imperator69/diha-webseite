"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertViewer, type Viewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { canSeeBooking, loadAvailableDocs, loadBooking, loadCatalog, loadOccupancy, nextCounter, projectMemberEmails, staffEmails } from "@/lib/bookings/data";
import { db, schema } from "@/lib/db";
import type { BookingStatus } from "@/db/schema";
import { newId } from "@/lib/ids";
import type { Locale } from "@/lib/i18n/config";
import { bookingStatusLabels } from "@/lib/i18n/labels";
import { sendMail } from "@/lib/mail/send";
import { genericMail } from "@/lib/mail/templates";
import { estimateLines } from "@/lib/pricing";
import { evaluateBooking, requirementsFor, type Issue } from "@/lib/rules/engine";
import { siteUrl } from "@/lib/site";
import { zonedDate, zonedToUtc } from "@/lib/time";
import { localeOf, str } from "./util";

const payloadSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  activityCodes: z.array(z.string()).max(20),
  zoneIds: z.array(z.string()).max(20),
  periods: z.array(z.object({ startsAt: z.number().int(), endsAt: z.number().int() })).max(200),
  details: z.record(z.string(), z.record(z.string(), z.unknown())),
  persons: z
    .array(
      z.object({
        role: z.string(),
        name: z.string().trim().max(160),
        email: z.string().trim().max(200).optional().default(""),
        phone: z.string().trim().max(60).optional().default(""),
        qualification: z.string().trim().max(400).optional().default(""),
      }),
    )
    .max(40),
  participants: z.array(z.object({ name: z.string().trim().min(1).max(160), organization: z.string().trim().max(160).optional().default(""), isGuest: z.boolean() })).max(300),
  participantsCount: z.number().int().min(1).max(500),
  guestsCount: z.number().int().min(0).max(500),
  notesProject: z.string().trim().max(5000).optional().default(""),
  termsAccepted: z.boolean(),
  mode: z.enum(["draft", "submit"]),
  locale: z.enum(["de", "en"]),
});

export type BookingPayload = z.input<typeof payloadSchema>;
export type BookingSaveResult = { ok: boolean; id?: string; status?: string; error?: string; issues?: Issue[] };

const editableByProject: BookingStatus[] = ["draft", "requested"];

function bookingUrl(locale: Locale, id: string) {
  return `${siteUrl()}/${locale}/portal/buchungen/${id}`;
}

async function notifyStaff(subject: { de: string; en: string }, body: { de: string; en: string }) {
  for (const s of await staffEmails()) await sendMail({ to: s.email, ...genericMail(s.locale, s.name, body, subject) });
}

async function notifyProject(projectId: string, subject: { de: string; en: string }, body: { de: string; en: string }) {
  for (const m of await projectMemberEmails(projectId)) await sendMail({ to: m.email, ...genericMail(m.locale, m.name, body, subject) });
}

async function addEvent(bookingId: string, userId: string, data: { type: "status" | "comment"; fromStatus?: string; toStatus?: string; message?: string | null; visibleToProject?: boolean }) {
  await db()
    .insert(schema.bookingEvents)
    .values({ id: newId(), bookingId, userId, type: data.type, fromStatus: data.fromStatus, toStatus: data.toStatus, message: data.message ?? null, visibleToProject: data.visibleToProject ?? true });
}

/** Speichert Entwurf oder sendet die Anfrage ab (inkl. vollständiger Regelprüfung). */
export async function saveBookingAction(input: BookingPayload): Promise<BookingSaveResult> {
  const viewer = await assertViewer("bookings.create");
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  if (!canSeeBooking(viewer, p.projectId)) return { ok: false, error: "forbidden" };
  const project = (await db().select().from(schema.projects).where(eq(schema.projects.id, p.projectId)).limit(1))[0];
  if (!project || project.status !== "active") return { ok: false, error: "invalid" };

  let existing: typeof schema.bookings.$inferSelect | undefined;
  if (p.id) {
    existing = (await db().select().from(schema.bookings).where(eq(schema.bookings.id, p.id)).limit(1))[0];
    if (!existing || !canSeeBooking(viewer, existing.projectId)) return { ok: false, error: "not_found" };
    const allowed = isStaff(viewer.role) ? ["draft", "requested", "in_review"] : editableByProject;
    if (!allowed.includes(existing.status)) return { ok: false, error: "conflict" };
  }

  const catalog = await loadCatalog();
  const periods = [...p.periods].sort((a, b) => a.startsAt - b.startsAt);
  const zoneCodes = Object.fromEntries(catalog.zones.map((z) => [z.id, z.code]));
  const estimate = estimateLines({ rates: catalog.rates, periods, zoneIds: p.zoneIds, zoneCodes, activityCodes: p.activityCodes, participants: p.participantsCount, locale: p.locale });
  const priceEstimateCents = estimate.reduce((s, l) => s + l.netCents, 0);

  const id = existing?.id ?? newId();
  if (p.mode === "submit") {
    if (!p.termsAccepted) return { ok: false, error: "terms" };
    const window = periods.length ? { from: periods[0].startsAt, to: periods[periods.length - 1].endsAt } : { from: 0, to: 0 };
    const occupancy = await loadOccupancy(window.from, window.to, id);
    const docs = await loadAvailableDocs(p.projectId, existing?.id);
    const evaluation = evaluateBooking(
      { activityCodes: p.activityCodes, zoneIds: p.zoneIds, periods, persons: p.persons, docs, details: p.details, participantsCount: p.participantsCount, guestsCount: p.guestsCount },
      { activities: catalog.activities, zones: catalog.zones, ...occupancy, nowMs: Date.now(), enforceLeadTime: !isStaff(viewer.role) && !existing?.leadTimeOverride },
    );
    // Fehlende Unterlagen werden nach dem Speichern im Entwurf hochgeladen; alles andere blockiert sofort.
    const blocking = evaluation.issues.filter((i) => i.severity === "error");
    if (blocking.length) {
      await persist();
      return { ok: false, id, error: "rules", issues: evaluation.issues };
    }
  }

  await persist();
  if (p.mode === "submit") {
    const from = existing?.status ?? "draft";
    await db().update(schema.bookings).set({ status: "requested", submittedAt: Date.now(), termsAcceptedAt: Date.now(), updatedAt: Date.now() }).where(eq(schema.bookings.id, id));
    await addEvent(id, viewer.id, { type: "status", fromStatus: from, toStatus: "requested" });
    await audit(viewer.id, "booking.submit", "booking", id);
    const booking = (await db().select({ number: schema.bookings.number }).from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1))[0];
    await notifyStaff(
      { de: `Neue Buchungsanfrage ${booking.number}`, en: `New booking request ${booking.number}` },
      {
        de: `${project.name} hat die Buchung „${p.title}“ (${booking.number}) angefragt.\n\nZur Prüfung: ${bookingUrl("de", id)}`,
        en: `${project.name} requested the booking “${p.title}” (${booking.number}).\n\nReview: ${bookingUrl("en", id)}`,
      },
    );
  }
  revalidatePath(`/${p.locale}/portal/buchungen`);
  return { ok: true, id, status: p.mode === "submit" ? "requested" : (existing?.status ?? "draft") };

  async function persist() {
    const now = Date.now();
    const values = {
      projectId: p.projectId,
      title: p.title,
      participantsCount: p.participantsCount,
      guestsCount: p.guestsCount,
      details: p.details,
      notesProject: p.notesProject || null,
      priceEstimateCents,
      firstStart: periods[0]?.startsAt ?? null,
      lastEnd: periods.length ? Math.max(...periods.map((x) => x.endsAt)) : null,
      updatedAt: now,
    };
    if (existing) {
      await db().update(schema.bookings).set(values).where(eq(schema.bookings.id, id));
    } else {
      const year = Number(zonedDate(now).slice(0, 4));
      const n = await nextCounter("booking", year);
      await db()
        .insert(schema.bookings)
        .values({ id, number: `B-${year}-${String(n).padStart(4, "0")}`, createdBy: viewer.id, status: "draft", ...values });
      await addEvent(id, viewer.id, { type: "status", toStatus: "draft" });
      await audit(viewer.id, "booking.create", "booking", id, { projectId: p.projectId });
    }
    await db().delete(schema.bookingPeriods).where(eq(schema.bookingPeriods.bookingId, id));
    await db().delete(schema.bookingZones).where(eq(schema.bookingZones.bookingId, id));
    await db().delete(schema.bookingActivities).where(eq(schema.bookingActivities.bookingId, id));
    await db().delete(schema.bookingPersons).where(eq(schema.bookingPersons.bookingId, id));
    await db().delete(schema.bookingParticipants).where(eq(schema.bookingParticipants.bookingId, id));
    const validZoneIds = p.zoneIds.filter((z) => catalog.zones.some((c) => c.id === z));
    const validCodes = p.activityCodes.filter((c) => catalog.activities.some((a) => a.code === c));
    if (periods.length) await db().insert(schema.bookingPeriods).values(periods.map((x) => ({ id: newId(), bookingId: id, startsAt: x.startsAt, endsAt: x.endsAt })));
    if (validZoneIds.length) await db().insert(schema.bookingZones).values(validZoneIds.map((zoneId) => ({ bookingId: id, zoneId })));
    if (validCodes.length) await db().insert(schema.bookingActivities).values(validCodes.map((activityCode) => ({ bookingId: id, activityCode })));
    const persons = p.persons.filter((x) => x.name);
    if (persons.length)
      await db()
        .insert(schema.bookingPersons)
        .values(persons.map((x) => ({ id: newId(), bookingId: id, role: x.role, name: x.name, email: x.email || null, phone: x.phone || null, qualification: x.qualification || null })));
    if (p.participants.length)
      await db()
        .insert(schema.bookingParticipants)
        .values(p.participants.map((x) => ({ id: newId(), bookingId: id, name: x.name, organization: x.organization || null, isGuest: x.isGuest })));
  }
}

async function loadForStaff(fd: FormData) {
  const viewer = await assertViewer("bookings.review");
  const full = await loadBooking(str(fd, "id"));
  if (!full) throw new Error("NOT_FOUND");
  return { viewer, full };
}

function backTo(fd: FormData, id: string, query = ""): never {
  redirect(`/${localeOf(fd)}/portal/buchungen/${id}${query}`);
}

async function changeStatus(viewer: Viewer, bookingId: string, projectId: string, number: string, title: string, from: BookingStatus, to: BookingStatus, message: string | null, extra: Partial<typeof schema.bookings.$inferInsert> = {}) {
  await db()
    .update(schema.bookings)
    .set({ status: to, updatedAt: Date.now(), ...extra })
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.status, from)));
  await addEvent(bookingId, viewer.id, { type: "status", fromStatus: from, toStatus: to, message });
  await audit(viewer.id, `booking.${to}`, "booking", bookingId, { from });
  if (to !== "in_review") {
    await notifyProject(
      projectId,
      { de: `Buchung ${number}: ${bookingStatusLabels[to].de}`, en: `Booking ${number}: ${bookingStatusLabels[to].en}` },
      {
        de: `Der Status Ihrer Buchung „${title}“ (${number}) ist jetzt: ${bookingStatusLabels[to].de}.${message ? `\n\nHinweis: ${message}` : ""}\n\n${bookingUrl("de", bookingId)}`,
        en: `The status of your booking “${title}” (${number}) is now: ${bookingStatusLabels[to].en}.${message ? `\n\nNote: ${message}` : ""}\n\n${bookingUrl("en", bookingId)}`,
      },
    );
  }
}

export async function reviewStatusAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  const { booking } = full;
  const target = str(fd, "status") as BookingStatus;
  const message = str(fd, "message") || null;
  const transitions: Record<string, BookingStatus[]> = {
    requested: ["in_review", "confirmed", "rejected", "cancelled"],
    in_review: ["confirmed", "rejected", "cancelled", "requested"],
    confirmed: ["completed", "cancelled"],
    draft: ["cancelled"],
    completed: [],
    rejected: [],
    cancelled: [],
    invoiced: [],
  };
  if (!transitions[booking.status]?.includes(target)) backTo(fd, booking.id, "?error=transition");
  if ((target === "rejected" || target === "cancelled") && !message) backTo(fd, booking.id, "?error=reason");

  if (target === "confirmed") {
    // erneute Regelprüfung (Vorlauf nur Warnung) und vollständige Checkliste
    const catalog = await loadCatalog();
    const occupancy = await loadOccupancy(booking.firstStart ?? 0, booking.lastEnd ?? 0, booking.id);
    const docs = await loadAvailableDocs(booking.projectId, booking.id);
    const evaluation = evaluateBooking(
      { activityCodes: full.activityCodes, zoneIds: full.zoneIds, periods: full.periods, persons: full.persons, docs, details: booking.details, participantsCount: booking.participantsCount, guestsCount: booking.guestsCount },
      { activities: catalog.activities, zones: catalog.zones, ...occupancy, nowMs: Date.now(), enforceLeadTime: false },
    );
    if (!evaluation.ok) backTo(fd, booking.id, "?error=rules");
    const done = new Set(full.checks.filter((c) => c.doneAt).map((c) => c.key));
    const open = evaluation.requirements.checklist.filter((c) => c.key !== "site_clearance" && !done.has(c.key));
    if (open.length) backTo(fd, booking.id, "?error=checklist");
  }
  if (target === "completed") {
    if ((booking.firstStart ?? 0) > Date.now()) backTo(fd, booking.id, "?error=not_started");
    const catalog = await loadCatalog();
    const req = requirementsFor({ activityCodes: full.activityCodes, details: booking.details, guestsCount: booking.guestsCount }, catalog.activities);
    if (req.requiresSiteClearance && !booking.siteClearedAt) backTo(fd, booking.id, "?error=clearance");
  }
  const extra: Partial<typeof schema.bookings.$inferInsert> = {};
  if (target === "confirmed" || target === "rejected") Object.assign(extra, { decidedAt: Date.now(), decidedBy: viewer.id });
  if (target === "completed") extra.completedAt = Date.now();
  await changeStatus(viewer, booking.id, booking.projectId, booking.number, booking.title, booking.status, target, message, extra);
  revalidatePath(`/${localeOf(fd)}/portal/buchungen`);
  backTo(fd, booking.id, "?saved=status");
}

export async function cancelOwnBookingAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("bookings.create");
  const full = await loadBooking(str(fd, "id"));
  if (!full || !canSeeBooking(viewer, full.booking.projectId)) redirect(`/${localeOf(fd)}/portal/buchungen`);
  const { booking } = full;
  const message = str(fd, "message") || null;
  if (booking.status === "draft") {
    await db().delete(schema.bookings).where(and(eq(schema.bookings.id, booking.id), eq(schema.bookings.status, "draft")));
    await audit(viewer.id, "booking.draft_deleted", "booking", booking.id);
    redirect(`/${localeOf(fd)}/portal/buchungen?saved=deleted`);
  }
  if (!["requested", "in_review", "confirmed"].includes(booking.status) || (booking.firstStart ?? 0) < Date.now()) backTo(fd, booking.id, "?error=transition");
  await changeStatus(viewer, booking.id, booking.projectId, booking.number, booking.title, booking.status, "cancelled", message);
  await notifyStaff(
    { de: `Buchung ${booking.number} vom Projekt storniert`, en: `Booking ${booking.number} cancelled by project` },
    { de: `${booking.title} wurde storniert.${message ? `\nBegründung: ${message}` : ""}\n\n${bookingUrl("de", booking.id)}`, en: `${booking.title} was cancelled.${message ? `\nReason: ${message}` : ""}\n\n${bookingUrl("en", booking.id)}` },
  );
  backTo(fd, booking.id, "?saved=cancelled");
}

export async function toggleCheckAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  const key = str(fd, "key");
  const existing = full.checks.find((c) => c.key === key);
  if (existing?.doneAt) {
    await db().delete(schema.bookingChecks).where(and(eq(schema.bookingChecks.bookingId, full.booking.id), eq(schema.bookingChecks.key, key)));
  } else {
    await db()
      .insert(schema.bookingChecks)
      .values({ bookingId: full.booking.id, key, doneAt: Date.now(), doneBy: viewer.id, note: str(fd, "note") || null })
      .onConflictDoUpdate({ target: [schema.bookingChecks.bookingId, schema.bookingChecks.key], set: { doneAt: Date.now(), doneBy: viewer.id } });
  }
  await audit(viewer.id, existing?.doneAt ? "booking.check_undone" : "booking.check_done", "booking", full.booking.id, { key });
  backTo(fd, full.booking.id, "#pruefung");
}

export async function verifyPersonAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  const personId = str(fd, "person_id");
  const person = full.persons.find((x) => x.id === personId);
  if (!person) backTo(fd, full.booking.id);
  await db()
    .update(schema.bookingPersons)
    .set(person.verifiedAt ? { verifiedAt: null, verifiedBy: null } : { verifiedAt: Date.now(), verifiedBy: viewer.id })
    .where(eq(schema.bookingPersons.id, personId));
  await audit(viewer.id, person.verifiedAt ? "booking.person_unverified" : "booking.person_verified", "booking", full.booking.id, { role: person.role });
  backTo(fd, full.booking.id, "#personen");
}

export async function siteClearanceAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  if (!["confirmed", "completed"].includes(full.booking.status)) backTo(fd, full.booking.id, "?error=transition");
  await db().update(schema.bookings).set({ siteClearedAt: Date.now(), siteClearedBy: viewer.name, updatedAt: Date.now() }).where(eq(schema.bookings.id, full.booking.id));
  await addEvent(full.booking.id, viewer.id, { type: "comment", message: `Schlussfreigabe des Geländes erteilt. ${str(fd, "message")}`.trim(), visibleToProject: true });
  await audit(viewer.id, "booking.site_cleared", "booking", full.booking.id);
  backTo(fd, full.booking.id, "?saved=clearance");
}

export async function leadTimeOverrideAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  await db().update(schema.bookings).set({ leadTimeOverride: !full.booking.leadTimeOverride }).where(eq(schema.bookings.id, full.booking.id));
  await audit(viewer.id, "booking.lead_time_override", "booking", full.booking.id, { value: !full.booking.leadTimeOverride });
  backTo(fd, full.booking.id);
}

export async function commentAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("bookings.create");
  const full = await loadBooking(str(fd, "id"));
  if (!full || !canSeeBooking(viewer, full.booking.projectId)) redirect(`/${localeOf(fd)}/portal/buchungen`);
  const message = str(fd, "message").slice(0, 4000);
  if (!message) backTo(fd, full.booking.id);
  const staff = isStaff(viewer.role);
  const visible = staff ? fd.get("internal") !== "on" : true;
  await addEvent(full.booking.id, viewer.id, { type: "comment", message, visibleToProject: visible });
  await audit(viewer.id, "booking.comment", "booking", full.booking.id, { visible });
  const { booking } = full;
  if (staff && visible) {
    await notifyProject(
      booking.projectId,
      { de: `Nachricht zu Buchung ${booking.number}`, en: `Message on booking ${booking.number}` },
      { de: `${viewer.name}: ${message}\n\n${bookingUrl("de", booking.id)}`, en: `${viewer.name}: ${message}\n\n${bookingUrl("en", booking.id)}` },
    );
  } else if (!staff) {
    await notifyStaff(
      { de: `Nachricht zu Buchung ${booking.number}`, en: `Message on booking ${booking.number}` },
      { de: `${viewer.name}: ${message}\n\n${bookingUrl("de", booking.id)}`, en: `${viewer.name}: ${message}\n\n${bookingUrl("en", booking.id)}` },
    );
  }
  backTo(fd, booking.id, "#verlauf");
}

export async function addRangeLogAction(fd: FormData): Promise<void> {
  const { viewer, full } = await loadForStaff(fd);
  const parseLocal = (value: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? zonedToUtc(value.slice(0, 10), value.slice(11, 16)) : null);
  const wind = Number(str(fd, "wind_kmh").replace(",", "."));
  await db()
    .insert(schema.rangeLogs)
    .values({
      id: newId(),
      bookingId: full.booking.id,
      actualStart: parseLocal(str(fd, "actual_start")),
      actualEnd: parseLocal(str(fd, "actual_end")),
      weather: str(fd, "weather") || null,
      windKmh: Number.isFinite(wind) && str(fd, "wind_kmh") ? wind : null,
      notes: str(fd, "notes") || null,
      createdBy: viewer.name,
    });
  await audit(viewer.id, "booking.range_log", "booking", full.booking.id);
  backTo(fd, full.booking.id, "#betrieb");
}
