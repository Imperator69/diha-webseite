import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { deleteInquiryAction, setInquiryStatusAction } from "@/lib/actions/admin";
import { requireViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { inquiryStatusLabels, inquiryTopicLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function InquiryDetailPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "inquiries.manage");
  const { id } = await params;
  const t = translator(locale);
  const r = (await db().select().from(schema.inquiries).where(eq(schema.inquiries.id, id)).limit(1))[0];
  if (!r) notFound();
  const q = await searchParams;
  return (
    <>
      <PageHeader eyebrow={label(inquiryTopicLabels, r.topic, locale)} title={r.name} description={formatDateTime(r.createdAt, locale)} />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Gespeichert.", "Saved.")}</Alert>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Nachricht", "Message")} />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-6">{r.message}</p>
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Kontakt", "Contact")} />
            <CardBody className="space-y-1 text-sm">
              <p>{r.organization}</p>
              <p>
                <a href={`mailto:${r.email}`} className="text-signal underline">
                  {r.email}
                </a>
              </p>
              {r.phone && <p>{r.phone}</p>}
              <p className="text-fg-muted">{t("Sprache", "Language")}: {r.locale.toUpperCase()}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Bearbeitung", "Handling")} />
            <CardBody className="space-y-3">
              <form action={setInquiryStatusAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={r.id} />
                {(["in_progress", "done", "spam"] as const).map((s) => (
                  <Button key={s} type="submit" name="status" value={s} variant={r.status === s ? "primary" : "secondary"} size="sm">
                    {label(inquiryStatusLabels, s, locale)}
                  </Button>
                ))}
              </form>
              {can(viewer.role, "users.manage") && (
                <ButtonLink href={`/${locale}/portal/projekte/neu`} variant="ghost" size="sm">
                  {t("Projekt anlegen", "Create project")}
                </ButtonLink>
              )}
              <form action={deleteInquiryAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" variant="danger" size="sm">
                  {t("Anfrage löschen", "Delete enquiry")}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
