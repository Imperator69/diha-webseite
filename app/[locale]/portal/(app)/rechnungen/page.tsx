import Link from "next/link";
import { and, desc, eq, gte, inArray, lte, ne, type SQL } from "drizzle-orm";
import { clsx } from "clsx";
import { FileDown, Plus } from "lucide-react";
import { Badge, invoiceStatusTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { requireViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { creditNoteStatusLabels, invoiceStatusLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { isOverdue } from "@/lib/invoices/compute";
import { bookingsToInvoice, OFFSET_NOTE } from "@/lib/invoices/data";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { nowMs, zonedDate } from "@/lib/time";

const filters = ["open", "overdue", "draft", "paid", "cancelled"] as const;

export default async function InvoicesPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  const q = await searchParams;
  const staff = can(viewer.role, "invoices.manage");
  const today = zonedDate(nowMs());
  const filter = filters.find((f) => f === sp(q.filter));

  const where: SQL[] = [];
  if (!staff) {
    where.push(viewer.projectIds.length ? inArray(schema.invoices.projectId, viewer.projectIds) : eq(schema.invoices.id, "-"));
    where.push(ne(schema.invoices.status, "draft"));
  }
  if (filter === "open" || filter === "overdue") where.push(inArray(schema.invoices.status, ["issued", "partially_paid"]));
  if (filter === "draft" || filter === "paid" || filter === "cancelled") where.push(eq(schema.invoices.status, filter));
  const rows = (
    await db()
      .select({ i: schema.invoices, projectName: schema.projects.name, bookingNumber: schema.bookings.number })
      .from(schema.invoices)
      .innerJoin(schema.projects, eq(schema.invoices.projectId, schema.projects.id))
      .leftJoin(schema.bookings, eq(schema.invoices.bookingId, schema.bookings.id))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(schema.invoices.createdAt))
      .limit(500)
  ).filter((r) => filter !== "overdue" || isOverdue(r.i, today));

  const year = today.slice(0, 4);
  const [all, yearPayments] = staff
    ? await Promise.all([
        db().select({ status: schema.invoices.status, kind: schema.invoices.kind, dueDate: schema.invoices.dueDate, grossCents: schema.invoices.grossCents, paidCents: schema.invoices.paidCents, issueDate: schema.invoices.issueDate }).from(schema.invoices),
        db()
          .select({ amountCents: schema.payments.amountCents, note: schema.payments.note })
          .from(schema.payments)
          .where(and(gte(schema.payments.receivedOn, `${year}-01-01`), lte(schema.payments.receivedOn, `${year}-12-31`))),
      ])
    : [[], []];
  const openItems = all.filter((i) => i.kind === "invoice" && (i.status === "issued" || i.status === "partially_paid"));
  const kpi = {
    open: openItems.reduce((s, i) => s + i.grossCents - i.paidCents, 0),
    overdue: openItems.filter((i) => isOverdue(i, today)).reduce((s, i) => s + i.grossCents - i.paidCents, 0),
    // fakturiert = alle ausgestellten Belege des Jahres; Storno wirkt über die (negative) Gutschrift
    year: all.filter((i) => i.status !== "draft" && i.issueDate?.startsWith(year)).reduce((s, i) => s + i.grossCents, 0),
    // Geldfluss: Eingänge minus Erstattungen, ohne interne Verrechnungen
    paidYear: yearPayments.filter((p) => p.note !== OFFSET_NOTE).reduce((s, p) => s + p.amountCents, 0),
  };
  const toInvoice = staff ? await bookingsToInvoice() : [];
  const filterNames: Record<(typeof filters)[number], string> = {
    open: t("offen", "open"),
    overdue: t("überfällig", "overdue"),
    draft: t("Entwürfe", "drafts"),
    paid: t("bezahlt", "paid"),
    cancelled: t("storniert", "cancelled"),
  };
  const chip = (active: boolean) => clsx("rounded-full px-3 py-1 ring-1", active ? "bg-ink text-white ring-ink" : "ring-border hover:bg-bg-subtle");
  const href = (f?: string) => `/${locale}/portal/rechnungen${f ? `?filter=${f}` : ""}`;

  return (
    <>
      <PageHeader
        title={t("Rechnungen", "Invoices")}
        description={staff ? t("Rechnungen nach § 11 UStG, Zahlungseingang und Mahnwesen.", "Invoices, incoming payments and reminders.") : t("Ihre Rechnungen und Gutschriften.", "Your invoices and credit notes.")}
        actions={
          staff ? (
            <div className="flex gap-2">
              <ButtonLink href={`/${locale}/portal/rechnungen/tarife`} variant="secondary">
                {t("Tarife", "Rates")}
              </ButtonLink>
              <ButtonLink href={`/${locale}/portal/rechnungen/neu`}>
                <Plus className="size-4" />
                {t("Rechnung", "Invoice")}
              </ButtonLink>
            </div>
          ) : undefined
        }
      />
      {sp(q.saved) === "deleted" && <Alert tone="ok" className="mb-4">{t("Entwurf gelöscht.", "Draft deleted.")}</Alert>}
      {staff && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            [t("Offene Posten", "Open items"), kpi.open],
            [t("davon überfällig", "of which overdue"), kpi.overdue],
            [t(`Fakturiert ${year} (brutto)`, `Invoiced ${year} (gross)`), kpi.year],
            [t(`Zahlungseingang ${year}`, `Payments received ${year}`), kpi.paidYear],
          ].map(([l, v], i) => (
            <div key={String(l)} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-fg-muted">{l}</p>
              <p className={clsx("mt-1 text-xl font-bold tabular-nums", i === 1 && Number(v) > 0 && "text-danger")}>{formatMoney(Number(v), locale)}</p>
            </div>
          ))}
        </div>
      )}
      {toInvoice.length > 0 && (
        <Card className="mb-6">
          <CardHeader title={t("Abzurechnende Buchungen", "Bookings to invoice")} description={t("Durchgeführt, aber noch ohne Rechnung.", "Completed but not yet invoiced.")} />
          <ul className="divide-y divide-border">
            {toInvoice.map(({ b, projectName }) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Link href={`/${locale}/portal/buchungen/${b.id}`} className="font-medium hover:underline">
                  {b.number}
                </Link>
                <span>{b.title}</span>
                <span className="text-fg-muted">{projectName}</span>
                <span className="text-fg-muted">{formatDate(b.lastEnd, locale)}</span>
                <form action={createInvoiceAction} className="ml-auto">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="project_id" value={b.projectId} />
                  <input type="hidden" name="booking_id" value={b.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    {t("Rechnung erstellen", "Create invoice")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Link href={href()} className={chip(!filter)}>
          {t("Alle", "All")}
        </Link>
        {filters
          .filter((f) => staff || f !== "draft")
          .map((f) => (
            <Link key={f} href={href(f)} className={chip(filter === f)}>
              {filterNames[f]}
            </Link>
          ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("Keine Rechnungen", "No invoices")}>{staff ? t("Rechnungen entstehen aus abgeschlossenen Buchungen oder frei.", "Invoices are created from completed bookings or freely.") : null}</EmptyState>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("Nummer", "Number")}</Th>
                {staff && <Th>{t("Projekt", "Project")}</Th>}
                <Th>{t("Datum", "Date")}</Th>
                <Th>{t("Fällig", "Due")}</Th>
                <Th className="text-right">{t("Betrag", "Amount")}</Th>
                <Th className="text-right">{t("Offen", "Open")}</Th>
                <Th>{t("Status", "Status")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ i, projectName, bookingNumber }) => {
                const overdue = isOverdue(i, today);
                return (
                  <tr key={i.id}>
                    <Td>
                      <Link href={`/${locale}/portal/rechnungen/${i.id}`} className="font-medium hover:underline">
                        {i.number ?? t("Entwurf", "Draft")}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {i.kind === "credit_note" ? t("Gutschrift", "Credit note") : t("Rechnung", "Invoice")}
                        {bookingNumber && ` · ${bookingNumber}`}
                      </p>
                    </Td>
                    {staff && <Td className="text-sm">{projectName}</Td>}
                    <Td className="whitespace-nowrap text-sm">{formatDate(i.issueDate, locale)}</Td>
                    <Td className={clsx("whitespace-nowrap text-sm", overdue && "font-semibold text-danger")}>{formatDate(i.dueDate, locale)}</Td>
                    <Td className="text-right text-sm tabular-nums">{formatMoney(i.grossCents, locale)}</Td>
                    <Td className="text-right text-sm tabular-nums">{i.status === "draft" || i.status === "cancelled" ? "–" : formatMoney(i.grossCents - i.paidCents, locale)}</Td>
                    <Td>
                      <Badge tone={overdue ? "danger" : invoiceStatusTone[i.status]}>{overdue ? t("überfällig", "overdue") : label(i.kind === "credit_note" ? creditNoteStatusLabels : invoiceStatusLabels, i.status, locale)}</Badge>
                      {i.dunningLevel > 0 && <span className="ml-1 text-xs text-fg-muted">M{i.dunningLevel}</span>}
                    </Td>
                    <Td>
                      {i.status !== "draft" && (
                        <a href={`/api/invoices/${i.id}/pdf`} className="inline-flex rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg" aria-label="PDF" target="_blank" rel="noopener">
                          <FileDown className="size-4" />
                        </a>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
