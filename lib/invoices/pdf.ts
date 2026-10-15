// Rechnungs-PDF mit pdf-lib (läuft im Worker und in Node). Standardschrift Helvetica (WinAnsi).
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { PartySnapshot } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n/format";
import { label, rateUnitLabels } from "@/lib/i18n/labels";

export type PdfInvoice = {
  kind: "invoice" | "credit_note";
  number: string | null;
  locale: Locale;
  issueDate: string | null;
  dueDate: string | null;
  serviceFrom: string | null;
  serviceTo: string | null;
  issuer: PartySnapshot;
  recipient: PartySnapshot;
  reverseCharge: boolean;
  netCents: number;
  taxCents: number;
  grossCents: number;
  groups: { taxRateBp: number; netCents: number; taxCents: number }[];
  lines: { description: string; quantityMilli: number; unit: string; unitPriceCents: number; taxRateBp: number; netCents: number }[];
  notes: string | null;
  footer: string;
  bookingNumber: string | null;
  refNumber: string | null;
  draft: boolean;
};

const A4: [number, number] = [595.28, 841.89];
const M = 56;
const RIGHT = A4[0] - M;
const INK = rgb(0.07, 0.09, 0.11);
const GREY = rgb(0.35, 0.35, 0.35);
const RED = rgb(0.784, 0.063, 0.18);
const LINE = rgb(0.85, 0.85, 0.85);

const unitLabels: Record<string, { de: string; en: string }> = { ...rateUnitLabels, piece: { de: "Stück", en: "piece" } };

/** Zeichen, die Helvetica (WinAnsi) nicht kennt, durch die Grundform oder "?" ersetzen. */
function sanitizer(font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  return (text: string) =>
    Array.from(text.replace(/[\u202f\u2009\u2007]/g, " "))
      .map((ch) => {
        const cp = ch.codePointAt(0)!;
        if (supported.has(cp) || ch === "\n") return ch;
        const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
        return base && Array.from(base).every((c) => supported.has(c.codePointAt(0)!)) ? base : "?";
      })
      .join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) out.push(line);
        // überlange Wörter hart umbrechen
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
          let cut = w.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

export async function renderInvoicePdf(inv: PdfInvoice): Promise<Uint8Array> {
  const l = inv.locale;
  const t = (de: string, en: string) => (l === "en" ? en : de);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const clean = sanitizer(regular);
  const money = (c: number) => clean(formatMoney(c, l));
  const title = inv.kind === "credit_note" ? t("Gutschrift / Rechnungskorrektur", "Credit note") : t("Rechnung", "Invoice");
  doc.setTitle(clean(`${title} ${inv.number ?? ""}`.trim()));
  doc.setAuthor(clean(inv.issuer.name));
  doc.setCreator("DIHA Portal");
  doc.setProducer("DIHA Portal");
  doc.setLanguage(l === "en" ? "en-GB" : "de-AT");

  const pages: PDFPage[] = [];
  const text = (page: PDFPage, s: string, x: number, y: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right" } = {}) => {
    const size = opts.size ?? 9;
    const font = opts.font ?? regular;
    const str = clean(s);
    const w = font.widthOfTextAtSize(str, size);
    page.drawText(str, { x: opts.align === "right" ? x - w : x, y, size, font, color: opts.color ?? INK });
  };

  const newPage = () => {
    const page = doc.addPage(A4);
    pages.push(page);
    page.drawRectangle({ x: M, y: 772, width: 3, height: 42, color: RED });
    text(page, "DIH", M + 10, 795, { size: 22, font: bold });
    text(page, "A", M + 10 + bold.widthOfTextAtSize("DIH", 22), 795, { size: 22, font: bold, color: RED });
    text(page, "Drone Innovation Hub Austria", M + 10, 784, { size: 7.5, color: GREY });
    text(page, "a company by AEEG", M + 10, 775, { size: 6.5, color: GREY });
    if (inv.draft) {
      page.drawText(clean(t("ENTWURF – keine gültige Rechnung", "DRAFT – not a valid invoice")), { x: 120, y: 360, size: 34, font: bold, color: RED, opacity: 0.12, rotate: degrees(35) });
    }
    return page;
  };

  let page = newPage();

  // Absenderzeile und Empfänger
  text(page, [inv.issuer.name, ...inv.issuer.lines.slice(0, 2)].join(" · "), M, 712, { size: 7, color: GREY });
  let y = 696;
  text(page, inv.recipient.name, M, y, { size: 10, font: bold });
  for (const line of inv.recipient.lines) {
    y -= 13;
    text(page, line, M, y, { size: 10 });
  }

  // Kopfdaten rechts
  const metaX = 360;
  let my = 716;
  text(page, title, metaX, my, { size: 14, font: bold });
  my -= 20;
  const meta: [string, string][] = [
    [t("Nummer", "Number"), inv.number ?? t("(wird beim Ausstellen vergeben)", "(assigned on issue)")],
    [t("Datum", "Date"), inv.issueDate ? formatDate(inv.issueDate, l) : "–"],
    [t("Leistung", "Service"), inv.serviceFrom ? (inv.serviceTo && inv.serviceTo !== inv.serviceFrom ? `${formatDate(inv.serviceFrom, l)} – ${formatDate(inv.serviceTo, l)}` : formatDate(inv.serviceFrom, l)) : "–"],
  ];
  if (inv.kind === "invoice") meta.push([t("Fällig am", "Due date"), inv.dueDate ? formatDate(inv.dueDate, l) : "–"]);
  if (inv.refNumber) meta.push([t("Zu Rechnung", "Relates to"), inv.refNumber]);
  if (inv.bookingNumber) meta.push([t("Buchung", "Booking"), inv.bookingNumber]);
  if (inv.recipient.vatId) meta.push([t("Ihre UID", "Your VAT ID"), inv.recipient.vatId]);
  for (const [k, v] of meta) {
    text(page, k, metaX, my, { size: 8.5, color: GREY });
    text(page, v, RIGHT, my, { size: 8.5, align: "right" });
    my -= 12.5;
  }

  // Positionen
  const cols = { pos: M, desc: M + 22, qty: 352, unit: 358, price: 452, tax: 488, net: RIGHT };
  const descWidth = cols.qty - cols.desc - 46;
  const header = (pg: PDFPage, top: number) => {
    pg.drawRectangle({ x: M - 4, y: top - 5, width: RIGHT - M + 8, height: 17, color: rgb(0.95, 0.95, 0.94) });
    text(pg, t("Pos.", "No."), cols.pos, top, { size: 8, font: bold });
    text(pg, t("Beschreibung", "Description"), cols.desc, top, { size: 8, font: bold });
    text(pg, t("Menge", "Qty"), cols.qty, top, { size: 8, font: bold, align: "right" });
    text(pg, t("Einheit", "Unit"), cols.unit, top, { size: 8, font: bold });
    text(pg, t("Einzelpreis", "Unit price"), cols.price, top, { size: 8, font: bold, align: "right" });
    text(pg, t("USt.", "VAT"), cols.tax, top, { size: 8, font: bold, align: "right" });
    text(pg, t("Netto", "Net"), cols.net, top, { size: 8, font: bold, align: "right" });
    return top - 20;
  };
  y = header(page, Math.min(y, my) - 34);
  inv.lines.forEach((line, i) => {
    const descLines = wrap(clean(line.description), regular, 9, descWidth);
    const needed = descLines.length * 11 + 6;
    if (y - needed < 130) {
      page = newPage();
      y = header(page, 740);
    }
    text(page, String(i + 1), cols.pos, y);
    descLines.forEach((d, j) => text(page, d, cols.desc, y - j * 11));
    text(page, formatNumber(line.quantityMilli / 1000, l, line.quantityMilli % 1000 === 0 ? 0 : 2), cols.qty, y, { align: "right" });
    text(page, label(unitLabels, line.unit, l), cols.unit, y);
    text(page, money(line.unitPriceCents), cols.price, y, { align: "right" });
    text(page, `${formatNumber(line.taxRateBp / 100, l, 0)} %`, cols.tax, y, { align: "right" });
    text(page, money(line.netCents), cols.net, y, { align: "right" });
    y -= needed;
    page.drawLine({ start: { x: M - 4, y: y + 8 }, end: { x: RIGHT + 4, y: y + 8 }, thickness: 0.4, color: LINE });
  });

  // Summen
  if (y < 230) {
    page = newPage();
    y = 740;
  }
  y -= 8;
  const sumRow = (k: string, v: string, strong = false) => {
    text(page, k, 452, y, { size: strong ? 10 : 9, font: strong ? bold : regular, align: "right" });
    text(page, v, RIGHT, y, { size: strong ? 10 : 9, font: strong ? bold : regular, align: "right" });
    y -= strong ? 16 : 13;
  };
  sumRow(t("Summe netto", "Total net"), money(inv.netCents));
  for (const g of inv.groups) {
    if (inv.reverseCharge) continue;
    sumRow(t(`USt. ${formatNumber(g.taxRateBp / 100, l, 0)} % von ${formatMoney(g.netCents, l)}`, `VAT ${formatNumber(g.taxRateBp / 100, l, 0)} % on ${formatMoney(g.netCents, l)}`), money(g.taxCents));
  }
  page.drawLine({ start: { x: 330, y: y + 9 }, end: { x: RIGHT, y: y + 9 }, thickness: 0.6, color: INK });
  y -= 3;
  sumRow(inv.kind === "credit_note" ? t("Gutschriftsbetrag", "Credit amount") : t("Gesamtbetrag", "Total amount"), money(inv.grossCents), true);

  // Hinweise
  y -= 10;
  const para = (s: string, opts: { font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    for (const line of wrap(clean(s), opts.font ?? regular, 9, RIGHT - M)) {
      if (y < 110) {
        page = newPage();
        y = 740;
      }
      text(page, line, M, y, { font: opts.font, color: opts.color });
      y -= 12;
    }
    y -= 4;
  };
  if (inv.reverseCharge) para(t("Übergang der Steuerschuld auf den Leistungsempfänger (Reverse Charge).", "Reverse charge: VAT liability passes to the recipient."), { font: bold });
  if (inv.notes) para(inv.notes);
  if (inv.kind === "invoice") {
    const bank = [inv.issuer.iban ? `IBAN ${inv.issuer.iban}` : "", inv.issuer.bic ? `BIC ${inv.issuer.bic}` : "", inv.issuer.bank ?? ""].filter(Boolean).join(" · ");
    para(
      t(
        `Bitte überweisen Sie den Betrag bis ${inv.dueDate ? formatDate(inv.dueDate, l) : "–"} ohne Abzug unter Angabe der Rechnungsnummer${bank ? ` auf: ${bank}` : "."}`,
        `Please transfer the amount by ${inv.dueDate ? formatDate(inv.dueDate, l) : "–"} without deduction, quoting the invoice number${bank ? `, to: ${bank}` : "."}`,
      ),
    );
  } else {
    para(t("Der Betrag wird mit offenen Forderungen verrechnet bzw. erstattet.", "The amount will be offset against open items or refunded."));
  }

  // Fußzeile auf jeder Seite
  const issuerLine = [inv.issuer.name, ...inv.issuer.lines, inv.issuer.vatId ? `${t("UID", "VAT ID")} ${inv.issuer.vatId}` : "", inv.issuer.companyRegister ?? ""].filter(Boolean).join(" · ");
  const contactLine = [inv.issuer.email ?? "", inv.issuer.phone ?? "", inv.footer].filter(Boolean).join(" · ");
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 64 }, end: { x: RIGHT, y: 64 }, thickness: 0.4, color: LINE });
    let fy = 52;
    for (const fl of [...wrap(clean(issuerLine), regular, 7, RIGHT - M - 60), ...(contactLine ? wrap(clean(contactLine), regular, 7, RIGHT - M - 60) : [])].slice(0, 4)) {
      text(pg, fl, M, fy, { size: 7, color: GREY });
      fy -= 9;
    }
    text(pg, t(`Seite ${i + 1} von ${pages.length}`, `Page ${i + 1} of ${pages.length}`), RIGHT, 52, { size: 7, color: GREY, align: "right" });
  });

  return doc.save();
}
