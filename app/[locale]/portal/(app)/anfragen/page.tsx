import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { inquiryStatusLabels, inquiryTopicLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function InquiriesPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "inquiries.manage");
  const t = translator(locale);
  const rows = await db().select().from(schema.inquiries).orderBy(desc(schema.inquiries.createdAt)).limit(200);
  const q = await searchParams;
  return (
    <>
      <PageHeader title={t("Anfragen", "Enquiries")} description={t("Eingänge über das Kontaktformular. Automatische Löschung nach 12 Monaten.", "Submissions from the contact form. Deleted automatically after 12 months.")} />
      {sp(q.saved) === "deleted" && <Alert tone="ok" className="mb-4">{t("Anfrage gelöscht.", "Enquiry deleted.")}</Alert>}
      {rows.length === 0 ? (
        <EmptyState title={t("Keine Anfragen", "No enquiries")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("Eingang", "Received")}</Th>
                <Th>{t("Absender:in", "Sender")}</Th>
                <Th>{t("Thema", "Topic")}</Th>
                <Th>{t("Status", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-sm">{formatDateTime(r.createdAt, locale)}</Td>
                  <Td>
                    <Link href={`/${locale}/portal/anfragen/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <p className="text-xs text-fg-muted">{r.organization ?? r.email}</p>
                  </Td>
                  <Td className="text-sm">{label(inquiryTopicLabels, r.topic, locale)}</Td>
                  <Td>
                    <Badge tone={r.status === "new" ? "signal" : r.status === "in_progress" ? "info" : "neutral"}>{label(inquiryStatusLabels, r.status, locale)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
