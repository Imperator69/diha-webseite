import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ProjectForm } from "@/components/portal/project-form";
import { Badge, bookingStatusTone } from "@/components/ui/badge";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/i18n/format";
import { bookingStatusLabels, label, roleLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function ProjectDetailPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "projects.manage");
  const { id } = await params;
  const t = translator(locale);
  const project = (await db().select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1))[0];
  if (!project) notFound();
  const members = await db()
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, status: schema.users.status })
    .from(schema.projectMembers)
    .innerJoin(schema.users, eq(schema.projectMembers.userId, schema.users.id))
    .where(eq(schema.projectMembers.projectId, id));
  const bookings = await db().select().from(schema.bookings).where(eq(schema.bookings.projectId, id)).orderBy(desc(schema.bookings.firstStart)).limit(20);
  const q = await searchParams;

  return (
    <>
      <PageHeader eyebrow={t("Projekt", "Project")} title={project.name} description={project.organization} />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Projekt angelegt.", "Project created.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Stammdaten", "Master data")} />
          <CardBody>
            <ProjectForm locale={locale} project={project} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Zugänge", "Accounts")} description={can(viewer.role, "users.manage") ? undefined : t("Zuweisung durch Admins", "Assigned by admins")} />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    {can(viewer.role, "users.manage") ? (
                      <Link href={`/${locale}/portal/benutzer/${m.id}`} className="font-medium hover:underline">
                        {m.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{m.name}</span>
                    )}
                    <span className="text-xs text-fg-muted">{label(roleLabels, m.role, locale)}</span>
                  </li>
                ))}
                {members.length === 0 && <li className="text-fg-muted">{t("Noch keine Zugänge.", "No accounts yet.")}</li>}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Letzte Buchungen", "Recent bookings")} />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <Link href={`/${locale}/portal/buchungen/${b.id}`} className="hover:underline">
                      <span className="font-mono text-xs text-fg-muted">{b.number}</span> {b.title}
                      <span className="block text-xs text-fg-muted">{formatDate(b.firstStart, locale)}</span>
                    </Link>
                    <Badge tone={bookingStatusTone[b.status]}>{label(bookingStatusLabels, b.status, locale)}</Badge>
                  </li>
                ))}
                {bookings.length === 0 && <li className="text-fg-muted">–</li>}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
