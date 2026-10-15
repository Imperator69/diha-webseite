import { and, asc, eq, gte, lt, lte, ne } from "drizzle-orm";
import { loadAnalytics, periodFor, periodPresets, type PeriodPreset } from "@/lib/analytics/data";
import { routeViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { toCsv, euros } from "@/lib/csv";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatDateTime } from "@/lib/i18n/format";
import { bookingStatusLabels, invoiceStatusLabels, label } from "@/lib/i18n/labels";
import { zonedDate } from "@/lib/time";

/** CSV-Export für Auswertungen (nur Admin/Manager). */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const viewer = await routeViewer();
  if (!viewer || !can(viewer.role, "reports.view")) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const l = url.searchParams.get("locale") === "en" ? "en" : "de";
  const preset = (periodPresets as readonly string[]).includes(url.searchParams.get("period") ?? "") ? (url.searchParams.get("period") as PeriodPreset) : "12m";
  const now = Date.now();
  const period = periodFor(preset, zonedDate(now));
  const kind = (await params).kind;
  const de = l === "de";
  let rows: (string | number | null)[][];

  if (kind === "bookings") {
    const list = await db()
      .select({ b: schema.bookings, projectName: schema.projects.name })
      .from(schema.bookings)
      .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
      .where(and(ne(schema.bookings.status, "draft"), gte(schema.bookings.firstStart, period.fromMs), lt(schema.bookings.firstStart, period.toMs)))
      .orderBy(asc(schema.bookings.firstStart));
    const zones = await db().select({ id: schema.zones.id, code: schema.zones.code }).from(schema.zones);
    const zoneCode = new Map(zones.map((z) => [z.id, z.code]));
    const bz = await db().select().from(schema.bookingZones);
    const ba = await db().select().from(schema.bookingActivities);
    rows = [
      de ? ["Nummer", "Titel", "Projekt", "Status", "Beginn", "Ende", "Zonen", "Nutzungsarten", "Teilnehmende", "Gäste", "Schätzung netto €"] : ["Number", "Title", "Project", "Status", "Start", "End", "Zones", "Types of use", "Participants", "Guests", "Estimate net €"],
      ...list.map(({ b, projectName }) => [
        b.number,
        b.title,
        projectName,
        label(bookingStatusLabels, b.status, l),
        formatDateTime(b.firstStart, l),
        formatDateTime(b.lastEnd, l),
        bz.filter((z) => z.bookingId === b.id).map((z) => zoneCode.get(z.zoneId) ?? z.zoneId).join(", "),
        ba.filter((a) => a.bookingId === b.id).map((a) => a.activityCode).join(", "),
        b.participantsCount,
        b.guestsCount,
        b.priceEstimateCents === null ? null : euros(b.priceEstimateCents, l),
      ]),
    ];
  } else if (kind === "invoices") {
    const list = await db()
      .select({ i: schema.invoices, projectName: schema.projects.name })
      .from(schema.invoices)
      .innerJoin(schema.projects, eq(schema.invoices.projectId, schema.projects.id))
      .where(and(ne(schema.invoices.status, "draft"), gte(schema.invoices.issueDate, period.from), lte(schema.invoices.issueDate, period.to)))
      .orderBy(asc(schema.invoices.number));
    rows = [
      de
        ? ["Nummer", "Art", "Status", "Projekt", "Empfänger", "UID Empfänger", "Datum", "Fällig", "Netto €", "USt €", "Brutto €", "Bezahlt €", "Offen €", "Mahnstufe"]
        : ["Number", "Type", "Status", "Project", "Recipient", "Recipient VAT ID", "Date", "Due", "Net €", "VAT €", "Gross €", "Paid €", "Open €", "Reminder level"],
      ...list.map(({ i, projectName }) => [
        i.number,
        i.kind === "credit_note" ? (de ? "Gutschrift" : "Credit note") : de ? "Rechnung" : "Invoice",
        label(invoiceStatusLabels, i.status, l),
        projectName,
        i.recipient?.name ?? "",
        i.recipient?.vatId ?? "",
        i.issueDate,
        i.dueDate,
        euros(i.netCents, l),
        euros(i.taxCents, l),
        euros(i.grossCents, l),
        euros(i.paidCents, l),
        euros(i.status === "cancelled" ? 0 : i.grossCents - i.paidCents, l),
        i.dunningLevel,
      ]),
    ];
  } else if (kind === "utilization") {
    const a = await loadAnalytics(period, now);
    const num = (v: number) => (de ? v.toFixed(1).replace(".", ",") : v.toFixed(1));
    rows = [
      de ? ["Zone", "Monat", "Verfügbar h", "Gebucht h", "Auslastung %"] : ["Zone", "Month", "Available h", "Booked h", "Utilisation %"],
      ...a.utilizationRows.flatMap((r) => r.cells.map((c, idx) => [r.code, period.months[idx], num(c.availableH), num(c.bookedH), c.availableH > 0 ? num((c.bookedH / c.availableH) * 100) : ""])),
    ];
  } else {
    return new Response("Not found", { status: 404 });
  }

  await audit(viewer.id, "report.export", "report", kind, { period: preset, rows: rows.length - 1 });
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="diha-${kind}-${period.from}-${period.to}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
