import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { loadBooking, loadCatalog, projectMemberEmails } from "@/lib/bookings/data";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { newId } from "@/lib/ids";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { sendMail } from "@/lib/mail/send";
import { estimateLines, totals } from "@/lib/pricing";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { zonedDate } from "@/lib/time";
import { buildLine, partyFromCompany, partyFromProject } from "./compute";
import { renderInvoicePdf, type PdfInvoice } from "./pdf";

/** Kennzeichen der automatischen Verrechnung beim Storno (nicht löschbar). */
export const OFFSET_NOTE = "system:offset";

export type InvoiceFull = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;

export async function loadInvoice(id: string) {
  const invoice = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1))[0];
  if (!invoice) return null;
  const [lines, payments, project, booking, ref, credits] = await Promise.all([
    db().select().from(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, id)).orderBy(asc(schema.invoiceLines.position)),
    db()
      .select({ p: schema.payments, userName: schema.users.name })
      .from(schema.payments)
      .leftJoin(schema.users, eq(schema.payments.createdBy, schema.users.id))
      .where(eq(schema.payments.invoiceId, id))
      .orderBy(asc(schema.payments.receivedOn)),
    db().select().from(schema.projects).where(eq(schema.projects.id, invoice.projectId)).limit(1),
    invoice.bookingId ? db().select({ id: schema.bookings.id, number: schema.bookings.number, status: schema.bookings.status }).from(schema.bookings).where(eq(schema.bookings.id, invoice.bookingId)).limit(1) : [],
    invoice.refInvoiceId ? db().select({ id: schema.invoices.id, number: schema.invoices.number }).from(schema.invoices).where(eq(schema.invoices.id, invoice.refInvoiceId)).limit(1) : [],
    db().select({ id: schema.invoices.id, number: schema.invoices.number, status: schema.invoices.status }).from(schema.invoices).where(eq(schema.invoices.refInvoiceId, id)),
  ]);
  return { invoice, lines, payments, project: project[0], booking: booking[0] ?? null, ref: ref[0] ?? null, credits };
}

/** Summen eines Entwurfs aus seinen Positionen neu berechnen. */
export async function recomputeDraft(id: string) {
  const inv = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1))[0];
  if (!inv || inv.status !== "draft") return;
  const lines = await db().select().from(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, id));
  const sum = totals(lines, inv.reverseCharge);
  await db().update(schema.invoices).set({ netCents: sum.netCents, taxCents: sum.taxCents, grossCents: sum.grossCents, updatedAt: Date.now() }).where(eq(schema.invoices.id, id));
}

/** Neuer Entwurf für ein Projekt, optional mit Positionen aus einer Buchung (Tarife). */
export async function createDraft(opts: { projectId: string; bookingId: string | null; userId: string }): Promise<string> {
  const project = (await db().select().from(schema.projects).where(eq(schema.projects.id, opts.projectId)).limit(1))[0];
  if (!project) throw new Error("project");
  const locale = project.invoiceLocale;
  const invoiceSettings = await getSetting("invoice");
  const id = newId();
  let serviceFrom: string | null = null;
  let serviceTo: string | null = null;
  let lines: ReturnType<typeof buildLine>[] = [];
  let bookingId: string | null = null;
  if (opts.bookingId) {
    const full = await loadBooking(opts.bookingId);
    if (full && full.booking.projectId === project.id) {
      bookingId = full.booking.id;
      const catalog = await loadCatalog();
      const zoneCodes = Object.fromEntries(catalog.zones.map((z) => [z.id, z.code]));
      const est = estimateLines({ rates: catalog.rates, periods: full.periods, zoneIds: full.zoneIds, zoneCodes, activityCodes: full.activityCodes, participants: full.booking.participantsCount, locale });
      lines = est.map((l) => buildLine({ description: `${l.description} · ${full.booking.number}`, quantity: l.quantityMilli / 1000, unit: l.unit, unitPriceCents: l.unitPriceCents, taxRateBp: l.taxRateBp }));
      if (full.periods.length) {
        serviceFrom = zonedDate(full.periods[0].startsAt);
        serviceTo = zonedDate(Math.max(...full.periods.map((p) => p.endsAt)) - 1);
      }
    }
  }
  if (lines.length === 0) lines = [buildLine({ description: "", quantity: 1, unit: "flat", unitPriceCents: 0, taxRateBp: invoiceSettings.defaultTaxRateBp })];
  const sum = totals(lines);
  await db()
    .insert(schema.invoices)
    .values({
      id,
      projectId: project.id,
      bookingId,
      locale,
      serviceFrom,
      serviceTo,
      recipient: partyFromProject(project, locale),
      netCents: sum.netCents,
      taxCents: sum.taxCents,
      grossCents: sum.grossCents,
      createdBy: opts.userId,
    });
  if (lines.length) await db().insert(schema.invoiceLines).values(lines.map((l, i) => ({ id: newId(), invoiceId: id, position: i + 1, ...l })));
  return id;
}

export async function pdfInput(full: InvoiceFull, draft: boolean): Promise<PdfInvoice> {
  const inv = full.invoice;
  const company = await getSetting("company");
  const invoiceSettings = await getSetting("invoice");
  const sum = totals(full.lines, inv.reverseCharge);
  return {
    kind: inv.kind,
    number: inv.number,
    locale: inv.locale,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    serviceFrom: inv.serviceFrom,
    serviceTo: inv.serviceTo,
    issuer: inv.issuer ?? partyFromCompany(company),
    recipient: inv.status === "draft" ? partyFromProject(full.project, inv.locale) : (inv.recipient ?? partyFromProject(full.project, inv.locale)),
    reverseCharge: inv.reverseCharge,
    netCents: inv.status === "draft" ? sum.netCents : inv.netCents,
    taxCents: inv.status === "draft" ? sum.taxCents : inv.taxCents,
    grossCents: inv.status === "draft" ? sum.grossCents : inv.grossCents,
    groups: sum.groups,
    lines: full.lines,
    notes: inv.notes,
    footer: inv.locale === "en" ? invoiceSettings.footerEn : invoiceSettings.footerDe,
    bookingNumber: full.booking?.number ?? null,
    refNumber: full.ref?.number ?? null,
    draft,
  };
}

/** PDF einer ausgestellten Rechnung: einmal erzeugen und unverändert in R2 ablegen. */
export async function storedPdf(full: InvoiceFull): Promise<Uint8Array> {
  const inv = full.invoice;
  if (inv.pdfKey) {
    const obj = await appEnv().FILES.get(inv.pdfKey);
    if (obj) return new Uint8Array(await obj.arrayBuffer());
  }
  const bytes = await renderInvoicePdf(await pdfInput(full, false));
  if (!inv.pdfKey && inv.number) {
    const key = `invoices/${inv.issueDate?.slice(0, 4) ?? "x"}/${inv.number}.pdf`;
    await appEnv().FILES.put(key, bytes, { httpMetadata: { contentType: "application/pdf" } });
    await db().update(schema.invoices).set({ pdfKey: key }).where(eq(schema.invoices.id, inv.id));
  }
  return bytes;
}

export function pdfFileName(inv: { number: string | null; kind: string; locale: Locale }): string {
  const base = inv.kind === "credit_note" ? (inv.locale === "en" ? "Credit-note" : "Gutschrift") : inv.locale === "en" ? "Invoice" : "Rechnung";
  return `${base}-${inv.number ?? "Entwurf"}.pdf`;
}

/** Rechnung bzw. Zahlungserinnerung an Rechnungsempfänger und Projektmitglieder senden (PDF im Anhang). */
export async function mailInvoice(full: InvoiceFull, mode: "invoice" | "reminder"): Promise<number> {
  const inv = full.invoice;
  const pdf = await storedPdf(full);
  const members = await projectMemberEmails(inv.projectId);
  const recipients = new Map<string, { name: string; locale: Locale }>();
  if (inv.recipient?.email) recipients.set(inv.recipient.email.toLowerCase(), { name: inv.recipient.name, locale: inv.locale });
  for (const m of members) if (!recipients.has(m.email.toLowerCase())) recipients.set(m.email.toLowerCase(), { name: m.name, locale: m.locale });
  const open = inv.grossCents - inv.paidCents;
  let sent = 0;
  for (const [email, r] of recipients) {
    const l = r.locale;
    const link = `${siteUrl()}/${l}/portal/rechnungen/${inv.id}`;
    const due = inv.dueDate ? formatDate(inv.dueDate, l) : "–";
    const level = inv.dunningLevel;
    const subject =
      mode === "invoice"
        ? l === "en"
          ? `${inv.kind === "credit_note" ? "Credit note" : "Invoice"} ${inv.number}`
          : `${inv.kind === "credit_note" ? "Gutschrift" : "Rechnung"} ${inv.number}`
        : l === "en"
          ? `${level <= 1 ? "Payment reminder" : `Reminder ${level - 1}`}: invoice ${inv.number}`
          : `${level <= 1 ? "Zahlungserinnerung" : `${level - 1}. Mahnung`}: Rechnung ${inv.number}`;
    const text =
      mode === "invoice"
        ? l === "en"
          ? `Hello ${r.name},\n\nplease find attached ${inv.kind === "credit_note" ? "credit note" : "invoice"} ${inv.number} for ${formatMoney(inv.grossCents, l)}${inv.kind === "invoice" ? `, due on ${due}` : ""}.\n\nIt is also available in the portal:\n${link}`
          : `Hallo ${r.name},\n\nim Anhang finden Sie ${inv.kind === "credit_note" ? "die Gutschrift" : "die Rechnung"} ${inv.number} über ${formatMoney(inv.grossCents, l)}${inv.kind === "invoice" ? `, fällig am ${due}` : ""}.\n\nSie ist auch im Portal abrufbar:\n${link}`
        : l === "en"
          ? `Hello ${r.name},\n\naccording to our records, invoice ${inv.number} (due on ${due}) still has an open balance of ${formatMoney(open, l)}. Please transfer the amount quoting the invoice number. If you have already paid, please disregard this message.\n\n${link}`
          : `Hallo ${r.name},\n\nlaut unserer Buchhaltung ist die Rechnung ${inv.number} (fällig am ${due}) noch mit ${formatMoney(open, l)} offen. Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer. Falls Sie bereits bezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\n${link}`;
    await sendMail({ to: email, subject, text, attachments: [{ filename: pdfFileName(inv), content: pdf }] });
    sent++;
  }
  return sent;
}

/** Abgeschlossene Buchungen ohne (nicht stornierte) Rechnung. */
export async function bookingsToInvoice() {
  const rows = await db()
    .select({ b: schema.bookings, projectName: schema.projects.name })
    .from(schema.bookings)
    .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
    .where(inArray(schema.bookings.status, ["completed"]))
    .orderBy(asc(schema.bookings.lastEnd));
  if (!rows.length) return [];
  const invoiced = new Set(
    (
      await db()
        .select({ bookingId: schema.invoices.bookingId })
        .from(schema.invoices)
        .where(and(inArray(schema.invoices.bookingId, rows.map((r) => r.b.id).slice(0, 90)), ne(schema.invoices.status, "cancelled"), eq(schema.invoices.kind, "invoice")))
    ).map((r) => r.bookingId),
  );
  return rows.filter((r) => !invoiced.has(r.b.id));
}
