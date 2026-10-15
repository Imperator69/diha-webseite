import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ResendInviteForm, UserEditForm } from "@/components/portal/user-forms";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { anonymizeUserAction, resetUserTotpAction } from "@/lib/actions/admin";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { errorText } from "@/lib/i18n/errors";
import { formatDateTime } from "@/lib/i18n/format";
import { label, roleLabels, userStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function UserDetailPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "users.manage");
  const { id } = await params;
  const q = await searchParams;
  const t = translator(locale);
  const user = (await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0];
  if (!user) notFound();
  const projects = await db()
    .select({ id: schema.projects.id, name: schema.projects.name, organization: schema.projects.organization })
    .from(schema.projects)
    .orderBy(asc(schema.projects.name));
  const membership = await db().select().from(schema.projectMembers).where(eq(schema.projectMembers.userId, id));
  const log = await db().select().from(schema.auditLog).where(eq(schema.auditLog.entityId, id)).orderBy(desc(schema.auditLog.createdAt)).limit(15);

  return (
    <>
      <PageHeader
        eyebrow={label(roleLabels, user.role, locale)}
        title={user.name}
        description={user.email}
        actions={
          <>
            <Badge tone={user.status === "active" ? "ok" : user.status === "invited" ? "warn" : "neutral"}>{label(userStatusLabels, user.status, locale)}</Badge>
            <a href={`/api/admin/users/${user.id}/export`} className={buttonClass("secondary", "sm")}>
              {t("Datenauskunft (JSON)", "Data export (JSON)")}
            </a>
          </>
        }
      />
      {sp(q.error) && <Alert tone="danger" className="mb-4">{sp(q.error) === "self" ? t("Eigenes Konto kann nicht anonymisiert werden.", "You cannot anonymise your own account.") : errorText(locale, sp(q.error))}</Alert>}
      {sp(q.saved) === "totp" && <Alert tone="ok" className="mb-4">{t("2FA zurückgesetzt. Die Person richtet sie beim nächsten Login neu ein.", "2FA reset. The person will set it up again at next login.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Stammdaten und Rechte", "Profile and permissions")} />
          <CardBody>
            <UserEditForm
              locale={locale}
              user={{ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, locale: user.locale, phone: user.phone }}
              projects={projects}
              selected={membership.map((m) => m.projectId)}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Zugang", "Access")} />
            <CardBody className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-fg-muted">2FA</dt>
                <dd>{user.totpEnabled ? t("aktiv", "active") : t("nicht eingerichtet", "not set up")}</dd>
                <dt className="text-fg-muted">{t("Letzter Login", "Last login")}</dt>
                <dd>{formatDateTime(user.lastLoginAt, locale)}</dd>
                <dt className="text-fg-muted">{t("Angelegt", "Created")}</dt>
                <dd>{formatDateTime(user.createdAt, locale)}</dd>
              </dl>
              {user.status !== "disabled" && <ResendInviteForm locale={locale} userId={user.id} active={user.status === "active"} />}
              {user.totpEnabled && (
                <form action={resetUserTotpAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={user.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t("2FA zurücksetzen", "Reset 2FA")}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
          {user.id !== viewer.id && (
            <Card>
              <CardHeader title={t("Löschen (DSGVO)", "Erase (GDPR)")} />
              <CardBody className="space-y-3 text-sm text-fg-muted">
                <p>
                  {t(
                    "Entfernt Name, E-Mail, Telefon und Zugangsdaten. Buchungen und Rechnungen bleiben wegen Aufbewahrungspflichten anonymisiert erhalten.",
                    "Removes name, email, phone and credentials. Bookings and invoices remain in anonymised form due to retention duties.",
                  )}
                </p>
                <form action={anonymizeUserAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={user.id} />
                  <Button type="submit" variant="danger" size="sm">
                    {t("Benutzer anonymisieren", "Anonymise user")}
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t("Verlauf", "History")} />
            <CardBody>
              <ul className="space-y-2 text-xs">
                {log.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span className="font-mono">{entry.action}</span>
                    <span className="text-fg-muted">{formatDateTime(entry.createdAt, locale)}</span>
                  </li>
                ))}
                {log.length === 0 && <li className="text-fg-muted">–</li>}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
