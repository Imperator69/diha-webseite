import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Trash2 } from "lucide-react";
import { DraftEditor } from "@/components/invoices/draft-editor";
import { PaymentForm } from "@/components/invoices/payment-form";
import { Badge, invoiceStatusTone } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Table, Td, Th } from "@/components/ui/table";
import type { PartySnapshot } from "@/db/schema";
import { cancelInvoiceAction, deleteDraftAction, deletePaymentAction, sendInvoiceAction } from "@/lib/actions/invoices";
import { requireViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n/format";
import { creditNoteStatusLabels, invoiceStatusLabels, label, paymentMethodLabels, rateUnitLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { isOverdue, issueProblems, partyFromCompany, partyFromProject, issueProblemText } from "@/lib/invoices/compute";
import { loadInvoice, OFFSET_NOTE } from "@/lib/invoices/data";
import { loadCatalog } from "@/lib/bookings/data";
import { totals } from "@/lib/pricing";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { getSetting } from "@/lib/settings";
import { nowMs, zonedDate } from "@/lib/time";

const unitText: Record<string, { de: string; en: string }> = { ...rateUnitLabels, piece: { de: "Stück", en: "piece" } };

function Party({ title, party }: { title: string; party: PartySnapshot }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
      <p className="mt-1 font-semibold">{party.name || "–"}</p>
      {party.lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
      {party.vatId && <p className="text-fg-muted">UID {party.vatId}</p>}
      {party.email && <p className="text-fg-muted">{party.email}</p>}
    </div>
  );
}

export default async function InvoicePage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  const { id } = await params;
  const q = await searchParams;
  const full = await loadInvoice(id);
  const staff = can(viewer.role, "invoices.manage");
  if (!full || (!staff && (full.invoice.status === "draft" || !viewer.projectIds.includes(full.invoice.projectId)))) notFound();
  const inv = full.invoice;
  const today = zonedDate(nowMs());
  const overdue = isOverdue(inv, today);
  const isCredit = inv.kind === "credit_note";
  const title = inv.number ? `${isCredit ? t("Gutschrift", "Credit note") : t("Rechnung", "Invoice")} ${inv.number}` : t("Rechnungsentwurf", "Draft invoice");
  const open = inv.grossCents - inv.paidCents;

  const saved = sp(q.saved);
  const notices: Record<string, string> = {
    cancelled: t("Rechnung storniert, Gutschrift ausgestellt.", "Invoice cancelled, credit note issued."),
    sent: t(`Versendet an ${sp(q.n) ?? 0} Empfänger.`, `Sent to ${sp(q.n) ?? 0} recipients.`),
    reminder: t(`Zahlungserinnerung an ${sp(q.n) ?? 0} Empfänger versendet.`, `Reminder sent to ${sp(q.n) ?? 0} recipients.`),
    payment_deleted: t("Zahlung gelöscht.", "Payment deleted."),
  };

  if (inv.status === "draft") {
    const [company, invoiceSettings, catalog] = await Promise.all([getSetting("company"), getSetting("invoice"), loadCatalog()]);
    const issuer = partyFromCompany(company);
    const recipient = partyFromProject(full.project, inv.locale);
    const pre = issueProblems({ issuer, issuerAddress: company, recipient, recipientAddress: full.project, lines: full.lines.length ? full.lines : [{ netCents: 1 }], grossCents: Math.max(1, totals(full.lines, inv.reverseCharge).grossCents), reverseCharge: inv.reverseCharge, serviceFrom: inv.serviceFrom ?? today, kind: inv.kind }).filter(
      (p) => p !== "no_lines" && p !== "zero_total" && p !== "service_date",
    );
    return (
      <>
        <PageHeader eyebrow={full.project.name} title={title} actions={<Badge tone="neutral">{t("Entwurf", "Draft")}</Badge>} />
        {sp(q.error) === "issue_problems" && <Alert tone="danger" className="mb-4">{t("Ausstellen nicht möglich: Pflichtangaben fehlen.", "Cannot issue: required details missing.")}</Alert>}
        {pre.length > 0 && (
          <Alert tone="warn" className="mb-4">
            <p className="font-semibold">{t("Vor dem Ausstellen ergänzen:", "Complete before issuing:")}</p>
            <ul className="mt-1 list-disc pl-5">
              {pre.map((p) => (
                <li key={p}>{issueProblemText[p][locale]}</li>
              ))}
            </ul>
          </Alert>
        )}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardBody className="flex items-start justify-between gap-4">
              <Party title={t("Empfänger (aus Projekt)", "Recipient (from project)")} party={recipient} />
              <Link href={`/${locale}/portal/projekte/${full.project.id}`} className="text-xs font-medium underline">
                {t("bearbeiten", "edit")}
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-start justify-between gap-4">
              <Party title={t("Aussteller (Einstellungen)", "Issuer (settings)")} party={issuer} />
              {can(viewer.role, "settings.manage") && (
                <Link href={`/${locale}/portal/einstellungen`} className="text-xs font-medium underline">
                  {t("bearbeiten", "edit")}
                </Link>
              )}
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title={t("Positionen", "Line items")} description={full.booking ? `${t("Buchung", "Booking")} ${full.booking.number}` : undefined} />
          <CardBody>
            <DraftEditor
              locale={locale}
              id={inv.id}
              defaultTaxRateBp={invoiceSettings.defaultTaxRateBp}
              rates={catalog.rates.filter((r) => r.active).map((r) => ({ id: r.id, name: inv.locale === "en" ? r.nameEn : r.nameDe, unit: r.unit, priceCents: r.priceCents, taxRateBp: r.taxRateBp }))}
              initial={{
                invoiceLocale: inv.locale,
                serviceFrom: inv.serviceFrom ?? "",
                serviceTo: inv.serviceTo ?? "",
                reverseCharge: inv.reverseCharge,
                notes: inv.notes ?? "",
                lines: full.lines.map((l) => ({
                  description: l.description,
                  quantity: formatNumber(l.quantityMilli / 1000, locale, l.quantityMilli % 1000 === 0 ? 0 : 3),
                  unit: l.unit,
                  unitPrice: (l.unitPriceCents / 100).toFixed(2).replace(".", locale === "de" ? "," : "."),
                  taxRateBp: l.taxRateBp,
                })),
              }}
            />
          </CardBody>
        </Card>
        <form action={deleteDraftAction} className="mt-6">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={inv.id} />
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="size-4" />
            {t("Entwurf löschen", "Delete draft")}
          </Button>
        </form>
      </>
    );
  }

  const groups = totals(full.lines, inv.reverseCharge).groups;
  return (
    <>
      <PageHeader
        eyebrow={full.project.name}
        title={title}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={overdue ? "danger" : invoiceStatusTone[inv.status]}>{overdue ? t("überfällig", "overdue") : label(isCredit ? creditNoteStatusLabels : invoiceStatusLabels, inv.status, locale)}</Badge>
            <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
              <FileDown className="size-4" />
              PDF
            </a>
          </div>
        }
      />
      {saved && notices[saved] && <Alert tone="ok" className="mb-4">{notices[saved]}</Alert>}
      {sp(q.error) && <Alert tone="danger" className="mb-4">{t("Aktion nicht möglich.", "Action not possible.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardBody className="grid gap-6 md:grid-cols-3">
              <Party title={t("Empfänger", "Recipient")} party={inv.recipient ?? { name: "", lines: [] }} />
              <Party title={t("Aussteller", "Issuer")} party={inv.issuer ?? { name: "", lines: [] }} />
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-muted">{t("Datum", "Date")}</dt>
                  <dd>{formatDate(inv.issueDate, locale)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-muted">{t("Leistung", "Service")}</dt>
                  <dd className="text-right">
                    {formatDate(inv.serviceFrom, locale)}
                    {inv.serviceTo && inv.serviceTo !== inv.serviceFrom && ` – ${formatDate(inv.serviceTo, locale)}`}
                  </dd>
                </div>
                {!isCredit && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-fg-muted">{t("Fällig", "Due")}</dt>
                    <dd className={overdue ? "font-semibold text-danger" : ""}>{formatDate(inv.dueDate, locale)}</dd>
                  </div>
                )}
                {full.booking && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-fg-muted">{t("Buchung", "Booking")}</dt>
                    <dd>
                      <Link href={`/${locale}/portal/buchungen/${full.booking.id}`} className="underline">
                        {full.booking.number}
                      </Link>
                    </dd>
                  </div>
                )}
                {full.ref && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-fg-muted">{t("Zu Rechnung", "Relates to")}</dt>
                    <dd>
                      <Link href={`/${locale}/portal/rechnungen/${full.ref.id}`} className="underline">
                        {full.ref.number}
                      </Link>
                    </dd>
                  </div>
                )}
                {full.credits.map((c) => (
                  <div key={c.id} className="flex justify-between gap-2">
                    <dt className="text-fg-muted">{t("Gutschrift", "Credit note")}</dt>
                    <dd>
                      <Link href={`/${locale}/portal/rechnungen/${c.id}`} className="underline">
                        {c.number}
                      </Link>
                    </dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>{t("Beschreibung", "Description")}</Th>
                  <Th className="text-right">{t("Menge", "Qty")}</Th>
                  <Th className="text-right">{t("Einzelpreis", "Unit price")}</Th>
                  <Th className="text-right">{t("USt.", "VAT")}</Th>
                  <Th className="text-right">{t("Netto", "Net")}</Th>
                </tr>
              </thead>
              <tbody>
                {full.lines.map((l) => (
                  <tr key={l.id}>
                    <Td className="text-xs text-fg-muted">{l.position}</Td>
                    <Td className="text-sm">{l.description}</Td>
                    <Td className="whitespace-nowrap text-right text-sm tabular-nums">
                      {formatNumber(l.quantityMilli / 1000, locale, l.quantityMilli % 1000 === 0 ? 0 : 2)} {label(unitText, l.unit, locale)}
                    </Td>
                    <Td className="whitespace-nowrap text-right text-sm tabular-nums">{formatMoney(l.unitPriceCents, locale)}</Td>
                    <Td className="whitespace-nowrap text-right text-sm tabular-nums">{l.taxRateBp / 100} %</Td>
                    <Td className="whitespace-nowrap text-right text-sm tabular-nums">{formatMoney(l.netCents, locale)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto max-w-sm space-y-1 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">{t("Summe netto", "Total net")}</dt>
                <dd className="tabular-nums">{formatMoney(inv.netCents, locale)}</dd>
              </div>
              {!inv.reverseCharge &&
                groups.map((g) => (
                  <div key={g.taxRateBp} className="flex justify-between">
                    <dt className="text-fg-muted">
                      {t("USt.", "VAT")} {g.taxRateBp / 100} %
                    </dt>
                    <dd className="tabular-nums">{formatMoney(g.taxCents, locale)}</dd>
                  </div>
                ))}
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <dt>{t("Gesamt", "Total")}</dt>
                <dd className="tabular-nums">{formatMoney(inv.grossCents, locale)}</dd>
              </div>
              {inv.reverseCharge && <p className="pt-1 text-xs text-fg-muted">{t("Reverse Charge", "Reverse charge")}</p>}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={isCredit ? t("Verrechnung / Erstattung", "Offset / refund") : t("Zahlungen", "Payments")}
              description={
                inv.status === "cancelled"
                  ? t("Storniert", "Cancelled")
                  : open === 0
                    ? t("Vollständig ausgeglichen", "Fully settled")
                    : isCredit
                      ? t(`Noch zu erstatten: ${formatMoney(-open, locale)}`, `Still to refund: ${formatMoney(-open, locale)}`)
                      : t(`Offen: ${formatMoney(open, locale)}`, `Open: ${formatMoney(open, locale)}`)
              }
            />
            <CardBody className="space-y-4">
              {full.payments.length === 0 ? (
                <p className="text-sm text-fg-muted">{t("Noch keine Zahlungen.", "No payments yet.")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {full.payments.map(({ p, userName }) => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium tabular-nums">{formatMoney(p.amountCents, locale)}</p>
                        <p className="text-xs text-fg-muted">
                          {formatDate(p.receivedOn, locale)} · {label(paymentMethodLabels, p.method, locale)}
                          {p.reference && ` · ${p.reference}`}
                          {staff && userName && ` · ${userName}`}
                        </p>
                      </div>
                      {staff && inv.status !== "cancelled" && p.note !== OFFSET_NOTE && (
                        <form action={deletePaymentAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="payment_id" value={p.id} />
                          <button type="submit" className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-danger" aria-label={t("Zahlung löschen", "Delete payment")}>
                            <Trash2 className="size-4" />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {staff && inv.status !== "cancelled" && open !== 0 && <PaymentForm locale={locale} invoiceId={inv.id} openCents={open} today={today} refund={isCredit} />}
            </CardBody>
          </Card>

          {staff && (
            <Card>
              <CardHeader title={t("Aktionen", "Actions")} description={inv.dunningLevel > 0 ? t(`Mahnstufe ${inv.dunningLevel}, zuletzt ${formatDate(inv.lastDunningAt, locale)}`, `Reminder level ${inv.dunningLevel}, last ${formatDate(inv.lastDunningAt, locale)}`) : undefined} />
              <CardBody className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <form action={sendInvoiceAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={inv.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      {t("Per E-Mail senden", "Send by email")}
                    </Button>
                  </form>
                  {!isCredit && (inv.status === "issued" || inv.status === "partially_paid") && (
                    <form action={sendInvoiceAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={inv.id} />
                      <input type="hidden" name="mode" value="reminder" />
                      <Button type="submit" size="sm" variant={overdue ? "primary" : "secondary"} disabled={inv.dunningLevel >= 3}>
                        {inv.dunningLevel === 0 ? t("Zahlungserinnerung senden", "Send payment reminder") : t(`${inv.dunningLevel}. Mahnung senden`, `Send reminder ${inv.dunningLevel + 1}`)}
                      </Button>
                    </form>
                  )}
                </div>
                {!isCredit && inv.status !== "cancelled" && (
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-danger">{t("Stornieren", "Cancel")}</summary>
                    <form action={cancelInvoiceAction} className="mt-3 space-y-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={inv.id} />
                      <p className="text-xs text-fg-muted">
                        {t(
                          "Erstellt eine Gutschrift über den vollen Betrag mit eigener Nummer. Die Rechnung bleibt unverändert erhalten. Für eine korrigierte Rechnung danach einen neuen Entwurf anlegen.",
                          "Creates a credit note for the full amount with its own number. The invoice itself stays unchanged. For a corrected invoice, create a new draft afterwards.",
                        )}
                      </p>
                      <Input name="reason" placeholder={t("Grund (erscheint auf der Gutschrift)", "Reason (shown on the credit note)")} aria-label={t("Grund", "Reason")} />
                      <Button type="submit" size="sm" variant="danger">
                        {t("Gutschrift ausstellen und stornieren", "Issue credit note and cancel")}
                      </Button>
                    </form>
                  </details>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
