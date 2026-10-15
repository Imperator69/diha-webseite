import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { BlockForm } from "@/components/portal/block-form";
import { Badge } from "@/components/ui/badge";
import { Alert, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { deleteBlockAction } from "@/lib/actions/site";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { blockReasonLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { nowMs } from "@/lib/time";

export default async function BlocksPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const q = await searchParams;
  const zones = await db().select().from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const blocks = await db()
    .select()
    .from(schema.siteBlocks)
    .where(gte(schema.siteBlocks.endsAt, nowMs() - 30 * 86_400_000))
    .orderBy(desc(schema.siteBlocks.startsAt));
  // Buchungen, die in eine Sperrzeit fallen (müssen mit dem Projekt abgestimmt oder verschoben werden)
  const minStart = Math.min(...blocks.map((b) => b.startsAt), Infinity);
  const maxEnd = Math.max(...blocks.map((b) => b.endsAt), 0);
  const affectedRows = blocks.length
    ? await db()
        .select({ p: schema.bookingPeriods, b: schema.bookings })
        .from(schema.bookingPeriods)
        .innerJoin(schema.bookings, eq(schema.bookingPeriods.bookingId, schema.bookings.id))
        .where(and(inArray(schema.bookings.status, ["requested", "in_review", "confirmed"]), lt(schema.bookingPeriods.startsAt, maxEnd), gte(schema.bookingPeriods.endsAt, minStart)))
    : [];
  const affectedZones = affectedRows.length
    ? await db()
        .select()
        .from(schema.bookingZones)
        .where(inArray(schema.bookingZones.bookingId, [...new Set(affectedRows.map((r) => r.b.id))].slice(0, 90)))
    : [];
  const affected = (block: (typeof blocks)[number]) => {
    const hits = affectedRows.filter(
      (r) => r.p.startsAt < block.endsAt && r.p.endsAt > block.startsAt && (block.zoneId === null || affectedZones.some((z) => z.bookingId === r.b.id && z.zoneId === block.zoneId)),
    );
    return [...new Map(hits.map((h) => [h.b.id, h.b])).values()];
  };
  return (
    <>
      <PageHeader
        title={t("Sperrzeiten", "Blackout periods")}
        description={t(
          "Zeiten, in denen Bereiche oder das ganze Gelände nicht buchbar sind, z. B. Sprengungen des Abbaubetriebs. Keine gleichzeitige Sprengung und Flugbetrieb.",
          "Periods when areas or the whole site cannot be booked, e.g. quarry blasting. No simultaneous blasting and flight operations.",
        )}
      />
      {sp(q.saved) === "deleted" && <Alert tone="ok" className="mb-4">{t("Sperrzeit gelöscht.", "Blackout deleted.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Aktuelle und kommende Sperrzeiten", "Current and upcoming blackouts")} />
          {blocks.length === 0 ? (
            <CardBody>
              <EmptyState title={t("Keine Sperrzeiten", "No blackouts")} />
            </CardBody>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("Zeitraum", "Period")}</Th>
                  <Th>{t("Bereich", "Area")}</Th>
                  <Th>{t("Grund", "Reason")}</Th>
                  <Th>{t("Betroffene Buchungen", "Affected bookings")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => {
                  const zone = b.zoneId ? zoneById.get(b.zoneId) : null;
                  const past = b.endsAt < nowMs();
                  return (
                    <tr key={b.id} className={past ? "opacity-50" : undefined}>
                      <Td className="text-sm">
                        {formatDateTime(b.startsAt, locale)}
                        <br />
                        <span className="text-fg-muted">– {formatDateTime(b.endsAt, locale)}</span>
                      </Td>
                      <Td className="text-sm">{zone ? `${zone.code} ${locale === "en" ? zone.nameEn : zone.nameDe}` : <Badge tone="danger">{t("Gesamtes Gelände", "Entire site")}</Badge>}</Td>
                      <Td className="text-sm">
                        {label(blockReasonLabels, b.reason, locale)}
                        {b.note && <p className="text-xs text-fg-muted">{b.note}</p>}
                      </Td>
                      <Td className="text-sm">
                        {affected(b).length === 0 ? (
                          <span className="text-fg-muted">–</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {affected(b).map((bk) => (
                              <li key={bk.id}>
                                <Badge tone="warn">!</Badge>{" "}
                                <Link href={`/${locale}/portal/buchungen/${bk.id}`} className="hover:underline">
                                  {bk.number}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Td>
                      <Td>
                        <form action={deleteBlockAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="text-xs text-danger hover:underline">
                            {t("Löschen", "Delete")}
                          </button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title={t("Neue Sperrzeit", "New blackout")} />
          <CardBody>
            <BlockForm locale={locale} zones={zones.map((z) => ({ id: z.id, code: z.code, name: locale === "en" ? z.nameEn : z.nameDe }))} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
