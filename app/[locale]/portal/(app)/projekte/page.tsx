import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { admissionStatusLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function ProjectsPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "projects.manage");
  const t = translator(locale);
  const projects = await db().select().from(schema.projects).orderBy(asc(schema.projects.name));
  const bookingCounts = await db().select({ projectId: schema.bookings.projectId, value: count() }).from(schema.bookings).groupBy(schema.bookings.projectId);
  const memberCounts = await db().select({ projectId: schema.projectMembers.projectId, value: count() }).from(schema.projectMembers).groupBy(schema.projectMembers.projectId);
  const bc = new Map(bookingCounts.map((r) => [r.projectId, r.value]));
  const mc = new Map(memberCounts.map((r) => [r.projectId, r.value]));
  return (
    <>
      <PageHeader
        title={t("Projekte", "Projects")}
        description={t("Kunden und Projekte, die das Testgelände nutzen. Zugänge legen Admins unter Benutzer an.", "Customers and projects using the test site. Admins create accounts under Users.")}
        actions={
          <ButtonLink href={`/${locale}/portal/projekte/neu`}>
            <Plus className="size-4" />
            {t("Projekt anlegen", "New project")}
          </ButtonLink>
        }
      />
      {projects.length === 0 ? (
        <EmptyState title={t("Noch keine Projekte", "No projects yet")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("Projekt", "Project")}</Th>
                <Th>{t("Land", "Country")}</Th>
                <Th>{t("Zulassung", "Admission")}</Th>
                <Th>{t("Zugänge", "Accounts")}</Th>
                <Th>{t("Buchungen", "Bookings")}</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className={p.status === "archived" ? "opacity-60" : undefined}>
                  <Td>
                    <Link href={`/${locale}/portal/projekte/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-fg-muted">{p.organization}</p>
                  </Td>
                  <Td>{p.country}</Td>
                  <Td>
                    <Badge tone={p.admissionStatus === "approved" ? "ok" : p.admissionStatus === "rejected" ? "danger" : "warn"}>{label(admissionStatusLabels, p.admissionStatus, locale)}</Badge>
                  </Td>
                  <Td>{mc.get(p.id) ?? 0}</Td>
                  <Td>{bc.get(p.id) ?? 0}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
