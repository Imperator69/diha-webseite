import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { IncidentForm, type IncidentValues } from "@/components/portal/incident-form";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/i18n/format";
import { label, severityLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { nowMs, zonedDate, zonedTime } from "@/lib/time";

const severityTone: Record<string, Tone> = { info: "neutral", minor: "info", major: "warn", serious: "danger" };

export default async function IncidentsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "site.manage");
  const t = translator(locale);
  const q = await searchParams;
  const now = nowMs();
  const [rows, zones, bookings] = await Promise.all([
    db()
      .select({ i: schema.incidents, zoneCode: schema.zones.code, bookingNumber: schema.bookings.number, author: schema.users.name })
      .from(schema.incidents)
      .leftJoin(schema.zones, eq(schema.incidents.zoneId, schema.zones.id))
      .leftJoin(schema.bookings, eq(schema.incidents.bookingId, schema.bookings.id))
      .leftJoin(schema.users, eq(schema.incidents.createdBy, schema.users.id))
      .orderBy(desc(schema.incidents.occurredAt))
      .limit(300),
    db().select({ id: schema.zones.id, code: schema.zones.code, nameDe: schema.zones.nameDe, nameEn: schema.zones.nameEn }).from(schema.zones).orderBy(asc(schema.zones.sortOrder)),
    db()
      .select({ id: schema.bookings.id, number: schema.bookings.number, title: schema.bookings.title })
      .from(schema.bookings)
      .where(and(inArray(schema.bookings.status, ["confirmed", "completed", "invoiced"]), gte(schema.bookings.lastEnd, now - 120 * 86_400_000), lte(schema.bookings.firstStart, now + 14 * 86_400_000)))
      .orderBy(desc(schema.bookings.firstStart)),
  ]);
  const editId = sp(q.edit);
  const editing = editId ? rows.find((r) => r.i.id === editId)?.i : undefined;
  // Die verknüpfte Buchung muss auswählbar bleiben, auch wenn sie älter ist
  const bookingOptions = bookings.map((b) => ({ id: b.id, label: `${b.number} · ${b.title}` }));
  if (editing?.bookingId && !bookingOptions.some((b) => b.id === editing.bookingId)) {
    const linked = rows.find((r) => r.i.id === editing.id);
    bookingOptions.unshift({ id: editing.bookingId, label: linked?.bookingNumber ?? editing.bookingId });
  }
  const values: IncidentValues = editing
    ? {
        id: editing.id,
        date: zonedDate(editing.occurredAt),
        time: zonedTime(editing.occurredAt),
        severity: editing.severity,
        title: editing.title,
        description: editing.description,
        actions: editing.actions,
        zoneId: editing.zoneId,
        bookingId: editing.bookingId,
        reportedToAuthority: editing.reportedToAuthority,
        authorityReference: editing.authorityReference,
        status: editing.status,
      }
    : { date: zonedDate(now), time: zonedTime(now), severity: "info", title: "", description: "", actions: null, zoneId: null, bookingId: null, reportedToAuthority: false, authorityReference: null, status: "open" };
  const open = rows.filter((r) => r.i.status === "open").length;

  return (
    <>
      <PageHeader
        title={t("Vorkommnisse", "Incidents")}
        description={t(
          "Ereignisse, Beinahe-Unfälle und Abweichungen am Gelände dokumentieren. Meldepflichten (z. B. nach VO (EU) 376/2014 an die Austro Control) bleiben davon unberührt.",
          "Record events, near misses and deviations on site. Reporting obligations (e.g. under Regulation (EU) 376/2014 to Austro Control) remain unaffected.",
        )}
        actions={open > 0 ? <Badge tone="warn">{t(`${open} offen`, `${open} open`)}</Badge> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {rows.length === 0 ? (
            <EmptyState title={t("Keine Vorkommnisse erfasst", "No incidents recorded")}>{t("Das ist gut so.", "Good.")}</EmptyState>
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <Th>{t("Zeitpunkt", "Time")}</Th>
                    <Th>{t("Schwere", "Severity")}</Th>
                    <Th>{t("Vorkommnis", "Incident")}</Th>
                    <Th>{t("Bezug", "Relates to")}</Th>
                    <Th>{t("Status", "Status")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ i, zoneCode, bookingNumber, author }) => (
                    <tr key={i.id} className={i.id === editId ? "bg-signal/5" : undefined}>
                      <Td className="whitespace-nowrap text-sm">{formatDateTime(i.occurredAt, locale)}</Td>
                      <Td>
                        <Badge tone={severityTone[i.severity]}>{label(severityLabels, i.severity, locale)}</Badge>
                      </Td>
                      <Td>
                        <Link href={`/${locale}/portal/vorkommnisse?edit=${i.id}`} className="font-medium hover:underline">
                          {i.title}
                        </Link>
                        <p className="text-xs text-fg-muted">
                          {author ?? "–"}
                          {i.reportedToAuthority && ` · ${t("gemeldet", "reported")}${i.authorityReference ? ` (${i.authorityReference})` : ""}`}
                        </p>
                      </Td>
                      <Td className="text-sm">
                        {zoneCode}
                        {zoneCode && bookingNumber && " · "}
                        {bookingNumber && i.bookingId && (
                          <Link href={`/${locale}/portal/buchungen/${i.bookingId}`} className="hover:underline">
                            {bookingNumber}
                          </Link>
                        )}
                        {!zoneCode && !bookingNumber && "–"}
                      </Td>
                      <Td>
                        <Badge tone={i.status === "open" ? "warn" : "ok"}>{i.status === "open" ? t("offen", "open") : t("abgeschlossen", "closed")}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
        <Card className="self-start">
          <CardHeader
            title={editing ? t("Vorkommnis bearbeiten", "Edit incident") : t("Vorkommnis erfassen", "Record incident")}
            actions={
              editing ? (
                <ButtonLink href={`/${locale}/portal/vorkommnisse`} variant="ghost" size="sm">
                  {t("Neu", "New")}
                </ButtonLink>
              ) : undefined
            }
          />
          <CardBody>
            <IncidentForm key={values.id ?? "new"} locale={locale} incident={values} zones={zones.map((z) => ({ id: z.id, code: z.code, name: locale === "en" ? z.nameEn : z.nameDe }))} bookings={bookingOptions} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
