// Preisschätzung und Rechnungspositionen aus Tarifen (reine Funktionen).
import type { Period } from "@/lib/rules/engine";

export type Rate = {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  unit: "hour" | "half_day" | "day" | "month" | "flat" | "person_day";
  basis: "booking" | "zone" | "person";
  priceCents: number;
  taxRateBp: number;
  zoneId: string | null;
  activityCode: string | null;
  active: boolean;
};

export type PriceLine = { rateId: string; description: string; quantityMilli: number; unit: Rate["unit"]; unitPriceCents: number; taxRateBp: number; netCents: number };

const HOUR = 3_600_000;

/** Menge je Einheit aus den gebuchten Zeiträumen. Halbtag = angefangene 4,5 h, Tag = angefangene 9 h. */
export function quantityFor(unit: Rate["unit"], periods: Period[]): number {
  const hours = periods.map((p) => Math.max(0, (p.endsAt - p.startsAt) / HOUR));
  switch (unit) {
    case "hour":
      return Math.round(hours.reduce((s, h) => s + h, 0) * 1000) / 1000;
    case "half_day":
      return hours.reduce((s, h) => s + Math.max(1, Math.ceil(h / 4.5 - 1e-9)), 0);
    case "day":
    case "person_day":
      return hours.reduce((s, h) => s + Math.max(1, Math.ceil(h / 9 - 1e-9)), 0);
    case "month": {
      if (periods.length === 0) return 0;
      const span = Math.max(...periods.map((p) => p.endsAt)) - Math.min(...periods.map((p) => p.startsAt));
      return Math.max(1, Math.ceil(span / (30 * 24 * HOUR) - 1e-9));
    }
    case "flat":
      return 1;
  }
}

export function lineNet(quantityMilli: number, unitPriceCents: number): number {
  return Math.round((quantityMilli * unitPriceCents) / 1000);
}

export function lineTax(netCents: number, taxRateBp: number): number {
  return Math.round((netCents * taxRateBp) / 10_000);
}

export function estimateLines(input: {
  rates: Rate[];
  periods: Period[];
  zoneIds: string[];
  zoneCodes: Record<string, string>;
  activityCodes: string[];
  participants: number;
  locale: "de" | "en";
}): PriceLine[] {
  const lines: PriceLine[] = [];
  for (const rate of input.rates) {
    if (!rate.active) continue;
    if (rate.activityCode && !input.activityCodes.includes(rate.activityCode)) continue;
    if (rate.zoneId && !input.zoneIds.includes(rate.zoneId)) continue;
    const base = quantityFor(rate.unit, input.periods);
    const name = input.locale === "en" ? rate.nameEn : rate.nameDe;
    const targets = rate.basis === "zone" && !rate.zoneId ? input.zoneIds : [rate.zoneId ?? ""];
    for (const zoneId of targets) {
      let qty = base;
      if (rate.basis === "person" || rate.unit === "person_day") qty = base * Math.max(1, input.participants);
      const quantityMilli = Math.round(qty * 1000);
      const description = rate.basis === "zone" && zoneId ? `${name} (${input.zoneCodes[zoneId] ?? zoneId})` : name;
      lines.push({ rateId: rate.id, description, quantityMilli, unit: rate.unit, unitPriceCents: rate.priceCents, taxRateBp: rate.taxRateBp, netCents: lineNet(quantityMilli, rate.priceCents) });
    }
  }
  return lines;
}

export function totals(lines: { netCents: number; taxRateBp: number }[], reverseCharge = false) {
  const byRate = new Map<number, { net: number; tax: number }>();
  for (const l of lines) {
    const entry = byRate.get(l.taxRateBp) ?? { net: 0, tax: 0 };
    entry.net += l.netCents;
    byRate.set(l.taxRateBp, entry);
  }
  let net = 0;
  let tax = 0;
  const groups: { taxRateBp: number; netCents: number; taxCents: number }[] = [];
  for (const [rate, entry] of [...byRate.entries()].sort((a, b) => b[0] - a[0])) {
    // Steuer je Steuersatz auf die Summe, nicht je Zeile (vermeidet Rundungsdifferenzen)
    const t = reverseCharge ? 0 : lineTax(entry.net, rate);
    groups.push({ taxRateBp: reverseCharge ? 0 : rate, netCents: entry.net, taxCents: t });
    net += entry.net;
    tax += t;
  }
  return { netCents: net, taxCents: tax, grossCents: net + tax, groups };
}
