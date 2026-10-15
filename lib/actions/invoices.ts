"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { assertViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { newId } from "@/lib/ids";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { paymentMethodLabels, rateUnitLabels } from "@/lib/i18n/labels";
import { buildLine, invoiceUnits, issueProblems, parseDecimal, partyFromCompany, partyFromProject, settlementStatus, taxRates, type IssueProblem } from "@/lib/invoices/compute";
import { createDraft, loadInvoice, mailInvoice, OFFSET_NOTE, recomputeDraft, storedPdf } from "@/lib/invoices/data";
import { totals } from "@/lib/pricing";
import { getSetting } from "@/lib/settings";
import { addDays, isValidDate, zonedDate } from "@/lib/time";
import type { FormState } from "./auth";
import { bool, localeOf, optStr, str } from "./util";

const base = (locale: Locale) => `/${locale}/portal/rechnungen`;

async function bookingStatusEvent(bookingId: string, userId: string, from: string, to: "invoiced" | "completed", message: string) {
  await db().update(schema.bookings).set({ status: to, updatedAt: Date.now() }).where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.status, from as "completed")));
  await db().insert(schema.bookingEvents).values({ id: newId(), bookingId, userId, type: "status", fromStatus: from, toStatus: to, message, visibleToProject: true });
}

export async function createInvoiceAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const locale = localeOf(fd);
  const projectId = str(fd, "project_id");
  if (!projectId) redirect(`${base(locale)}/neu?error=project`);
  const id = await createDraft({ projectId, bookingId: optStr(fd, "booking_id"), userId: viewer.id });
  await audit(viewer.id, "invoice.draft_create", "invoice", id, { projectId, bookingId: optStr(fd, "booking_id") });
  redirect(`${base(locale)}/${id}`);
}

export type DraftPayload = {
  locale: Locale;
  id: string;
  invoiceLocale: Locale;
  serviceFrom: string;
  serviceTo: string;
  reverseCharge: boolean;
  notes: string;
  lines: { description: string; quantity: string; unit: string; unitPrice: string; taxRateBp: number }[];
};

export type DraftResult = { ok: boolean; error?: string; line?: number; problems?: IssueProblem[] };

export async function saveDraftAction(p: DraftPayload): Promise<DraftResult> {
  const viewer = await assertViewer("invoices.manage");
  const inv = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, p.id)).limit(1))[0];
  if (!inv) return { ok: false, error: "not_found" };
  if (inv.status !== "draft") return { ok: false, error: "frozen" };
  if (!isLocale(p.invoiceLocale) || (p.serviceFrom && !isValidDate(p.serviceFrom)) || (p.serviceTo && !isValidDate(p.serviceTo)) || (p.serviceFrom && p.serviceTo && p.serviceTo < p.serviceFrom))
    return { ok: false, error: "invalid" };
  if (!Array.isArray(p.lines) || p.lines.length > 100) return { ok: false, error: "invalid" };
  const lines = [];
  for (const [i, l] of p.lines.entries()) {
    const quantity = parseDecimal(l.quantity);
    const price = parseDecimal(l.unitPrice);
    const description = String(l.description ?? "").trim().slice(0, 500);
    if (!description || quantity === null || quantity <= 0 || quantity > 100_000 || price === null || Math.abs(price) > 10_000_000 || !(invoiceUnits as readonly string[]).includes(l.unit) || !(taxRates as readonly number[]).includes(l.taxRateBp))
      return { ok: false, error: "line", line: i + 1 };
    lines.push(buildLine({ description, quantity, unit: l.unit, unitPriceCents: Math.round(price * 100), taxRateBp: p.reverseCharge ? 0 : l.taxRateBp }));
  }
  const project = (await db().select().from(schema.projects).where(eq(schema.projects.id, inv.projectId)).limit(1))[0];
  const sum = totals(lines, p.reverseCharge);
  await db().delete(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, inv.id));
  if (lines.length) await db().insert(schema.invoiceLines).values(lines.map((l, i) => ({ id: newId(), invoiceId: inv.id, position: i + 1, ...l })));
  await db()
    .update(schema.invoices)
    .set({
      locale: p.invoiceLocale,
      serviceFrom: p.serviceFrom || null,
      serviceTo: p.serviceTo || p.serviceFrom || null,
      reverseCharge: p.reverseCharge,
      notes: p.notes.trim().slice(0, 2000) || null,
      recipient: partyFromProject(project, p.invoiceLocale),
      netCents: sum.netCents,
      taxCents: sum.taxCents,
      grossCents: sum.grossCents,
      updatedAt: Date.now(),
    })
    .where(eq(schema.invoices.id, inv.id));
  await audit(viewer.id, "invoice.draft_save", "invoice", inv.id, { lines: lines.length, grossCents: sum.grossCents });
  revalidatePath(`${base(p.locale)}/${inv.id}`);
  return { ok: true };
}

/** Ausstellen: Pflichtangaben prüfen, Nummer lückenlos und atomar vergeben, PDF ablegen. */
export async function issueInvoiceAction(input: { locale: Locale; id: string; sendMail: boolean }): Promise<DraftResult> {
  const viewer = await assertViewer("invoices.manage");
  const full = await loadInvoice(input.id);
  if (!full) return { ok: false, error: "not_found" };
  const inv = full.invoice;
  if (inv.status !== "draft") return { ok: false, error: "frozen" };
  const [company, invoiceSettings] = await Promise.all([getSetting("company"), getSetting("invoice")]);
  const issuer = partyFromCompany(company);
  const recipient = partyFromProject(full.project, inv.locale);
  const sum = totals(full.lines, inv.reverseCharge);
  const problems = issueProblems({ issuer, issuerAddress: company, recipient, recipientAddress: full.project, lines: full.lines, grossCents: sum.grossCents, reverseCharge: inv.reverseCharge, serviceFrom: inv.serviceFrom, kind: inv.kind });
  if (problems.length) return { ok: false, error: "problems", problems };

  const today = zonedDate(Date.now());
  const year = Number(today.slice(0, 4));
  const dueDate = inv.kind === "invoice" ? addDays(today, invoiceSettings.paymentDays) : null;
  const terms = inv.kind === "invoice" ? `${invoiceSettings.paymentDays}` : null;
  const DB = appEnv().DB;
  const now = Date.now();
  // Zähler nur erhöhen, wenn der Entwurf noch existiert; beides in einer Transaktion (D1-Batch).
  // Das Jahr für die Nummer als Text binden: D1 bindet JS-Zahlen als REAL ("2026.0").
  await DB.batch([
    DB.prepare(
      "INSERT INTO invoice_counters (year, last_number) SELECT ?1, 1 WHERE EXISTS (SELECT 1 FROM invoices WHERE id = ?2 AND status = 'draft') ON CONFLICT(year) DO UPDATE SET last_number = last_number + 1",
    ).bind(year, inv.id),
    DB.prepare(
      `UPDATE invoices SET number = ?3 || '-' || ?15 || '-' || printf('%04d', (SELECT last_number FROM invoice_counters WHERE year = ?1)),
        status = ?4, issuer = ?5, recipient = ?6, net_cents = ?7, tax_cents = ?8, gross_cents = ?9, issue_date = ?10, due_date = ?11,
        payment_terms = ?12, issued_by = ?13, issued_at = ?14, updated_at = ?14
       WHERE id = ?2 AND status = 'draft'`,
    ).bind(year, inv.id, invoiceSettings.prefix, settlementStatus(sum.grossCents, inv.paidCents), JSON.stringify(issuer), JSON.stringify(recipient), sum.netCents, sum.taxCents, sum.grossCents, today, dueDate, terms, viewer.id, now, String(year)),
  ]);
  const issued = await loadInvoice(inv.id);
  if (!issued || issued.invoice.status === "draft" || !issued.invoice.number) return { ok: false, error: "conflict" };
  await storedPdf(issued);
  await audit(viewer.id, "invoice.issue", "invoice", inv.id, { number: issued.invoice.number, grossCents: sum.grossCents });
  if (issued.booking && issued.booking.status === "completed" && inv.kind === "invoice")
    await bookingStatusEvent(issued.booking.id, viewer.id, "completed", "invoiced", `${inv.locale === "en" ? "Invoice" : "Rechnung"} ${issued.invoice.number}`);
  if (input.sendMail) {
    const final = await loadInvoice(inv.id);
    if (final) await mailInvoice(final, "invoice");
  }
  revalidatePath(base(input.locale));
  return { ok: true };
}

export async function deleteDraftAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const id = str(fd, "id");
  await db().delete(schema.invoices).where(and(eq(schema.invoices.id, id), eq(schema.invoices.status, "draft")));
  await audit(viewer.id, "invoice.draft_delete", "invoice", id);
  redirect(`${base(localeOf(fd))}?saved=deleted`);
}

async function refreshPaidStatus(invoiceId: string) {
  const inv = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).limit(1))[0];
  if (!inv || inv.status === "draft" || inv.status === "cancelled") return;
  const paid = (await db().select({ v: sql<number>`coalesce(sum(${schema.payments.amountCents}), 0)` }).from(schema.payments).where(eq(schema.payments.invoiceId, invoiceId)))[0]?.v ?? 0;
  await db()
    .update(schema.invoices)
    .set({ paidCents: paid, status: settlementStatus(inv.grossCents, paid), updatedAt: Date.now() })
    .where(eq(schema.invoices.id, invoiceId));
}

export async function addPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("invoices.manage");
  const id = str(fd, "invoice_id");
  const inv = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1))[0];
  if (!inv || inv.status === "draft" || inv.status === "cancelled") return { error: "invalid" };
  const amount = parseDecimal(str(fd, "amount"));
  const receivedOn = str(fd, "received_on");
  const method = str(fd, "method");
  if (amount === null || amount <= 0 || !isValidDate(receivedOn) || !(method in paymentMethodLabels)) return { error: "invalid" };
  // Gutschriften: Erstattung an den Kunden wird negativ verbucht
  const cents = Math.round(amount * 100) * (inv.kind === "credit_note" ? -1 : 1);
  const open = inv.grossCents - inv.paidCents;
  if (Math.abs(cents) > Math.abs(open)) return { error: "overpaid" };
  await db().insert(schema.payments).values({ id: newId(), invoiceId: id, receivedOn, amountCents: cents, method: method as "transfer", reference: optStr(fd, "reference"), note: optStr(fd, "note"), createdBy: viewer.id });
  await refreshPaidStatus(id);
  await audit(viewer.id, "invoice.payment_add", "invoice", id, { amountCents: cents, receivedOn });
  revalidatePath(`${base(localeOf(fd))}/${id}`);
  return { ok: true };
}

export async function deletePaymentAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const paymentId = str(fd, "payment_id");
  const payment = (await db().select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1))[0];
  const locale = localeOf(fd);
  if (!payment) redirect(base(locale));
  const inv = (await db().select().from(schema.invoices).where(eq(schema.invoices.id, payment.invoiceId)).limit(1))[0];
  if (inv?.status !== "cancelled" && payment.note !== OFFSET_NOTE) {
    await db().delete(schema.payments).where(eq(schema.payments.id, paymentId));
    await refreshPaidStatus(payment.invoiceId);
    await audit(viewer.id, "invoice.payment_delete", "invoice", payment.invoiceId, { amountCents: payment.amountCents, receivedOn: payment.receivedOn });
  }
  redirect(`${base(locale)}/${payment.invoiceId}?saved=payment_deleted`);
}

/** Storno: Gutschrift mit negativen Positionen ausstellen, Original auf „storniert“ setzen. */
export async function cancelInvoiceAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const locale = localeOf(fd);
  const full = await loadInvoice(str(fd, "id"));
  if (!full || full.invoice.kind !== "invoice" || !["issued", "partially_paid", "paid"].includes(full.invoice.status)) redirect(base(locale));
  const orig = full.invoice;
  const reason = str(fd, "reason").slice(0, 500);
  const creditId = newId();
  const L = orig.locale;
  await db()
    .insert(schema.invoices)
    .values({
      id: creditId,
      kind: "credit_note",
      refInvoiceId: orig.id,
      projectId: orig.projectId,
      bookingId: orig.bookingId,
      locale: L,
      serviceFrom: orig.serviceFrom,
      serviceTo: orig.serviceTo,
      reverseCharge: orig.reverseCharge,
      notes: `${L === "en" ? `Cancellation of invoice ${orig.number}` : `Storno der Rechnung ${orig.number}`}${reason ? `: ${reason}` : "."}`,
      recipient: orig.recipient,
      createdBy: viewer.id,
    });
  await db()
    .insert(schema.invoiceLines)
    .values(full.lines.map((l, i) => ({ id: newId(), invoiceId: creditId, position: i + 1, description: l.description, quantityMilli: -l.quantityMilli, unit: l.unit, unitPriceCents: l.unitPriceCents, taxRateBp: l.taxRateBp, netCents: -l.netCents, taxCents: -l.taxCents })));
  await recomputeDraft(creditId);
  const res = await issueInvoiceAction({ locale, id: creditId, sendMail: false });
  if (!res.ok) {
    await db().delete(schema.invoices).where(and(eq(schema.invoices.id, creditId), eq(schema.invoices.status, "draft")));
    redirect(`${base(locale)}/${orig.id}?error=${res.error === "problems" ? "issue_problems" : "cancel"}`);
  }
  // offener Teil der Originalrechnung wird verrechnet; bereits Bezahltes bleibt als Erstattung offen
  const offset = orig.grossCents - orig.paidCents;
  if (offset > 0) {
    await db()
      .insert(schema.payments)
      .values({ id: newId(), invoiceId: creditId, receivedOn: zonedDate(Date.now()), amountCents: -offset, method: "other", reference: L === "en" ? `Offset against ${orig.number}` : `Verrechnung mit ${orig.number}`, note: OFFSET_NOTE, createdBy: viewer.id });
  }
  await refreshPaidStatus(creditId);
  await db().update(schema.invoices).set({ status: "cancelled", updatedAt: Date.now() }).where(eq(schema.invoices.id, orig.id));
  if (full.booking?.status === "invoiced") await bookingStatusEvent(full.booking.id, viewer.id, "invoiced", "completed", `${L === "en" ? "Invoice cancelled" : "Rechnung storniert"}: ${orig.number}`);
  await audit(viewer.id, "invoice.cancel", "invoice", orig.id, { creditNoteId: creditId, reason });
  redirect(`${base(locale)}/${creditId}?saved=cancelled`);
}

export async function sendInvoiceAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const locale = localeOf(fd);
  const full = await loadInvoice(str(fd, "id"));
  if (!full || full.invoice.status === "draft") redirect(base(locale));
  const reminder = str(fd, "mode") === "reminder";
  if (reminder) {
    if (!["issued", "partially_paid"].includes(full.invoice.status) || full.invoice.kind !== "invoice") redirect(`${base(locale)}/${full.invoice.id}`);
    await db()
      .update(schema.invoices)
      .set({ dunningLevel: Math.min(3, full.invoice.dunningLevel + 1), lastDunningAt: zonedDate(Date.now()), updatedAt: Date.now() })
      .where(eq(schema.invoices.id, full.invoice.id));
  }
  const fresh = (await loadInvoice(full.invoice.id))!;
  const sent = await mailInvoice(fresh, reminder ? "reminder" : "invoice");
  await audit(viewer.id, reminder ? "invoice.reminder" : "invoice.send", "invoice", full.invoice.id, { recipients: sent, level: fresh.invoice.dunningLevel });
  redirect(`${base(locale)}/${full.invoice.id}?saved=${reminder ? "reminder" : "sent"}&n=${sent}`);
}

export async function saveRateAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("invoices.manage");
  const code = str(fd, "code").toLowerCase();
  const unit = str(fd, "unit");
  const basis = str(fd, "basis");
  const price = parseDecimal(str(fd, "price"));
  const taxRateBp = Number(str(fd, "tax_rate_bp"));
  if (!/^[a-z0-9_-]{2,40}$/.test(code) || str(fd, "name_de").length < 2 || str(fd, "name_en").length < 2 || !(unit in rateUnitLabels) || !["booking", "zone", "person"].includes(basis) || price === null || price < 0 || !(taxRates as readonly number[]).includes(taxRateBp))
    return { error: "invalid" };
  const values = {
    code,
    nameDe: str(fd, "name_de").slice(0, 200),
    nameEn: str(fd, "name_en").slice(0, 200),
    unit: unit as "day",
    basis: basis as "booking",
    priceCents: Math.round(price * 100),
    taxRateBp,
    zoneId: optStr(fd, "zone_id"),
    activityCode: optStr(fd, "activity_code"),
    active: bool(fd, "active"),
    sortOrder: Number(str(fd, "sort_order")) || 0,
  };
  const id = str(fd, "id");
  if (id) await db().update(schema.rates).set(values).where(eq(schema.rates.id, id));
  else await db().insert(schema.rates).values({ id: newId(), ...values });
  await audit(viewer.id, id ? "rate.update" : "rate.create", "rate", id || null, { code, priceCents: values.priceCents });
  revalidatePath(`${base(localeOf(fd))}/tarife`);
  return { ok: true };
}

export async function deleteRateAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("invoices.manage");
  const id = str(fd, "id");
  await db().delete(schema.rates).where(eq(schema.rates.id, id));
  await audit(viewer.id, "rate.delete", "rate", id);
  redirect(`${base(localeOf(fd))}/tarife?saved=deleted`);
}
