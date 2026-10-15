import { asc } from "drizzle-orm";
import { ZoneEditor } from "@/components/site-map/zone-editor";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";
import { mapBaseImageUrl } from "@/lib/site-data/zones";

export default async function NewZonePage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const zones = await db().select().from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  return (
    <>
      <PageHeader title={t("Zone anlegen", "New zone")} />
      <Card>
        <CardBody>
          <ZoneEditor
            locale={locale}
            zone={{ code: `Z-${zones.length + 1}`, nameDe: "", nameEn: "", descDe: "", descEn: "", kind: "flight", color: "#2f6f8f", polygon: [], bookable: true, publicVisible: false, capacity: 1, areaHa: null, safetyNotes: null, sortOrder: zones.length + 1, active: true }}
            otherZones={zones.map((z) => ({ id: z.id, code: z.code, color: z.color, polygon: z.polygon }))}
            baseImageUrl={await mapBaseImageUrl()}
          />
        </CardBody>
      </Card>
    </>
  );
}
