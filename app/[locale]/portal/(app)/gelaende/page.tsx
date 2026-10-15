import Link from "next/link";
import { Plus } from "lucide-react";
import { MapImageForm } from "@/components/portal/map-image-form";
import { SiteMap } from "@/components/site-map/site-map";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { removeMapImageAction } from "@/lib/actions/site";
import { requireViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { label, zoneKindLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { mapBaseImageUrl, portalZones } from "@/lib/site-data/zones";

export default async function SitePage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  const manage = can(viewer.role, "site.manage");
  const [{ map, rows }, baseImage] = await Promise.all([portalZones(locale), mapBaseImageUrl()]);
  const q = await searchParams;
  return (
    <>
      <PageHeader
        title={t("Gelände", "Site")}
        description={t("Bereiche des Testgeländes. Zone anklicken, um sie heranzuzoomen.", "Areas of the test site. Click a zone to zoom in.")}
        actions={
          manage ? (
            <>
              <ButtonLink href={`/${locale}/portal/gelaende/slots`} variant="secondary">
                {t("Slot-Vorlagen", "Slot templates")}
              </ButtonLink>
              <ButtonLink href={`/${locale}/portal/gelaende/zonen/neu`}>
                <Plus className="size-4" />
                {t("Zone anlegen", "New zone")}
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={`/${locale}/portal/buchungen/neu`}>{t("Slot buchen", "Book a slot")}</ButtonLink>
          )
        }
      />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Gespeichert.", "Saved.")}</Alert>}
      <SiteMap
        zones={map}
        locale={locale}
        baseImageUrl={baseImage}
        tone="light"
        actionHref={viewer.role === "project" ? `/${locale}/portal/buchungen/neu` : undefined}
        actionLabel={t("Slot in dieser Zone buchen", "Book a slot in this zone")}
      />
      <div className={`mt-6 grid gap-6 ${manage ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
        <Card>
          <CardHeader title={t("Zonen", "Zones")} />
          <Table>
            <thead>
              <tr>
                <Th>{t("Zone", "Zone")}</Th>
                <Th>{t("Typ", "Type")}</Th>
                <Th>{t("Kapazität", "Capacity")}</Th>
                <Th>{t("Status", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((z) => manage || z.active)
                .map((z) => (
                  <tr key={z.id} className={z.active ? undefined : "opacity-50"}>
                    <Td>
                      <span className="mr-2 inline-block size-3 rounded-sm align-middle" style={{ background: z.color }} />
                      {manage ? (
                        <Link href={`/${locale}/portal/gelaende/zonen/${z.id}`} className="font-medium hover:underline">
                          {z.code} {locale === "en" ? z.nameEn : z.nameDe}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {z.code} {locale === "en" ? z.nameEn : z.nameDe}
                        </span>
                      )}
                      <p className="mt-1 max-w-xl text-xs text-fg-muted">{locale === "en" ? z.descEn : z.descDe}</p>
                    </Td>
                    <Td className="text-sm">{label(zoneKindLabels, z.kind, locale)}</Td>
                    <Td>{z.capacity}</Td>
                    <Td className="space-x-1">
                      <Badge tone={z.bookable ? "ok" : "neutral"}>{z.bookable ? t("buchbar", "bookable") : t("nicht buchbar", "not bookable")}</Badge>
                      {manage && !z.publicVisible && <Badge tone="info">{t("intern", "internal")}</Badge>}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Card>
        {manage && (
          <Card>
            <CardHeader title={t("Kartenbild", "Map image")} description={baseImage ? t("Eigenes Bild aktiv", "Custom image active") : t("Platzhalter-Illustration aktiv", "Placeholder illustration active")} />
            <CardBody className="space-y-4">
              <MapImageForm locale={locale} />
              {baseImage && (
                <form action={removeMapImageAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" size="sm" variant="ghost">
                    {t("Zur Illustration zurückkehren", "Revert to illustration")}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
