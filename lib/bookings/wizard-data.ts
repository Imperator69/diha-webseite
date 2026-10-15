import { and, asc, eq, inArray } from "drizzle-orm";
import type { WizardData, WizardState } from "@/components/booking/types";
import type { Viewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { getSetting } from "@/lib/settings";
import { mapBaseImageUrl, toMapZone } from "@/lib/site-data/zones";
import { loadAvailableDocs, loadCatalog, loadOccupancy, type BookingFull } from "./data";

/** Daten für den Buchungsassistenten. Projekte sehen fremde Buchungen nur anonym als Belegung. */
export async function buildWizardData(viewer: Viewer, locale: Locale, opts: { booking?: BookingFull | null; projectId?: string | null }): Promise<WizardData> {
  const staff = isStaff(viewer.role);
  const nowMs = Date.now();
  const [catalog, occupancy, baseImageUrl, bookingSettings] = await Promise.all([
    loadCatalog(),
    loadOccupancy(nowMs - 86_400_000, nowMs + 400 * 86_400_000, opts.booking?.booking.id),
    mapBaseImageUrl(),
    getSetting("booking"),
  ]);
  const projectRows = staff
    ? await db().select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(eq(schema.projects.status, "active")).orderBy(asc(schema.projects.name))
    : viewer.projectIds.length
      ? await db()
          .select({ id: schema.projects.id, name: schema.projects.name })
          .from(schema.projects)
          .where(and(inArray(schema.projects.id, viewer.projectIds), eq(schema.projects.status, "active")))
          .orderBy(asc(schema.projects.name))
      : [];
  const docsByProject: WizardData["docsByProject"] = {};
  const relevantProjects = opts.booking ? [opts.booking.booking.projectId] : projectRows.map((p) => p.id).slice(0, 25);
  for (const pid of relevantProjects) docsByProject[pid] = (await loadAvailableDocs(pid)).filter((d) => d.scope === "project");
  const bookingDocs = opts.booking ? (await loadAvailableDocs(opts.booking.booking.projectId, opts.booking.booking.id)).filter((d) => d.scope === "booking") : [];

  return {
    activities: catalog.activities,
    zones: catalog.zones.filter((z) => z.active).map((z) => ({ ...toMapZone(z, locale), kind: z.kind, active: z.active, capacity: z.capacity })),
    slots: catalog.slots,
    rates: catalog.rates,
    others: staff ? occupancy.others : occupancy.others.map((o) => ({ ...o, number: "" })),
    blocks: occupancy.blocks,
    projects: projectRows,
    docsByProject,
    bookingDocs,
    nowMs,
    staff,
    leadTimeOverride: Boolean(opts.booking?.booking.leadTimeOverride),
    guestThreshold: bookingSettings.guestThreshold,
    baseImageUrl,
  };
}

export function initialWizardState(data: WizardData, opts: { booking?: BookingFull | null; zoneId?: string | null; projectId?: string | null }): WizardState {
  const b = opts.booking;
  if (b) {
    return {
      id: b.booking.id,
      status: b.booking.status,
      projectId: b.booking.projectId,
      title: b.booking.title,
      activityCodes: b.activityCodes,
      zoneIds: b.zoneIds,
      periods: b.periods.map((p) => ({ startsAt: p.startsAt, endsAt: p.endsAt })),
      details: b.booking.details,
      persons: b.persons.map((p) => ({ role: p.role, name: p.name, email: p.email ?? "", phone: p.phone ?? "", qualification: p.qualification ?? "" })),
      participants: b.participants.map((p) => ({ name: p.name, organization: p.organization ?? "", isGuest: p.isGuest })),
      participantsCount: b.booking.participantsCount,
      guestsCount: b.booking.guestsCount,
      notesProject: b.booking.notesProject ?? "",
    };
  }
  const zone = opts.zoneId && data.zones.some((z) => z.id === opts.zoneId && z.bookable) ? [opts.zoneId] : [];
  return {
    projectId: opts.projectId && data.projects.some((p) => p.id === opts.projectId) ? opts.projectId : (data.projects[0]?.id ?? ""),
    title: "",
    activityCodes: [],
    zoneIds: zone,
    periods: [],
    details: {},
    persons: [],
    participants: [],
    participantsCount: 1,
    guestsCount: 0,
    notesProject: "",
  };
}
