import Link from "next/link";
import { and, asc, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import { CalendarPlus } from "lucide-react";
import { Badge, bookingStatusTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { bookingStatuses } from "@/db/schema";
import { formatDate, formatTime } from "@/lib/i18n/format";
import { bookingStatusLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

const groups: Record<string, string[]> = {
  open: ["requested", "in_review"],
  upcoming: ["confirmed"],
  drafts: ["draft"],
  done: ["completed", "invoiced"],
  closed: ["rejected", "cancelled"],
};

export default async function BookingsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "bookings.create");
  const t = translator(locale);
  const q = await searchParams;
  const staff = isStaff(viewer.role);
  const group = sp(q.g) ?? (staff ? "open" : "all");
  const search = sp(q.q)?.trim();
  const projectFilter = sp(q.project);

  const filters: SQL[] = [];
  if (!staff) filters.push(viewer.projectIds.length ? inArray(schema.bookings.projectId, viewer.projectIds) : eq(schema.bookings.id, "-"));
  if (groups[group]) filters.push(inArray(schema.bookings.status, groups[group] as (typeof bookingStatuses)[number][]));
  if (projectFilter) filters.push(eq(schema.bookings.projectId, projectFilter));
  if (search) filters.push(or(like(schema.bookings.title, `%${search}%`), like(schema.bookings.number, `%${search}%`))!);

  const rows = await db()
    .select({ b: schema.bookings, projectName: schema.projects.name })
    .from(schema.bookings)
    .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(group === "done" || group === "closed" ? desc(schema.bookings.firstStart) : asc(schema.bookings.firstStart))
    .limit(300);
  const ids = rows.map((r) => r.b.id);
  const zoneRows = ids.length
    ? await db()
        .select({ bookingId: schema.bookingZones.bookingId, code: schema.zones.code })
        .from(schema.bookingZones)
        .innerJoin(schema.zones, eq(schema.bookingZones.zoneId, schema.zones.id))
        .where(inArray(schema.bookingZones.bookingId, ids))
    : [];
  const zonesOf = (id: string) => zoneRows.filter((z) => z.bookingId === id).map((z) => z.code).sort().join(", ");
  const projects = staff ? await db().select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).orderBy(asc(schema.projects.name)) : [];
  const tabs: [string, string][] = [
    ...(staff ? [] : ([["all", t("Alle", "All")]] as [string, string][])),
    ["open", t("Zur Prüfung", "To review")],
    ["upcoming", t("Bestätigt", "Confirmed")],
    ["drafts", t("Entwürfe", "Drafts")],
    ["done", t("Durchgeführt", "Completed")],
    ["closed", t("Abgelehnt/Storniert", "Rejected/cancelled")],
    ...(staff ? ([["all", t("Alle", "All")]] as [string, string][]) : []),
  ];

  return (
    <>
      <PageHeader
        title={t("Buchungen", "Bookings")}
        actions={
          <ButtonLink href={`/${locale}/portal/buchungen/neu`}>
            <CalendarPlus className="size-4" />
            {t("Neue Buchung", "New booking")}
          </ButtonLink>
        }
      />
      {sp(q.saved) === "deleted" && <Alert tone="ok" className="mb-4">{t("Entwurf gelöscht.", "Draft deleted.")}</Alert>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("Filter", "Filter")}>
          {tabs.map(([key, text]) => (
            <Link
              key={key}
              href={`/${locale}/portal/buchungen?g=${key}${projectFilter ? `&project=${projectFilter}` : ""}`}
              className={`rounded-full px-3 py-1 ring-1 ${group === key ? "bg-ink text-white ring-ink" : "ring-border hover:bg-bg-subtle"}`}
            >
              {text}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="g" value={group} />
          {staff && (
            <Select name="project" defaultValue={projectFilter ?? ""} className="w-48">
              <option value="">{t("Alle Projekte", "All projects")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
          <Input name="q" defaultValue={search} placeholder={t("Suche (Titel, Nummer)", "Search (title, number)")} className="w-56" />
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("Keine Buchungen in dieser Ansicht.", "No bookings in this view.")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("Buchung", "Booking")}</Th>
                {staff && <Th>{t("Projekt", "Project")}</Th>}
                <Th>{t("Termin", "Date")}</Th>
                <Th>{t("Bereiche", "Areas")}</Th>
                <Th>{t("Status", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, projectName }) => (
                <tr key={b.id} className="hover:bg-bg-subtle/50">
                  <Td>
                    <Link href={`/${locale}/portal/buchungen/${b.id}`} className="font-medium hover:underline">
                      {b.title}
                    </Link>
                    <p className="font-mono text-xs text-fg-muted">{b.number}</p>
                  </Td>
                  {staff && <Td className="text-sm">{projectName}</Td>}
                  <Td className="whitespace-nowrap text-sm">
                    {b.firstStart ? (
                      <>
                        {formatDate(b.firstStart, locale)} <span className="text-fg-muted">{formatTime(b.firstStart, locale)}</span>
                      </>
                    ) : (
                      "–"
                    )}
                  </Td>
                  <Td className="text-sm">{zonesOf(b.id) || "–"}</Td>
                  <Td>
                    <Badge tone={bookingStatusTone[b.status]}>{label(bookingStatusLabels, b.status, locale)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
