import { asc, inArray } from "drizzle-orm";
import { PermitForm } from "@/components/portal/permit-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function NewPermitPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "permits.manage");
  const t = translator(locale);
  const staff = await db().select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.role, ["admin", "manager"])).orderBy(asc(schema.users.name));
  const zones = await db().select({ id: schema.zones.id, code: schema.zones.code }).from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  return (
    <>
      <PageHeader title={t("Eintrag anlegen", "New entry")} />
      <Card className="max-w-4xl">
        <CardBody>
          <PermitForm
            locale={locale}
            staff={staff}
            zones={zones}
            permit={{ title: "", authority: "austro_control", kind: "permit", status: "planned", referenceNo: null, submittedAt: null, decidedAt: null, validFrom: null, validUntil: null, nextDeadline: null, nextDeadlineNote: null, responsibleUserId: null, zoneId: null, notes: null }}
          />
        </CardBody>
      </Card>
    </>
  );
}
