import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, type SQL } from "drizzle-orm";
import { clsx } from "clsx";
import { DocList, type ListedDoc } from "@/components/booking/doc-list";
import { DocUploader } from "@/components/booking/doc-uploader";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { requireViewer, type Viewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { addDays, nowMs, zonedDate } from "@/lib/time";

const siteKinds = ["emergency_plan", "site_plan", "safety_case", "contract", "insurance", "permit_decision", "submission", "other"];
const projectKinds = ["operator_registration", "pilot_competency", "operation_authorisation", "insurance", "company_register", "end_use_declaration", "radio_license", "risk_assessment", "other"];
const scopeFilters = ["site", "zone", "project", "booking", "permit"] as const;
const statusFilters = ["uploaded", "rejected", "expiring", "expired"] as const;

type Row = {
  d: typeof schema.documents.$inferSelect;
  projectName: string | null;
  bookingNumber: string | null;
  permitTitle: string | null;
  zoneCode: string | null;
};

function baseQuery(where: SQL | undefined) {
  return db()
    .select({ d: schema.documents, projectName: schema.projects.name, bookingNumber: schema.bookings.number, permitTitle: schema.permits.title, zoneCode: schema.zones.code })
    .from(schema.documents)
    .leftJoin(schema.projects, eq(schema.documents.projectId, schema.projects.id))
    .leftJoin(schema.bookings, eq(schema.documents.bookingId, schema.bookings.id))
    .leftJoin(schema.permits, eq(schema.documents.permitId, schema.permits.id))
    .leftJoin(schema.zones, eq(schema.documents.zoneId, schema.zones.id))
    .where(where)
    .orderBy(desc(schema.documents.createdAt))
    .limit(500);
}

function toListed(r: Row, locale: Locale, viewer: Viewer, withContext: boolean): ListedDoc {
  const t = translator(locale);
  const base = `/${locale}/portal`;
  let context: ListedDoc["context"];
  if (withContext) {
    if (r.d.scope === "booking" && r.d.bookingId) context = { label: `${r.bookingNumber ?? ""}${isStaff(viewer.role) && r.projectName ? ` · ${r.projectName}` : ""}`, href: `${base}/buchungen/${r.d.bookingId}` };
    else if (r.d.scope === "project") context = { label: `${t("Projekt", "Project")} ${r.projectName ?? ""}`, href: isStaff(viewer.role) && r.d.projectId ? `${base}/projekte/${r.d.projectId}` : undefined };
    else if (r.d.scope === "permit" && r.d.permitId) context = { label: r.permitTitle ?? t("Genehmigung", "Permit"), href: `${base}/genehmigungen/${r.d.permitId}` };
    else if (r.d.scope === "zone") context = { label: `${t("Zone", "Zone")} ${r.zoneCode ?? ""}` };
    else if (r.d.scope === "site") context = { label: t("Gelände", "Site") };
  }
  return {
    id: r.d.id,
    kind: r.d.kind,
    title: r.d.title,
    fileName: r.d.fileName,
    validUntil: r.d.validUntil,
    status: r.d.status,
    scope: r.d.scope,
    canDelete: isStaff(viewer.role) || (r.d.uploadedBy === viewer.id && r.d.status !== "accepted"),
    context,
  };
}

export default async function DocumentsPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  const q = await searchParams;
  const today = zonedDate(nowMs());

  if (!isStaff(viewer.role)) {
    const projects = viewer.projectIds.length
      ? await db().select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(inArray(schema.projects.id, viewer.projectIds)).orderBy(asc(schema.projects.name))
      : [];
    const rows = projects.length ? await baseQuery(and(inArray(schema.documents.projectId, viewer.projectIds), inArray(schema.documents.scope, ["project", "booking"]))) : [];
    return (
      <>
        <PageHeader
          title={t("Dokumente", "Documents")}
          description={t(
            "Projektunterlagen gelten für alle Buchungen Ihres Projekts (z. B. Betreiber-ID, Versicherung). Buchungsbezogene Unterlagen laden Sie in der jeweiligen Buchung hoch.",
            "Project documents apply to all bookings of your project (e.g. operator ID, insurance). Booking-specific documents are uploaded in the booking itself.",
          )}
        />
        {projects.length === 0 && <EmptyState title={t("Keinem Projekt zugeordnet", "Not assigned to a project")}>{t("Bitte wenden Sie sich an DIHA.", "Please contact DIHA.")}</EmptyState>}
        <div className="space-y-6">
          {projects.map((p) => {
            const own = rows.filter((r) => r.d.projectId === p.id);
            return (
              <Card key={p.id}>
                <CardHeader title={p.name} />
                <CardBody className="space-y-6">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">{t("Projektunterlagen", "Project documents")}</h3>
                    <DocList locale={locale} canReview={false} docs={own.filter((r) => r.d.scope === "project").map((r) => toListed(r, locale, viewer, false))} />
                    <div className="mt-4">
                      <DocUploader locale={locale} scope="project" projectId={p.id} kinds={projectKinds} />
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">{t("Unterlagen zu Buchungen", "Booking documents")}</h3>
                    <DocList locale={locale} canReview={false} docs={own.filter((r) => r.d.scope === "booking").map((r) => toListed(r, locale, viewer, true))} />
                  </section>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  const scope = scopeFilters.find((s) => s === sp(q.scope));
  const status = statusFilters.find((s) => s === sp(q.status));
  const filters: SQL[] = [];
  if (scope) filters.push(eq(schema.documents.scope, scope));
  if (status === "uploaded" || status === "rejected") filters.push(eq(schema.documents.status, status));
  if (status === "expiring") filters.push(gte(schema.documents.validUntil, today), lte(schema.documents.validUntil, addDays(today, 60)));
  if (status === "expired") filters.push(isNotNull(schema.documents.validUntil), lte(schema.documents.validUntil, addDays(today, -1)));
  const [rows, all, zones] = await Promise.all([
    baseQuery(filters.length ? and(...filters) : undefined),
    db().select({ status: schema.documents.status, validUntil: schema.documents.validUntil }).from(schema.documents),
    db().select({ id: schema.zones.id, code: schema.zones.code, nameDe: schema.zones.nameDe, nameEn: schema.zones.nameEn }).from(schema.zones).orderBy(asc(schema.zones.sortOrder)),
  ]);
  const counts = {
    uploaded: all.filter((d) => d.status === "uploaded").length,
    expiring: all.filter((d) => d.validUntil && d.validUntil >= today && d.validUntil <= addDays(today, 60)).length,
    expired: all.filter((d) => d.validUntil && d.validUntil < today).length,
  };
  const href = (next: { scope?: string; status?: string }) => {
    const p = new URLSearchParams();
    const s = "scope" in next ? next.scope : scope;
    const st = "status" in next ? next.status : status;
    if (s) p.set("scope", s);
    if (st) p.set("status", st);
    const qs = p.toString();
    return `/${locale}/portal/dokumente${qs ? `?${qs}` : ""}`;
  };
  const scopeNames: Record<(typeof scopeFilters)[number], string> = {
    site: t("Gelände", "Site"),
    zone: t("Zonen", "Zones"),
    project: t("Projekte", "Projects"),
    booking: t("Buchungen", "Bookings"),
    permit: t("Genehmigungen", "Permits"),
  };
  const statusNames: Record<(typeof statusFilters)[number], string> = {
    uploaded: `${t("ungeprüft", "pending review")} (${counts.uploaded})`,
    rejected: t("abgelehnt", "rejected"),
    expiring: `${t("läuft in 60 Tagen ab", "expires within 60 days")} (${counts.expiring})`,
    expired: `${t("abgelaufen", "expired")} (${counts.expired})`,
  };
  const chip = (active: boolean) => clsx("rounded-full px-3 py-1 ring-1", active ? "bg-fg text-bg ring-fg" : "ring-border hover:bg-bg-subtle");

  return (
    <>
      <PageHeader
        title={t("Dokumente", "Documents")}
        description={t(
          "Alle Unterlagen an einem Ort: Gelände und Zonen (Einsatzplan, Lageplan, Verträge), Genehmigungen, Projekt- und Buchungsnachweise.",
          "All documents in one place: site and zones (emergency plan, site plan, contracts), permits, project and booking evidence.",
        )}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Link href={href({ scope: undefined })} className={chip(!scope)}>
              {t("Alle Bereiche", "All areas")}
            </Link>
            {scopeFilters.map((s) => (
              <Link key={s} href={href({ scope: s })} className={chip(scope === s)}>
                {scopeNames[s]}
              </Link>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <Link href={href({ status: undefined })} className={chip(!status)}>
              {t("Jeder Status", "Any status")}
            </Link>
            {statusFilters.map((s) => (
              <Link key={s} href={href({ status: s })} className={chip(status === s)}>
                {statusNames[s]}
              </Link>
            ))}
          </div>
          <Card>
            <CardBody>
              <DocList locale={locale} canReview docs={rows.map((r) => toListed(r, locale, viewer, true))} />
              {rows.length === 500 && <p className="mt-3 text-xs text-fg-muted">{t("Die neuesten 500 Einträge werden angezeigt.", "Showing the latest 500 entries.")}</p>}
            </CardBody>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader
            title={t("Gelände-Unterlage hochladen", "Upload site document")}
            description={t("z. B. Einsatz- und Alarmplan, Lageplan, Nutzungsvertrag, Versicherung des Testzentrums", "e.g. emergency plan, site plan, land use contract, test centre insurance")}
          />
          <CardBody>
            <DocUploader locale={locale} scope="site" kinds={siteKinds} zones={zones.map((z) => ({ id: z.id, code: z.code, name: locale === "en" ? z.nameEn : z.nameDe }))} />
            <p className="mt-3 text-xs text-fg-muted">
              {t("Unterlagen zu Behördenverfahren bitte direkt am Eintrag unter ", "Please attach documents for authority procedures directly to the entry under ")}
              <Link href={`/${locale}/portal/genehmigungen`} className="font-medium underline">
                {t("Genehmigungen", "Permits")}
              </Link>
              {t(" ablegen.", ".")}
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
