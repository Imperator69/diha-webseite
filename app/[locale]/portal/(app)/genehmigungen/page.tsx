import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Badge, permitStatusTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { loadPermitTemplatesAction } from "@/lib/actions/permits";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/i18n/format";
import { authorityLabels, label, permitKindLabels, permitStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { addDays, nowMs, zonedDate } from "@/lib/time";

export default async function PermitsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "permits.manage");
  const t = translator(locale);
  const q = await searchParams;
  const rows = await db()
    .select({ p: schema.permits, responsible: schema.users.name })
    .from(schema.permits)
    .leftJoin(schema.users, eq(schema.permits.responsibleUserId, schema.users.id))
    // Einträge mit Frist zuerst (SQLite sortiert NULL sonst nach vorne)
    .orderBy(sql`${schema.permits.nextDeadline} IS NULL`, asc(schema.permits.nextDeadline), asc(schema.permits.title));
  const today = zonedDate(nowMs());
  const soon = addDays(today, 60);
  const authority = sp(q.authority);
  const list = authority ? rows.filter((r) => r.p.authority === authority) : rows;
  const counts = {
    open: rows.filter((r) => ["planned", "preparing"].includes(r.p.status)).length,
    pending: rows.filter((r) => ["submitted", "improvement_requested"].includes(r.p.status)).length,
    granted: rows.filter((r) => r.p.status === "granted").length,
    expiring: rows.filter((r) => r.p.validUntil && r.p.validUntil <= soon).length,
  };
  return (
    <>
      <PageHeader
        title={t("Genehmigungen & Einreichungen", "Permits & submissions")}
        description={t(
          "Register aller Bewilligungen, Anträge, Anzeigen, Verträge und Versicherungen mit Fristen. Unterlagen hängen am jeweiligen Eintrag.",
          "Register of all permits, applications, notifications, contracts and insurance with deadlines. Documents are attached to each entry.",
        )}
        actions={
          <ButtonLink href={`/${locale}/portal/genehmigungen/neu`}>
            <Plus className="size-4" />
            {t("Eintrag anlegen", "New entry")}
          </ButtonLink>
        }
      />
      {sp(q.saved) === "templates" && (
        <Alert tone="ok" className="mb-4">
          {t("Standard-Register angelegt.", "Standard register created.")}
        </Alert>
      )}
      {sp(q.saved) === "deleted" && (
        <Alert tone="ok" className="mb-4">
          {t("Eintrag gelöscht.", "Entry deleted.")}
        </Alert>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          [t("In Vorbereitung", "In preparation"), counts.open],
          [t("Bei Behörde", "With authority"), counts.pending],
          [t("Bewilligt", "Granted"), counts.granted],
          [t("Läuft in 60 Tagen ab", "Expires within 60 days"), counts.expiring],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-fg-muted">{l}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("Noch keine Einträge", "No entries yet")}>
          <p>
            {t(
              "Mit einer Vorlage der typischen Verfahren starten (Austro Control, BH, Montanbehörde, Fernmeldebüro …).",
              "Start with a template of typical procedures (Austro Control, district authority, mining authority, telecom office …).",
            )}
          </p>
          <form action={loadPermitTemplatesAction} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="secondary">
              {t("Standard-Register anlegen", "Create standard register")}
            </Button>
          </form>
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Link href={`/${locale}/portal/genehmigungen`} className={`rounded-full px-3 py-1 ring-1 ${!authority ? "bg-fg text-bg ring-fg" : "ring-border"}`}>
              {t("Alle Stellen", "All bodies")}
            </Link>
            {[...new Set(rows.map((r) => r.p.authority))].map((a) => (
              <Link key={a} href={`/${locale}/portal/genehmigungen?authority=${a}`} className={`rounded-full px-3 py-1 ring-1 ${authority === a ? "bg-fg text-bg ring-fg" : "ring-border"}`}>
                {label(authorityLabels, a, locale)}
              </Link>
            ))}
          </div>
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>{t("Eintrag", "Entry")}</Th>
                  <Th>{t("Stelle", "Body")}</Th>
                  <Th>{t("Status", "Status")}</Th>
                  <Th>{t("Gültig bis", "Valid until")}</Th>
                  <Th>{t("Nächste Frist", "Next deadline")}</Th>
                  <Th>{t("Verantwortlich", "Responsible")}</Th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ p, responsible }) => {
                  const expiring = p.validUntil && p.validUntil <= soon;
                  const overdue = p.nextDeadline && p.nextDeadline < today;
                  return (
                    <tr key={p.id}>
                      <Td>
                        <Link href={`/${locale}/portal/genehmigungen/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                        <p className="text-xs text-fg-muted">
                          {label(permitKindLabels, p.kind, locale)}
                          {p.referenceNo && ` · ${p.referenceNo}`}
                        </p>
                      </Td>
                      <Td className="text-sm">{label(authorityLabels, p.authority, locale)}</Td>
                      <Td>
                        <Badge tone={permitStatusTone[p.status]}>{label(permitStatusLabels, p.status, locale)}</Badge>
                      </Td>
                      <Td className={`whitespace-nowrap text-sm ${expiring ? "font-semibold text-danger" : ""}`}>{formatDate(p.validUntil, locale)}</Td>
                      <Td className={`text-sm ${overdue ? "font-semibold text-danger" : ""}`}>
                        {formatDate(p.nextDeadline, locale)}
                        {p.nextDeadlineNote && <p className="text-xs text-fg-muted">{p.nextDeadlineNote}</p>}
                      </Td>
                      <Td className="text-sm">{responsible ?? "–"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
