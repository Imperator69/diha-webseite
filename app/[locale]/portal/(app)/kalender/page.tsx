import Link from "next/link";
import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { formatDate, formatTime, formatWeekday } from "@/lib/i18n/format";
import { blockReasonLabels, bookingStatusLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { addDays, nowMs, startOfIsoWeek, zonedDate, zonedToUtc } from "@/lib/time";

const statusColor: Record<string, string> = {
  draft: "bg-bg-subtle text-fg-muted ring-border",
  requested: "bg-warn/15 text-warn ring-warn/30",
  in_review: "bg-info/15 text-info ring-info/30",
  confirmed: "bg-ok/15 text-ok ring-ok/30",
  completed: "bg-bg-subtle text-fg ring-border",
  invoiced: "bg-bg-subtle text-fg-muted ring-border",
};

const visibleStatuses = ["requested", "in_review", "confirmed", "completed", "invoiced"] as const;

export default async function CalendarPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  const q = await searchParams;
  const staff = isStaff(viewer.role);
  const view = sp(q.view) === "zones" ? "zones" : "month";
  const today = zonedDate(nowMs());

  const monthParam = sp(q.month);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const weekParam = sp(q.week);
  const weekStart = startOfIsoWeek(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : today);

  const gridStart = view === "month" ? startOfIsoWeek(`${month}-01`) : weekStart;
  const gridDays = view === "month" ? 42 : 7;
  const days = Array.from({ length: gridDays }, (_, i) => addDays(gridStart, i));
  const fromMs = zonedToUtc(days[0], "00:00");
  const toMs = zonedToUtc(addDays(days[days.length - 1], 1), "00:00");

  const filters: SQL[] = [lte(schema.bookingPeriods.startsAt, toMs), gte(schema.bookingPeriods.endsAt, fromMs), inArray(schema.bookings.status, [...visibleStatuses])];
  if (!staff) filters.push(viewer.projectIds.length ? inArray(schema.bookings.projectId, viewer.projectIds) : eq(schema.bookings.id, "-"));
  const periods = await db()
    .select({ p: schema.bookingPeriods, b: schema.bookings, projectName: schema.projects.name })
    .from(schema.bookingPeriods)
    .innerJoin(schema.bookings, eq(schema.bookingPeriods.bookingId, schema.bookings.id))
    .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
    .where(and(...filters))
    .orderBy(asc(schema.bookingPeriods.startsAt));
  const blocks = await db()
    .select()
    .from(schema.siteBlocks)
    .where(and(lte(schema.siteBlocks.startsAt, toMs), gte(schema.siteBlocks.endsAt, fromMs)));
  const zones = await db().select().from(schema.zones).where(eq(schema.zones.active, true)).orderBy(asc(schema.zones.sortOrder));
  const bookingIds = [...new Set(periods.map((r) => r.b.id))];
  const bookingZones = bookingIds.length ? await db().select().from(schema.bookingZones).where(inArray(schema.bookingZones.bookingId, bookingIds)) : [];

  const onDay = (day: string) => {
    const s = zonedToUtc(day, "00:00");
    const e = zonedToUtc(addDays(day, 1), "00:00");
    return {
      items: periods.filter((r) => r.p.startsAt < e && r.p.endsAt > s),
      blocks: blocks.filter((b) => b.startsAt < e && b.endsAt > s),
    };
  };

  const [y, m] = month.split("-").map(Number);
  const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  const monthTitle = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-AT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  const base = `/${locale}/portal/kalender`;

  return (
    <>
      <PageHeader
        title={t("Kalender", "Calendar")}
        description={staff ? t("Alle Buchungen und Sperrzeiten am Gelände.", "All bookings and blackouts on site.") : t("Ihre Buchungen und Sperrzeiten am Gelände.", "Your bookings and site blackouts.")}
        actions={
          <div className="inline-flex rounded-lg p-0.5 text-sm ring-1 ring-border">
            <Link href={`${base}?month=${month}`} className={clsx("rounded-md px-3 py-1", view === "month" ? "bg-ink text-white" : "text-fg-muted")}>
              {t("Monat", "Month")}
            </Link>
            <Link href={`${base}?view=zones&week=${weekStart}`} className={clsx("rounded-md px-3 py-1", view === "zones" ? "bg-ink text-white" : "text-fg-muted")}>
              {t("Zonen je Woche", "Zones by week")}
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <Link href={view === "month" ? `${base}?month=${prevMonth}` : `${base}?view=zones&week=${addDays(weekStart, -7)}`} className={buttonClass("secondary", "sm")} aria-label={t("Zurück", "Previous")}>
          <ChevronLeft className="size-4" />
        </Link>
        <p className="min-w-48 text-center font-semibold capitalize">{view === "month" ? monthTitle : `${formatDate(weekStart, locale)} – ${formatDate(addDays(weekStart, 6), locale)}`}</p>
        <Link href={view === "month" ? `${base}?month=${nextMonth}` : `${base}?view=zones&week=${addDays(weekStart, 7)}`} className={buttonClass("secondary", "sm")} aria-label={t("Weiter", "Next")}>
          <ChevronRight className="size-4" />
        </Link>
        <Link href={view === "month" ? base : `${base}?view=zones`} className={buttonClass("ghost", "sm")}>
          {t("Heute", "Today")}
        </Link>
      </div>

      {view === "month" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-bg-subtle text-center text-xs font-semibold text-fg-muted">
            {days.slice(0, 7).map((d) => (
              <div key={d} className="py-2">
                {formatWeekday(zonedToUtc(d, "12:00"), locale)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const { items, blocks: dayBlocks } = onDay(d);
              const inMonth = d.startsWith(month);
              return (
                <div key={d} className={clsx("min-h-28 border-b border-r border-border p-1.5 text-xs", !inMonth && "bg-bg-subtle/50 text-fg-muted", d === today && "bg-signal/5")}>
                  <p className={clsx("mb-1 text-right font-semibold", d === today && "text-signal")}>{Number(d.slice(8))}</p>
                  <div className="space-y-1">
                    {dayBlocks.map((b) => (
                      <p key={b.id} className="truncate rounded bg-danger/10 px-1.5 py-0.5 text-[11px] font-medium text-danger ring-1 ring-danger/20" title={b.note ?? ""}>
                        ⛔ {label(blockReasonLabels, b.reason, locale)}
                      </p>
                    ))}
                    {items.slice(0, 4).map(({ p, b, projectName }) => (
                      <Link
                        key={p.id}
                        href={`/${locale}/portal/buchungen/${b.id}`}
                        className={clsx("block truncate rounded px-1.5 py-0.5 text-[11px] ring-1", statusColor[b.status])}
                        title={`${b.number} · ${b.title} · ${label(bookingStatusLabels, b.status, locale)}`}
                      >
                        <span className="tabular-nums">{formatTime(p.startsAt, locale)}</span> {staff ? projectName : b.title}
                      </Link>
                    ))}
                    {items.length > 4 && <p className="text-[11px] text-fg-muted">+{items.length - 4}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-xs">
            <thead>
              <tr className="bg-bg-subtle text-fg-muted">
                <th className="w-44 border-b border-border px-3 py-2 text-left">{t("Zone", "Zone")}</th>
                {days.map((d) => (
                  <th key={d} className={clsx("border-b border-l border-border px-2 py-2 text-left", d === today && "text-signal")}>
                    {formatWeekday(zonedToUtc(d, "12:00"), locale)} {formatDate(d, locale).slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id}>
                  <td className="border-b border-border px-3 py-2 align-top">
                    <span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: z.color }} />
                    <span className="font-semibold">{z.code}</span> <span className="text-fg-muted">{locale === "en" ? z.nameEn : z.nameDe}</span>
                  </td>
                  {days.map((d) => {
                    const { items, blocks: dayBlocks } = onDay(d);
                    const zoneItems = items.filter((r) => bookingZones.some((bz) => bz.bookingId === r.b.id && bz.zoneId === z.id));
                    const zoneBlocks = dayBlocks.filter((b) => b.zoneId === null || b.zoneId === z.id);
                    return (
                      <td key={d} className={clsx("h-16 border-b border-l border-border p-1 align-top", zoneBlocks.length > 0 && "bg-danger/5")}>
                        {zoneBlocks.length > 0 && <p className="mb-1 truncate text-[10px] font-medium text-danger">⛔ {label(blockReasonLabels, zoneBlocks[0].reason, locale)}</p>}
                        {zoneItems.map(({ p, b, projectName }) => (
                          <Link key={p.id} href={`/${locale}/portal/buchungen/${b.id}`} className={clsx("mb-1 block truncate rounded px-1 py-0.5 ring-1", statusColor[b.status])}>
                            {formatTime(p.startsAt, locale)}–{formatTime(p.endsAt, locale)} {staff ? projectName : b.title}
                          </Link>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-fg-muted">
        {visibleStatuses.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={clsx("inline-block size-3 rounded ring-1", statusColor[s])} />
            {label(bookingStatusLabels, s, locale)}
          </li>
        ))}
      </ul>
    </>
  );
}
