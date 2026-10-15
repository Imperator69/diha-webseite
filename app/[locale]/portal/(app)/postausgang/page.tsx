import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/i18n/format";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function OutboxPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "settings.manage");
  const t = translator(locale);
  const rows = await db().select().from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.createdAt)).limit(100);
  const configured = Boolean(appEnv().RESEND_API_KEY);
  return (
    <>
      <PageHeader title={t("Postausgang", "Outbox")} description={t("Systemnachrichten der letzten Zeit. Inhalte werden nur gespeichert, wenn der Versand nicht möglich war.", "Recent system emails. Content is stored only if delivery was not possible.")} />
      {!configured && (
        <Alert tone="warn" className="mb-4">
          {t(
            "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt). Einladungen und Links bitte von hier manuell weitergeben.",
            "Email sending is not configured (RESEND_API_KEY missing). Please pass invitations and links on manually from here.",
          )}
        </Alert>
      )}
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("Zeitpunkt", "Time")}</Th>
              <Th>{t("An", "To")}</Th>
              <Th>{t("Betreff", "Subject")}</Th>
              <Th>{t("Status", "Status")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-sm">{formatDateTime(r.createdAt, locale)}</Td>
                <Td className="text-sm">{r.to}</Td>
                <Td className="text-sm">
                  {r.subject}
                  {r.body && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-fg-muted">{t("Inhalt anzeigen", "Show content")}</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-subtle p-3 text-xs">{r.body}</pre>
                    </details>
                  )}
                </Td>
                <Td>
                  <Badge tone={r.status === "sent" ? "ok" : r.status === "failed" ? "danger" : "warn"}>{r.status}</Badge>
                  {r.error && <p className="mt-1 text-xs text-danger">{r.error}</p>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
