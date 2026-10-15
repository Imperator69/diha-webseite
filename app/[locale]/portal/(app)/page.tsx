import Link from "next/link";
import { and, asc, eq, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { CalendarPlus } from "lucide-react";
import { Badge, bookingStatusTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatMoney, formatTime, formatWeekday } from "@/lib/i18n/format";
import { blockReasonLabels, bookingStatusLabels, docKindLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { isOverdue } from "@/lib/invoices/compute";
import { collectDigest } from "@/lib/jobs";
import { localeParam, type PageProps } from "@/lib/portal/params";
import { addDays, nowMs, zonedDate, zonedToUtc } from "@/lib/time";

function Tile({ label: l, value, href, tone }: { label: string; value: string | number; href?: string; tone?: "danger" | "warn" }) {
  const body = (
    <>
      <p className="text-xs text-fg-muted">{l}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : ""}`}>{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-bg-subtle">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border bg-card p-4">{body}</div>
  );
}

export default async function PortalHome({ params }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  return isStaff(viewer.role) ? <StaffHome locale={locale} name={viewer.name} /> : <ProjectHome locale={locale} name={viewer.name} projectIds={viewer.projectIds} />;
}

async function StaffHome({ locale, name }: { locale: Locale; name: string }) {
  const t = translator(locale);
  const now = nowMs();
  const today = zonedDate(now);
  const from = zonedToUtc(today, "00:00");
  const to = zonedToUtc(addDays(today, 2), "00:00");
  const base = `/${locale}/portal`;
  const [onSite, blocks, review, digest, openInvoices, newInquiries] = await Promise.all([
    db()
      .select({ p: schema.bookingPeriods, b: schema.bookings, projectName: schema.projects.name })
      .from(schema.bookingPeriods)
      .innerJoin(schema.bookings, eq(schema.bookingPeriods.bookingId, schema.bookings.id))
      .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
      .where(and(inArray(schema.bookings.status, ["confirmed", "completed"]), lt(schema.bookingPeriods.startsAt, to), gte(schema.bookingPeriods.endsAt, from)))
      .orderBy(asc(schema.bookingPeriods.startsAt)),
    db().select().from(schema.siteBlocks).where(and(lt(schema.siteBlocks.startsAt, to), gte(schema.siteBlocks.endsAt, from))).orderBy(asc(schema.siteBlocks.startsAt)),
    db()
      .select({ b: schema.bookings, projectName: schema.projects.name })
      .from(schema.bookings)
      .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
      .where(inArray(schema.bookings.status, ["requested", "in_review"]))
      .orderBy(asc(schema.bookings.firstStart)),
    collectDigest(now),
    db()
      .select({ status: schema.invoices.status, kind: schema.invoices.kind, dueDate: schema.invoices.dueDate, grossCents: schema.invoices.grossCents, paidCents: schema.invoices.paidCents })
      .from(schema.invoices)
      .where(and(eq(schema.invoices.kind, "invoice"), inArray(schema.invoices.status, ["issued", "partially_paid"]))),
    db().select({ id: schema.inquiries.id }).from(schema.inquiries).where(eq(schema.inquiries.status, "new")),
  ]);
  const zoneRows = onSite.length
    ? await db()
        .select({ bookingId: schema.bookingZones.bookingId, code: schema.zones.code })
        .from(schema.bookingZones)
        .innerJoin(schema.zones, eq(schema.bookingZones.zoneId, schema.zones.id))
        .where(inArray(schema.bookingZones.bookingId, [...new Set(onSite.map((r) => r.b.id))].slice(0, 90)))
    : [];
  const openCents = openInvoices.reduce((s, i) => s + i.grossCents - i.paidCents, 0);
  const overdueCount = openInvoices.filter((i) => isOverdue(i, today)).length;
  const dayLabel = (day: string) => (day === today ? t("Heute", "Today") : t("Morgen", "Tomorrow"));

  return (
    <>
      <PageHeader title={`${t("Guten Tag", "Hello")}, ${name.split(" ")[0]}`} description={`${formatWeekday(now, locale, "long")}, ${formatDate(today, locale)}`} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label={t("Heute am Gelände", "On site today")} value={onSite.filter((r) => r.p.startsAt < zonedToUtc(addDays(today, 1), "00:00")).length} href={`${base}/kalender?view=zones`} />
        <Tile label={t("Zu prüfen", "To review")} value={review.length} href={`${base}/buchungen`} tone={review.length ? "warn" : undefined} />
        <Tile label={t("Fristen und Hinweise", "Deadlines and notices")} value={digest.length} href="#fristen" tone={digest.length ? "warn" : undefined} />
        <Tile label={t("Offene Posten", "Open items")} value={formatMoney(openCents, locale)} href={`${base}/rechnungen?filter=open`} />
        <Tile label={t("Überfällige Rechnungen", "Overdue invoices")} value={overdueCount} href={`${base}/rechnungen?filter=overdue`} tone={overdueCount ? "danger" : undefined} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Heute und morgen am Gelände", "On site today and tomorrow")} />
            <CardBody>
              {onSite.length === 0 && blocks.length === 0 ? (
                <p className="text-sm text-fg-muted">{t("Keine bestätigten Termine und keine Sperrzeiten.", "No confirmed dates and no blackouts.")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {blocks.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-2 py-2">
                      <Badge tone="danger">{label(blockReasonLabels, b.reason, locale)}</Badge>
                      <span className="tabular-nums">
                        {formatDateTime(b.startsAt, locale)} – {formatTime(b.endsAt, locale)}
                      </span>
                      {b.note && <span className="text-fg-muted">{b.note}</span>}
                    </li>
                  ))}
                  {onSite.map(({ p, b, projectName }) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <span className="w-16 text-xs text-fg-muted">{dayLabel(zonedDate(Math.max(p.startsAt, from)))}</span>
                      <span className="tabular-nums">
                        {formatTime(p.startsAt, locale)}–{formatTime(p.endsAt, locale)}
                      </span>
                      <Link href={`${base}/buchungen/${b.id}`} className="font-medium hover:underline">
                        {projectName}
                      </Link>
                      <span className="text-fg-muted">{b.title}</span>
                      <span className="ml-auto text-xs text-fg-muted">
                        {zoneRows
                          .filter((z) => z.bookingId === b.id)
                          .map((z) => z.code)
                          .join(", ")}
                        {b.siteClearedAt ? "" : b.status === "completed" ? ` · ${t("Freigabe offen", "clearance open")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Zu prüfende Anfragen", "Requests to review")} />
            <CardBody>
              {review.length === 0 ? (
                <p className="text-sm text-fg-muted">{t("Nichts zu prüfen.", "Nothing to review.")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {review.map(({ b, projectName }) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <Link href={`${base}/buchungen/${b.id}`} className="font-medium hover:underline">
                        {b.number}
                      </Link>
                      <span>{projectName}</span>
                      <span className="text-fg-muted">{b.title}</span>
                      <span className="ml-auto text-xs tabular-nums text-fg-muted">{formatDateTime(b.firstStart, locale)}</span>
                      <Badge tone={bookingStatusTone[b.status]}>{label(bookingStatusLabels, b.status, locale)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card id="fristen">
            <CardHeader title={t("Fristen und Hinweise", "Deadlines and notices")} description={t("Genehmigungen, Unterlagen, Buchungen, Rechnungen", "Permits, documents, bookings, invoices")} />
            <CardBody>
              {digest.length === 0 ? (
                <p className="text-sm text-fg-muted">{t("Keine offenen Fristen.", "No open deadlines.")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {digest.slice(0, 15).map((d) => (
                    <li key={d.key}>
                      <Link href={`/${locale}${d.path}`} className="hover:underline">
                        {d.text[locale]}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          {newInquiries.length > 0 && (
            <Card>
              <CardBody className="flex items-center justify-between gap-3 text-sm">
                <span>{t(`${newInquiries.length} neue Anfragen über die Website`, `${newInquiries.length} new website enquiries`)}</span>
                <ButtonLink href={`${base}/anfragen`} size="sm" variant="secondary">
                  {t("Ansehen", "View")}
                </ButtonLink>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardBody className="flex flex-wrap gap-2">
              <ButtonLink href={`${base}/auswertungen`} variant="secondary" size="sm">
                {t("Auswertungen", "Analytics")}
              </ButtonLink>
              <ButtonLink href={`${base}/sperrzeiten`} variant="secondary" size="sm">
                {t("Sperrzeit eintragen", "Add blackout")}
              </ButtonLink>
              <ButtonLink href={`${base}/vorkommnisse`} variant="secondary" size="sm">
                {t("Vorkommnis erfassen", "Record incident")}
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

async function ProjectHome({ locale, name, projectIds }: { locale: Locale; name: string; projectIds: string[] }) {
  const t = translator(locale);
  const now = nowMs();
  const today = zonedDate(now);
  const base = `/${locale}/portal`;
  const none = projectIds.length === 0;
  const [upcoming, drafts, invoices, docs] = none
    ? [[], [], [], []]
    : await Promise.all([
        db()
          .select()
          .from(schema.bookings)
          .where(and(inArray(schema.bookings.projectId, projectIds), inArray(schema.bookings.status, ["requested", "in_review", "confirmed"]), gte(schema.bookings.lastEnd, now)))
          .orderBy(asc(schema.bookings.firstStart))
          .limit(10),
        db()
          .select()
          .from(schema.bookings)
          .where(and(inArray(schema.bookings.projectId, projectIds), eq(schema.bookings.status, "draft")))
          .orderBy(asc(schema.bookings.updatedAt))
          .limit(10),
        db()
          .select()
          .from(schema.invoices)
          .where(and(inArray(schema.invoices.projectId, projectIds), eq(schema.invoices.kind, "invoice"), inArray(schema.invoices.status, ["issued", "partially_paid"])))
          .orderBy(asc(schema.invoices.dueDate)),
        db()
          .select()
          .from(schema.documents)
          .where(and(inArray(schema.documents.projectId, projectIds), eq(schema.documents.scope, "project"), isNotNull(schema.documents.validUntil), lte(schema.documents.validUntil, addDays(today, 30))))
          .orderBy(asc(schema.documents.validUntil)),
      ]);
  return (
    <>
      <PageHeader
        title={`${t("Willkommen", "Welcome")}, ${name.split(" ")[0]}`}
        description={t("Testslots buchen, Unterlagen hochladen, Status verfolgen.", "Book test slots, upload documents, follow the status.")}
        actions={
          <ButtonLink href={`${base}/buchungen/neu`}>
            <CalendarPlus className="size-4" />
            {t("Slot buchen", "Book a slot")}
          </ButtonLink>
        }
      />
      {none && (
        <Card className="mb-6">
          <CardBody className="text-sm">{t("Ihr Zugang ist noch keinem Projekt zugeordnet. Bitte wenden Sie sich an DIHA.", "Your account is not assigned to a project yet. Please contact DIHA.")}</CardBody>
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("Ihre nächsten Termine", "Your upcoming dates")} />
          <CardBody>
            {upcoming.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("Keine anstehenden Termine.", "No upcoming dates.")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="tabular-nums text-fg-muted">{formatDateTime(b.firstStart, locale)}</span>
                    <Link href={`${base}/buchungen/${b.id}`} className="font-medium hover:underline">
                      {b.title}
                    </Link>
                    <Badge tone={bookingStatusTone[b.status]} className="ml-auto">
                      {label(bookingStatusLabels, b.status, locale)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("Entwürfe", "Drafts")} description={t("Noch nicht abgeschickte Anfragen", "Requests not yet submitted")} />
          <CardBody>
            {drafts.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("Keine Entwürfe.", "No drafts.")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {drafts.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2">
                    <Link href={`${base}/buchungen/${b.id}/bearbeiten`} className="font-medium hover:underline">
                      {b.title || b.number}
                    </Link>
                    <span className="ml-auto text-xs text-fg-muted">{formatDate(b.updatedAt, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("Offene Rechnungen", "Open invoices")} />
          <CardBody>
            {invoices.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("Keine offenen Rechnungen.", "No open invoices.")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {invoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
                    <Link href={`${base}/rechnungen/${i.id}`} className="font-medium hover:underline">
                      {i.number}
                    </Link>
                    <span className="tabular-nums">{formatMoney(i.grossCents - i.paidCents, locale)}</span>
                    <span className={`ml-auto text-xs ${isOverdue(i, today) ? "font-semibold text-danger" : "text-fg-muted"}`}>
                      {t("fällig", "due")} {formatDate(i.dueDate, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("Ablaufende Nachweise", "Expiring documents")} description={t("Projektunterlagen, die in 30 Tagen ablaufen", "Project documents expiring within 30 days")} />
          <CardBody>
            {docs.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("Alles aktuell.", "All up to date.")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-2">
                    <span>{label(docKindLabels, d.kind, locale)}</span>
                    <span className={`ml-auto text-xs ${d.validUntil! < today ? "font-semibold text-danger" : "text-fg-muted"}`}>
                      {t("gültig bis", "valid until")} {formatDate(d.validUntil, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`${base}/dokumente`} className="mt-3 inline-block text-xs font-semibold text-signal">
              {t("Zu den Dokumenten", "Go to documents")}
            </Link>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
