import { asc, desc, gte } from "drizzle-orm";
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
    .where(gte(schema.siteBlocks.endsAt, Date.now() - 30 * 86_400_000))
    .orderBy(desc(schema.siteBlocks.startsAt));
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
                  <Th />
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => {
                  const zone = b.zoneId ? zoneById.get(b.zoneId) : null;
                  const past = b.endsAt < Date.now();
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
