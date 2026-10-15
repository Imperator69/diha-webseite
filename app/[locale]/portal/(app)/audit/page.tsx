import Link from "next/link";
import { and, desc, eq, like, lt } from "drizzle-orm";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

const PAGE = 50;

export default async function AuditPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "audit.view");
  const t = translator(locale);
  const q = await searchParams;
  const action = sp(q.action)?.trim();
  const before = Number(sp(q.before)) || null;
  const filters = [action ? like(schema.auditLog.action, `${action}%`) : undefined, before ? lt(schema.auditLog.createdAt, before) : undefined].filter(Boolean);
  const rows = await db()
    .select({ log: schema.auditLog, userName: schema.users.name })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const nextBefore = rows.length > PAGE ? page[page.length - 1].log.createdAt : null;
  return (
    <>
      <PageHeader title={t("Audit-Log", "Audit log")} description={t("Nachvollziehbarkeit aller Änderungen im Portal.", "Traceability of all changes in the portal.")} />
      <form className="mb-4 flex max-w-md gap-2">
        <Input name="action" placeholder={t("Aktion filtern, z. B. booking. oder user.", "Filter action, e.g. booking. or user.")} defaultValue={action} />
        <Button type="submit" variant="secondary">
          {t("Filtern", "Filter")}
        </Button>
      </form>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("Zeitpunkt", "Time")}</Th>
              <Th>{t("Benutzer", "User")}</Th>
              <Th>{t("Aktion", "Action")}</Th>
              <Th>{t("Objekt", "Object")}</Th>
              <Th>{t("Details", "Details")}</Th>
            </tr>
          </thead>
          <tbody>
            {page.map(({ log, userName }) => (
              <tr key={log.id}>
                <Td className="whitespace-nowrap text-sm">{formatDateTime(log.createdAt, locale)}</Td>
                <Td className="text-sm">{userName ?? t("System", "System")}</Td>
                <Td className="font-mono text-xs">{log.action}</Td>
                <Td className="font-mono text-xs text-fg-muted">
                  {log.entity}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                </Td>
                <Td className="max-w-md truncate font-mono text-xs text-fg-muted">{log.data ? JSON.stringify(log.data) : ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {nextBefore && (
        <div className="mt-4">
          <Link href={`?${new URLSearchParams({ ...(action ? { action } : {}), before: String(nextBefore) })}`} className="text-sm font-semibold text-signal">
            {t("Ältere Einträge", "Older entries")} →
          </Link>
        </div>
      )}
    </>
  );
}
