import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { ZoneEditor } from "@/components/site-map/zone-editor";
import { Alert, Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { mapBaseImageUrl } from "@/lib/site-data/zones";

export default async function ZonePage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const { id } = await params;
  const t = translator(locale);
  const zones = await db().select().from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  const zone = zones.find((z) => z.id === id);
  if (!zone) notFound();
  const q = await searchParams;
  return (
    <>
      <PageHeader eyebrow={t("Zone bearbeiten", "Edit zone")} title={`${zone.code} ${locale === "en" ? zone.nameEn : zone.nameDe}`} />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Zone angelegt.", "Zone created.")}</Alert>}
      <Card>
        <CardBody>
          <ZoneEditor
            locale={locale}
            zone={zone}
            otherZones={zones.filter((z) => z.id !== id).map((z) => ({ id: z.id, code: z.code, color: z.color, polygon: z.polygon }))}
            baseImageUrl={await mapBaseImageUrl()}
          />
        </CardBody>
      </Card>
    </>
  );
}
