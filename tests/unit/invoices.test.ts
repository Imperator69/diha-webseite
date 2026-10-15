import { describe, expect, it } from "vitest";
import { buildLine, formatInvoiceNumber, isOverdue, issueProblems, parseDecimal, partyFromProject, settlementStatus } from "@/lib/invoices/compute";
import { renderInvoicePdf } from "@/lib/invoices/pdf";
import { totals } from "@/lib/pricing";

describe("Rechnungslogik", () => {
  it("liest Dezimalzahlen in deutscher und englischer Schreibweise", () => {
    expect(parseDecimal("1.234,50")).toBe(1234.5);
    expect(parseDecimal("1,234.50")).toBe(1234.5);
    expect(parseDecimal("0,5")).toBe(0.5);
    expect(parseDecimal("-25")).toBe(-25);
    expect(parseDecimal("12 €")).toBe(12);
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });

  it("rechnet Positionen in Tausendstel und Cent ohne Rundungsfehler", () => {
    const l = buildLine({ description: "Halbtag", quantity: 0.5, unit: "day", unitPriceCents: 33333, taxRateBp: 2000 });
    expect(l.quantityMilli).toBe(500);
    expect(l.netCents).toBe(16667);
    const sum = totals([l, buildLine({ description: "x", quantity: 3, unit: "hour", unitPriceCents: 1999, taxRateBp: 2000 }), buildLine({ description: "y", quantity: 1, unit: "flat", unitPriceCents: 1000, taxRateBp: 1000 })]);
    expect(sum.netCents).toBe(16667 + 5997 + 1000);
    expect(sum.groups).toEqual([
      { taxRateBp: 2000, netCents: 22664, taxCents: 4533 },
      { taxRateBp: 1000, netCents: 1000, taxCents: 100 },
    ]);
    expect(sum.grossCents).toBe(23664 + 4633);
  });

  it("bestimmt den Zahlungsstatus auch für Gutschriften", () => {
    expect(settlementStatus(12000, 0)).toBe("issued");
    expect(settlementStatus(12000, 5000)).toBe("partially_paid");
    expect(settlementStatus(12000, 12000)).toBe("paid");
    expect(settlementStatus(-12000, -12000)).toBe("paid");
    expect(settlementStatus(-12000, 0)).toBe("issued");
  });

  it("formatiert Nummern fortlaufend und erkennt Überfälligkeit", () => {
    expect(formatInvoiceNumber("DIHA", 2026, 7)).toBe("DIHA-2026-0007");
    expect(isOverdue({ status: "issued", dueDate: "2026-10-01", kind: "invoice" }, "2026-10-02")).toBe(true);
    expect(isOverdue({ status: "paid", dueDate: "2026-10-01", kind: "invoice" }, "2026-10-02")).toBe(false);
    expect(isOverdue({ status: "issued", dueDate: "2026-10-02", kind: "invoice" }, "2026-10-02")).toBe(false);
  });

  it("verlangt Pflichtangaben nach § 11 UStG vor dem Ausstellen", () => {
    const issuer = { name: "DIHA GmbH", lines: ["Musterweg 1", "3820 Raabs"], vatId: "ATU12345678", iban: "AT611904300234573201" };
    const recipient = partyFromProject({ organization: "Alpha GmbH", contactName: "P. Projekt", contactEmail: null, street: "Weg 2", postalCode: "80331", city: "München", country: "DE", vatId: null, companyRegister: null }, "de");
    expect(recipient.lines).toEqual(["z. H. P. Projekt", "Weg 2", "80331 München", "Deutschland"]);
    const issuerAddress = { street: "Musterweg 1", postalCode: "3820", city: "Raabs" };
    const recipientAddress = { street: "Weg 2", postalCode: "80331", city: "München" };
    const base = { issuer, issuerAddress, recipient, recipientAddress, lines: [{ netCents: 1000 }], grossCents: 1200, reverseCharge: false, serviceFrom: "2026-10-01", kind: "invoice" as const };
    expect(issueProblems(base)).toEqual([]);
    expect(issueProblems({ ...base, reverseCharge: true })).toEqual(["recipient_vat"]);
    expect(issueProblems({ ...base, grossCents: 1_000_001 })).toEqual(["recipient_vat"]);
    expect(issueProblems({ ...base, issuer: { name: "DIHA", lines: [] }, issuerAddress: { street: "", postalCode: "3820", city: "Raabs" } })).toEqual(["issuer_address", "issuer_vat", "issuer_bank"]);
    // Land allein ist keine Anschrift
    expect(issueProblems({ ...base, recipientAddress: { street: null, postalCode: "80802", city: null } })).toEqual(["recipient_address"]);
    expect(issueProblems({ ...base, lines: [], grossCents: 0, serviceFrom: null })).toEqual(["no_lines", "service_date", "zero_total"]);
  });

  it("erzeugt ein PDF, auch mit Zeichen außerhalb von WinAnsi", async () => {
    const lines = [buildLine({ description: "Flugfläche Z-2 (Halbtag) – Prüfstand für Čeněk Dvořák „Test“", quantity: 2, unit: "half_day", unitPriceCents: 45000, taxRateBp: 2000 })];
    const sum = totals(lines);
    const bytes = await renderInvoicePdf({
      kind: "invoice",
      number: "DIHA-2026-0001",
      locale: "de",
      issueDate: "2026-10-15",
      dueDate: "2026-10-29",
      serviceFrom: "2026-10-01",
      serviceTo: "2026-10-02",
      issuer: { name: "DIHA GmbH", lines: ["Musterweg 1", "3820 Raabs an der Thaya"], vatId: "ATU12345678", iban: "AT611904300234573201", bic: "BKAUATWW" },
      recipient: { name: "Ústí Robotics s.r.o.", lines: ["Náměstí 1", "400 01 Ústí nad Labem", "Tschechien"], vatId: "CZ12345678" },
      reverseCharge: false,
      ...sum,
      lines,
      notes: "Danke für den Auftrag.",
      footer: "",
      bookingNumber: "B-2026-0001",
      refNumber: null,
      draft: false,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
