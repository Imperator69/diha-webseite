import Link from "next/link";
import { clsx } from "clsx";
import { Download } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { Card, PageHeader } from "@/components/ui/card";
import { loadAnalytics, periodFor, periodPresets, type PeriodPreset } from "@/lib/analytics/data";
import { requireViewer } from "@/lib/auth/current";
import { formatMoney, formatNumber } from "@/lib/i18n/format";
import { label, permitStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { nowMs, zonedDate } from "@/lib/time";

export default async function AnalyticsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "reports.view");
  const t = translator(locale);
  const q = await searchParams;
  const now = nowMs();
  const preset = (periodPresets as readonly string[]).includes(sp(q.period) ?? "") ? (sp(q.period) as PeriodPreset) : "12m";
  const period = periodFor(preset, zonedDate(now));
  const a = await loadAnalytics(period, now);
  const intl = locale === "en" ? "en-GB" : "de-AT";
  const monthShort = (m: string) => new Intl.DateTimeFormat(intl, { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T00:00:00Z`));
  const monthLong = (m: string) => new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T00:00:00Z`));
  const presetNames: Record<PeriodPreset, string> = {
    "12m": t("Letzte 12 Monate", "Last 12 months"),
    ytd: t("Laufendes Jahr", "Year to date"),
    py: t("Vorjahr", "Previous year"),
    next3: t("Nächste 3 Monate", "Next 3 months"),
  };
  const chip = (on: boolean) => clsx("rounded-full px-3 py-1 text-xs ring-1", on ? "bg-fg text-bg ring-fg" : "ring-border hover:bg-bg-subtle");
  const hours = (h: number) => `${formatNumber(h, locale, h < 10 ? 1 : 0)} h`;
  const utilPct = a.totals.availableH > 0 ? a.totals.bookedH / a.totals.availableH : null;
  const tableLabel = t("Als Tabelle anzeigen", "Show as table");
  const csv = (kind: string) => `/api/reports/${kind}?period=${preset}&locale=${locale}`;

  const bookingSeries = [
    { key: "firm", label: t("bestätigt / durchgeführt", "confirmed / completed"), color: "var(--viz-1)", values: a.bookingsByMonth.map((r) => r.firm) },
    { key: "open", label: t("angefragt / in Prüfung", "requested / in review"), color: "var(--viz-2)", values: a.bookingsByMonth.map((r) => r.open) },
    { key: "declined", label: t("abgelehnt / storniert", "rejected / cancelled"), color: "var(--viz-3)", values: a.bookingsByMonth.map((r) => r.declined) },
  ];
  const revenueSeries = [
    { key: "invoiced", label: t("fakturiert (brutto)", "invoiced (gross)"), color: "var(--viz-1)", values: a.revenue.map((r) => r.invoiced) },
    { key: "received", label: t("Zahlungseingang", "payments received"), color: "var(--viz-2)", values: a.revenue.map((r) => r.received) },
  ];

  return (
    <>
      <PageHeader title={t("Auswertungen", "Analytics")} description={t("Auslastung, Buchungen, Umsatz und offene Posten.", "Utilisation, bookings, revenue and open items.")} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {periodPresets.map((p) => (
          <Link key={p} href={`/${locale}/portal/auswertungen?period=${p}`} className={chip(p === preset)} aria-current={p === preset ? "true" : undefined}>
            {presetNames[p]}
          </Link>
        ))}
        <span className="ml-auto flex flex-wrap gap-2 text-xs">
          {[
            ["bookings", t("Buchungen", "Bookings")],
            ["invoices", t("Rechnungen", "Invoices")],
            ["utilization", t("Auslastung", "Utilisation")],
          ].map(([k, l]) => (
            <a key={k} href={csv(k)} className="inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1 ring-border hover:bg-bg-subtle">
              <Download className="size-3.5" />
              CSV {l}
            </a>
          ))}
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [t("Auslastung", "Utilisation"), utilPct === null ? "–" : `${formatNumber(utilPct * 100, locale, 0)} %`, `${hours(a.totals.bookedH)} / ${hours(a.totals.availableH)}`],
          [t("Buchungen", "Bookings"), formatNumber(a.totals.bookings, locale), t(`${a.totals.firm} bestätigt`, `${a.totals.firm} confirmed`)],
          [t("Fakturiert", "Invoiced"), formatMoney(a.totals.invoiced, locale), t("brutto, inkl. Gutschriften", "gross, incl. credit notes")],
          [t("Zahlungseingang", "Payments received"), formatMoney(a.totals.received, locale), t("abzüglich Erstattungen", "net of refunds")],
          [t("Anfragen über Website", "Website enquiries"), formatNumber(a.totals.inquiries, locale), t("ohne Spam", "excluding spam")],
        ].map(([l, v, d]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-fg-muted">{l}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          className="xl:col-span-2"
          title={t("Auslastung je Zone", "Utilisation by zone")}
          description={t("Gebuchte Stunden bestätigter Termine innerhalb der Betriebsfenster (Slot-Vorlagen abzüglich Sperrzeiten).", "Booked hours of confirmed dates within operating windows (slot templates minus blackouts).")}
          tableLabel={tableLabel}
          table={{
            head: [t("Zone", "Zone"), ...period.months.map(monthShort)],
            rows: a.utilizationRows.map((r) => [r.code, ...r.cells.map((c) => (c.availableH > 0 ? `${Math.round((c.bookedH / c.availableH) * 100)} %` : "–"))]),
            alignRight: period.months.map((_, i) => i + 1),
          }}
        >
          <Heatmap
            locale={locale}
            ariaLabel={t("Auslastung je Zone und Monat", "Utilisation by zone and month")}
            columns={period.months.map(monthShort)}
            columnTitles={period.months.map(monthLong)}
            rows={a.utilizationRows.map((r) => ({
              key: r.zoneId,
              label: `${r.code} ${locale === "en" ? r.nameEn : r.nameDe}`,
              title: `${r.code} · ${locale === "en" ? r.nameEn : r.nameDe}`,
              cells: r.cells.map((c) => ({ ratio: c.availableH > 0 ? Math.min(1, c.bookedH / c.availableH) : null, detail: `${hours(c.bookedH)} / ${hours(c.availableH)}` })),
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t("Buchungen je Monat", "Bookings per month")}
          description={t("Nach Monat des ersten Termins", "By month of first date")}
          legend={bookingSeries.map((s) => ({ label: s.label, color: s.color }))}
          tableLabel={tableLabel}
          table={{
            head: [t("Monat", "Month"), ...bookingSeries.map((s) => s.label)],
            rows: a.bookingsByMonth.map((r) => [monthLong(r.month), r.firm, r.open, r.declined]),
            alignRight: [1, 2, 3],
          }}
        >
          <ColumnChart locale={locale} ariaLabel={t("Buchungen je Monat, gestapelt nach Status", "Bookings per month, stacked by status")} categories={period.months.map(monthShort)} tooltipTitles={period.months.map(monthLong)} series={bookingSeries} stacked format="count" />
        </ChartCard>

        <ChartCard
          title={t("Umsatz je Monat", "Revenue per month")}
          description={t("Rechnungsdatum bzw. Zahlungseingang, brutto", "By invoice date or payment date, gross")}
          legend={revenueSeries.map((s) => ({ label: s.label, color: s.color }))}
          tableLabel={tableLabel}
          table={{
            head: [t("Monat", "Month"), ...revenueSeries.map((s) => s.label)],
            rows: a.revenue.map((r) => [monthLong(r.month), formatMoney(r.invoiced, locale), formatMoney(r.received, locale)]),
            alignRight: [1, 2],
          }}
        >
          <ColumnChart locale={locale} ariaLabel={t("Fakturiert und Zahlungseingang je Monat", "Invoiced and received per month")} categories={period.months.map(monthShort)} tooltipTitles={period.months.map(monthLong)} series={revenueSeries} stacked={false} format="money" />
        </ChartCard>

        <ChartCard
          title={t("Offene Posten nach Alter", "Open items by age")}
          description={t(`Stichtag heute · gesamt ${formatMoney(a.totals.open, locale)}`, `As of today · total ${formatMoney(a.totals.open, locale)}`)}
          tableLabel={tableLabel}
          table={{ head: [t("Überfällig", "Overdue"), t("Rechnungen", "Invoices"), t("Offen", "Open")], rows: a.agingBuckets.map((b) => [b[locale], b.count, formatMoney(b.cents, locale)]), alignRight: [1, 2] }}
        >
          <BarList locale={locale} ariaLabel={t("Offene Posten nach Alter", "Open items by age")} format="money" items={a.agingBuckets.map((b) => ({ key: b.key, label: b[locale], value: b.cents, detail: t(`${b.count} Rechnungen`, `${b.count} invoices`) }))} />
        </ChartCard>

        <ChartCard
          title={t("Nutzungsarten", "Types of use")}
          description={t("Anzahl Buchungen im Zeitraum (ohne abgelehnte und stornierte)", "Number of bookings in the period (excluding rejected and cancelled)")}
          tableLabel={tableLabel}
          table={{ head: [t("Nutzungsart", "Type of use"), t("Buchungen", "Bookings")], rows: a.activityMix.map((m) => [locale === "en" ? m.nameEn : m.nameDe, m.count]), alignRight: [1] }}
        >
          {a.activityMix.length ? (
            <BarList locale={locale} ariaLabel={t("Buchungen je Nutzungsart", "Bookings by type of use")} format="count" items={a.activityMix.map((m) => ({ key: m.code, label: locale === "en" ? m.nameEn : m.nameDe, value: m.count }))} />
          ) : (
            <p className="text-sm text-fg-muted">{t("Keine Buchungen im Zeitraum.", "No bookings in the period.")}</p>
          )}
        </ChartCard>

        <Card className="xl:col-span-2">
          <div className="grid gap-0 divide-y divide-border lg:grid-cols-[1.6fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="p-5">
              <h2 className="mb-3 font-semibold">{t("Projekte im Zeitraum", "Projects in the period")}</h2>
              {a.topProjects.length === 0 ? (
                <p className="text-sm text-fg-muted">{t("Keine Daten.", "No data.")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-fg-muted">
                      <th className="pb-2 font-medium">{t("Projekt", "Project")}</th>
                      <th className="pb-2 text-right font-medium">{t("Buchungen", "Bookings")}</th>
                      <th className="pb-2 text-right font-medium">{t("Stunden", "Hours")}</th>
                      <th className="pb-2 text-right font-medium">{t("Fakturiert", "Invoiced")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.topProjects.map((p) => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="py-1.5">{p.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{p.bookings}</td>
                        <td className="py-1.5 text-right tabular-nums">{hours(p.hours)}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatMoney(p.invoiced, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-5">
              <h2 className="mb-3 font-semibold">{t("Genehmigungen", "Permits")}</h2>
              <dl className="space-y-1.5 text-sm">
                {Object.keys(permitStatusLabels).map((s) => (
                  <div key={s} className="flex justify-between gap-2">
                    <dt className="text-fg-muted">{label(permitStatusLabels, s, locale)}</dt>
                    <dd className="tabular-nums">{a.permitCounts[s] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
