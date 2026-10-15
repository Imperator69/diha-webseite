import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { label, roleLabels, userStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function UsersPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "users.manage");
  const t = translator(locale);
  const q = await searchParams;
  const users = await db().select().from(schema.users).orderBy(asc(schema.users.name));
  const members = await db()
    .select({ userId: schema.projectMembers.userId, name: schema.projects.name })
    .from(schema.projectMembers)
    .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id));
  const byUser = new Map<string, string[]>();
  for (const m of members) byUser.set(m.userId, [...(byUser.get(m.userId) ?? []), m.name]);
  const role = sp(q.role);
  const list = role ? users.filter((u) => u.role === role) : users;

  return (
    <>
      <PageHeader
        title={t("Benutzer", "Users")}
        description={t("Admins legen Zugänge an und vergeben Rollen. Admin und Manager benötigen 2FA.", "Admins create accounts and assign roles. Admins and managers require 2FA.")}
        actions={
          <ButtonLink href={`/${locale}/portal/benutzer/neu`}>
            <UserPlus className="size-4" />
            {t("Benutzer anlegen", "Add user")}
          </ButtonLink>
        }
      />
      {sp(q.saved) === "anonymized" && <Alert tone="ok" className="mb-4">{t("Benutzer anonymisiert.", "User anonymised.")}</Alert>}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[undefined, "admin", "manager", "project"].map((r) => (
          <Link
            key={r ?? "all"}
            href={`/${locale}/portal/benutzer${r ? `?role=${r}` : ""}`}
            className={`rounded-full px-3 py-1 ring-1 ${role === r ? "bg-ink text-white ring-ink" : "ring-border hover:bg-bg-subtle"}`}
          >
            {r ? label(roleLabels, r, locale) : t("Alle", "All")}
          </Link>
        ))}
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("Name", "Name")}</Th>
              <Th>{t("Rolle", "Role")}</Th>
              <Th>{t("Status", "Status")}</Th>
              <Th>2FA</Th>
              <Th>{t("Projekte", "Projects")}</Th>
              <Th>{t("Letzter Login", "Last login")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-bg-subtle/50">
                <Td>
                  <Link href={`/${locale}/portal/benutzer/${u.id}`} className="font-medium hover:underline">
                    {u.name}
                  </Link>
                  <p className="text-xs text-fg-muted">{u.email}</p>
                </Td>
                <Td>{label(roleLabels, u.role, locale)}</Td>
                <Td>
                  <Badge tone={u.status === "active" ? "ok" : u.status === "invited" ? "warn" : "neutral"}>{label(userStatusLabels, u.status, locale)}</Badge>
                </Td>
                <Td>{u.totpEnabled ? <ShieldCheck className="size-4 text-ok" aria-label={t("aktiv", "active")} /> : <span className="text-fg-muted">–</span>}</Td>
                <Td className="text-sm text-fg-muted">{(byUser.get(u.id) ?? []).join(", ") || "–"}</Td>
                <Td className="text-sm text-fg-muted">{formatDateTime(u.lastLoginAt, locale)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
