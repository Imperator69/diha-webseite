// Rechnungslogik als reine Funktionen (testbar ohne Datenbank).
import type { PartySnapshot } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { lineNet, lineTax } from "@/lib/pricing";
import type { CompanySettings } from "@/lib/settings";

export const taxRates = [2000, 1300, 1000, 0] as const;
export const invoiceUnits = ["hour", "half_day", "day", "month", "flat", "person_day", "piece"] as const;

/** Rechnungen über diesem Bruttobetrag brauchen die UID des unternehmerischen Empfängers (§ 11 Abs. 1 Z 3 UStG). */
export const RECIPIENT_VAT_THRESHOLD_CENTS = 1_000_000;

export type InvoiceLine = { description: string; quantityMilli: number; unit: string; unitPriceCents: number; taxRateBp: number; netCents: number; taxCents: number };

/** Dezimalzahl aus Formulareingabe: "1.234,50", "1234,5", "1234.5". */
export function parseDecimal(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let v = value.replace(/[\s\u00a0\u20ac]/g, "");
  if (!v) return null;
  const lastComma = v.lastIndexOf(",");
  const lastDot = v.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) v = lastComma > lastDot ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  else if (lastComma >= 0) v = v.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function buildLine(input: { description: string; quantity: number; unit: string; unitPriceCents: number; taxRateBp: number }): InvoiceLine {
  const quantityMilli = Math.round(input.quantity * 1000);
  const netCents = lineNet(quantityMilli, input.unitPriceCents);
  return { description: input.description, quantityMilli, unit: input.unit, unitPriceCents: input.unitPriceCents, taxRateBp: input.taxRateBp, netCents, taxCents: lineTax(netCents, input.taxRateBp) };
}

/** Status nach Zahlungseingang. Bei Gutschriften (negativ) zählt der Betrag ebenso. */
export function settlementStatus(grossCents: number, paidCents: number): "issued" | "partially_paid" | "paid" {
  const gross = Math.abs(grossCents);
  const paid = Math.abs(paidCents);
  if (gross === 0 || paid >= gross) return "paid";
  return paid > 0 ? "partially_paid" : "issued";
}

export function formatInvoiceNumber(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export function isOverdue(inv: { status: string; dueDate: string | null; kind: string }, today: string): boolean {
  return inv.kind === "invoice" && (inv.status === "issued" || inv.status === "partially_paid") && Boolean(inv.dueDate && inv.dueDate < today);
}

export function countryName(code: string, locale: Locale): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames([locale === "en" ? "en-GB" : "de-AT"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function partyFromProject(
  project: { organization: string; contactName: string | null; contactEmail: string | null; street: string | null; postalCode: string | null; city: string | null; country: string; vatId: string | null; companyRegister: string | null },
  locale: Locale,
): PartySnapshot {
  const lines = [
    project.contactName ? `${locale === "en" ? "Attn." : "z. H."} ${project.contactName}` : "",
    project.street ?? "",
    [project.postalCode, project.city].filter(Boolean).join(" "),
    project.country && project.country !== "AT" ? countryName(project.country, locale) : "",
  ].filter((l) => l.trim().length > 0);
  return { name: project.organization, lines, vatId: project.vatId || null, companyRegister: project.companyRegister || null, email: project.contactEmail || null };
}

export function partyFromCompany(c: CompanySettings): PartySnapshot {
  return {
    name: c.name,
    lines: [c.street, [c.postalCode, c.city].filter(Boolean).join(" "), c.country].filter((l) => l.trim().length > 0),
    vatId: c.vatId || null,
    companyRegister: [c.companyRegister, c.court].filter(Boolean).join(", ") || null,
    email: c.email || null,
    phone: c.phone || null,
    iban: c.iban || null,
    bic: c.bic || null,
    bank: c.bank || null,
  };
}

export type IssueProblem = "issuer_address" | "issuer_vat" | "issuer_bank" | "recipient_address" | "recipient_vat" | "no_lines" | "service_date" | "zero_total";

type Address = { street: string | null; postalCode: string | null; city: string | null };

/** Vollständige Anschrift: Straße, PLZ und Ort (Platzhalter „tba“ zählt nicht). */
export function addressComplete(a: Address): boolean {
  return [a.street, a.postalCode, a.city].every((v) => Boolean(v && v.trim() && !/^tba$/i.test(v.trim())));
}

/** Pflichtangaben nach § 11 Abs. 1 UStG prüfen, bevor eine Nummer vergeben wird. */
export function issueProblems(input: {
  issuer: PartySnapshot;
  issuerAddress: Address;
  recipient: PartySnapshot | null;
  recipientAddress: Address;
  lines: { netCents: number }[];
  grossCents: number;
  reverseCharge: boolean;
  serviceFrom: string | null;
  kind: "invoice" | "credit_note";
}): IssueProblem[] {
  const p: IssueProblem[] = [];
  if (!input.issuer.name || !addressComplete(input.issuerAddress)) p.push("issuer_address");
  if (!input.issuer.vatId) p.push("issuer_vat");
  if (input.kind === "invoice" && !input.issuer.iban) p.push("issuer_bank");
  if (!input.recipient?.name || !addressComplete(input.recipientAddress)) p.push("recipient_address");
  if ((input.reverseCharge || Math.abs(input.grossCents) > RECIPIENT_VAT_THRESHOLD_CENTS) && !input.recipient?.vatId) p.push("recipient_vat");
  if (input.lines.length === 0) p.push("no_lines");
  if (!input.serviceFrom) p.push("service_date");
  if (input.kind === "invoice" && input.grossCents <= 0) p.push("zero_total");
  return p;
}

export const issueProblemText: Record<IssueProblem, { de: string; en: string }> = {
  issuer_address: { de: "Firmenwortlaut und Anschrift des Ausstellers fehlen (Einstellungen).", en: "Issuer name and address missing (settings)." },
  issuer_vat: { de: "UID-Nummer des Ausstellers fehlt (Einstellungen).", en: "Issuer VAT ID missing (settings)." },
  issuer_bank: { de: "Bankverbindung (IBAN) fehlt (Einstellungen).", en: "Bank details (IBAN) missing (settings)." },
  recipient_address: { de: "Name und vollständige Anschrift des Empfängers fehlen (Projekt).", en: "Recipient name and full address missing (project)." },
  recipient_vat: { de: "UID des Empfängers erforderlich (Reverse Charge oder über 10.000 € brutto).", en: "Recipient VAT ID required (reverse charge or over EUR 10,000 gross)." },
  no_lines: { de: "Keine Positionen.", en: "No line items." },
  service_date: { de: "Leistungsdatum bzw. -zeitraum fehlt.", en: "Date or period of service missing." },
  zero_total: { de: "Der Rechnungsbetrag muss größer als 0 sein.", en: "The invoice total must be greater than 0." },
};
