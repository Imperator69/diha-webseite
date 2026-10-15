import { ProjectForm } from "@/components/portal/project-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function NewProjectPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "projects.manage");
  const t = translator(locale);
  return (
    <>
      <PageHeader title={t("Projekt anlegen", "New project")} />
      <Card className="max-w-4xl">
        <CardBody>
          <ProjectForm locale={locale} />
        </CardBody>
      </Card>
    </>
  );
}
