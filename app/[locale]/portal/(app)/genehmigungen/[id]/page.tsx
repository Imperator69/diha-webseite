import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { DocList } from "@/components/booking/doc-list";
import { DocUploader } from "@/components/booking/doc-uploader";
import { PermitForm } from "@/components/portal/permit-form";
import { Badge, permitStatusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { deletePermitAction } from "@/lib/actions/permits";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { authorityLabels, label, permitStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

function statusChange(data: unknown): { from: string; to: string } | null {
  const status = (data as { status?: { from?: unknown; to?: unknown } } | null)?.status;
  if (!status || typeof status.from !== "string" || typeof status.to !== "string" || status.from === status.to) return null;
  return { from: status.from, to: status.to };
}

export default async function PermitPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  await requireViewer(locale, "permits.manage");
  const { id } = await params;
  const t = translator(locale);
  const permit = (await db().select().from(schema.permits).where(eq(schema.permits.id, id)).limit(1))[0];
  if (!permit) notFound();
  const [staff, zones, docs, log] = await Promise.all([
    db().select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.role, ["admin", "manager"])).orderBy(asc(schema.users.name)),
    db().select({ id: schema.zones.id, code: schema.zones.code }).from(schema.zones).orderBy(asc(schema.zones.sortOrder)),
    db().select().from(schema.documents).where(eq(schema.documents.permitId, id)).orderBy(desc(schema.documents.createdAt)),
    db()
      .select({ a: schema.auditLog, user: schema.users.name })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
      .where(and(eq(schema.auditLog.entity, "permit"), eq(schema.auditLog.entityId, id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(20),
  ]);
  const q = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow={label(authorityLabels, permit.authority, locale)}
        title={permit.title}
        actions={<Badge tone={permitStatusTone[permit.status]}>{label(permitStatusLabels, permit.status, locale)}</Badge>}
      />
      {sp(q.saved) && <Alert tone="ok" className="mb-4">{t("Eintrag angelegt.", "Entry created.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardBody>
            <PermitForm locale={locale} permit={permit} staff={staff} zones={zones} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Unterlagen", "Documents")} description={t("Antrag, Bescheid, Korrespondenz", "Application, decision, correspondence")} />
            <CardBody className="space-y-4">
              <DocList
                locale={locale}
                canReview={false}
                docs={docs.map((d) => ({ id: d.id, kind: d.kind, title: d.title, fileName: d.fileName, validUntil: d.validUntil, status: d.status, scope: d.scope, canDelete: true }))}
              />
              <DocUploader locale={locale} scope="permit" permitId={permit.id} kinds={["submission", "permit_decision", "contract", "insurance", "site_plan", "safety_case", "emergency_plan", "other"]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Verlauf", "History")} />
            <CardBody>
              <ul className="space-y-2 text-xs">
                {log.map(({ a, user }) => (
                  <li key={a.id}>
                    <span className="text-fg-muted">{formatDateTime(a.createdAt, locale)}</span> · {user ?? "System"} · <span className="font-mono">{a.action}</span>
                    {(() => {
                      const change = statusChange(a.data);
                      return change ? (
                        <span>
                          {" "}
                          ({label(permitStatusLabels, change.from, locale)} → {label(permitStatusLabels, change.to, locale)})
                        </span>
                      ) : null;
                    })()}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <form action={deletePermitAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={permit.id} />
            <Button type="submit" variant="danger" size="sm">
              {t("Eintrag löschen", "Delete entry")}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
