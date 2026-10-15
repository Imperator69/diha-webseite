import { asc, eq } from "drizzle-orm";
import { UserCreateForm } from "@/components/portal/user-forms";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function NewUserPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "users.manage");
  const t = translator(locale);
  const projects = await db()
    .select({ id: schema.projects.id, name: schema.projects.name, organization: schema.projects.organization })
    .from(schema.projects)
    .where(eq(schema.projects.status, "active"))
    .orderBy(asc(schema.projects.name));
  return (
    <>
      <PageHeader title={t("Benutzer anlegen", "Add user")} description={t("Die Person erhält eine Einladung und legt ihr Passwort selbst fest.", "The person receives an invitation and sets their own password.")} />
      <Card className="max-w-3xl">
        <CardBody>
          <UserCreateForm locale={locale} projects={projects} />
        </CardBody>
      </Card>
    </>
  );
}
