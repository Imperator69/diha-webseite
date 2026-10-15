import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { ActivityForm } from "@/components/portal/activity-form";
import { Alert, Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function ActivityPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const { id } = await params;
  const t = translator(locale);
  const rows = await db().select().from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder));
  const activity = rows.find((r) => r.id === id);
  if (!activity) notFound();
  const q = await searchParams;
  return (
    <>
      <PageHeader eyebrow={t("Nutzungsart", "Type of use")} title={locale === "en" ? activity.nameEn : activity.nameDe} />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Angelegt.", "Created.")}</Alert>}
      <Card className="max-w-5xl">
        <CardBody>
          <ActivityForm locale={locale} activity={activity} otherCodes={rows.filter((r) => r.id !== id).map((r) => ({ code: r.code, name: locale === "en" ? r.nameEn : r.nameDe }))} />
        </CardBody>
      </Card>
    </>
  );
}
