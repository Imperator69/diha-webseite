import { asc } from "drizzle-orm";
import { ActivityForm } from "@/components/portal/activity-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function NewActivityPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const rows = await db().select().from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder));
  return (
    <>
      <PageHeader title={t("Nutzungsart anlegen", "New type of use")} />
      <Card className="max-w-5xl">
        <CardBody>
          <ActivityForm
            locale={locale}
            activity={{ code: "", nameDe: "", nameEn: "", descDe: "", descEn: "", category: "ground", allowedZoneKinds: [], requiredRoles: ["project_lead"], requiredDocs: [], conflictsWith: [], detailFields: [], checklist: [], conditional: [], leadDays: 3, requiresSiteClearance: false, active: true, sortOrder: rows.length + 1 }}
            otherCodes={rows.map((r) => ({ code: r.code, name: locale === "en" ? r.nameEn : r.nameDe }))}
          />
        </CardBody>
      </Card>
    </>
  );
}
