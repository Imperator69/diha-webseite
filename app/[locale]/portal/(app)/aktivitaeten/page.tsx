import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { activityCategoryLabels, docKindLabels, label, personRoleLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function ActivitiesPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const rows = await db().select().from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder));
  return (
    <>
      <PageHeader
        title={t("Nutzungsarten", "Types of use")}
        description={t(
          "Was Projekte buchen können, mit Pflichtpersonen, Pflichtunterlagen, Vorlaufzeit und Ausschlüssen. Hier wird das Testangebot ergänzt.",
          "What projects can book, with required persons, documents, lead time and exclusions. Extend the testing offer here.",
        )}
        actions={
          <ButtonLink href={`/${locale}/portal/aktivitaeten/neu`}>
            <Plus className="size-4" />
            {t("Nutzungsart anlegen", "New type of use")}
          </ButtonLink>
        }
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("Nutzungsart", "Type of use")}</Th>
              <Th>{t("Pflichtpersonen", "Required persons")}</Th>
              <Th>{t("Pflichtunterlagen", "Required documents")}</Th>
              <Th>{t("Vorlauf", "Lead time")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className={a.active ? undefined : "opacity-50"}>
                <Td>
                  <Link href={`/${locale}/portal/aktivitaeten/${a.id}`} className="font-medium hover:underline">
                    {locale === "en" ? a.nameEn : a.nameDe}
                  </Link>
                  <p className="mt-1">
                    <Badge>{label(activityCategoryLabels, a.category, locale)}</Badge>
                  </p>
                </Td>
                <Td className="text-xs text-fg-muted">{a.requiredRoles.map((r) => label(personRoleLabels, r, locale)).join(", ")}</Td>
                <Td className="text-xs text-fg-muted">{a.requiredDocs.map((d) => label(docKindLabels, d, locale)).join(", ") || "–"}</Td>
                <Td className="whitespace-nowrap text-sm">
                  {a.leadDays} {t("Tage", "days")}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
