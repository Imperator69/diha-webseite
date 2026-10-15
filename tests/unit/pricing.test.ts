import { describe, expect, it } from "vitest";
import { estimateLines, quantityFor, totals, type Rate } from "@/lib/pricing";
import { zonedToUtc } from "@/lib/time";

const p = (d: string, a: string, b: string) => ({ startsAt: zonedToUtc(d, a), endsAt: zonedToUtc(d, b) });
const rate = (over: Partial<Rate>): Rate => ({ id: "r", code: "c", nameDe: "Tarif", nameEn: "Rate", unit: "half_day", basis: "booking", priceCents: 10000, taxRateBp: 2000, zoneId: null, activityCode: null, active: true, ...over });

describe("Preise", () => {
  it("rechnet Halbtage, Tage, Stunden und Monate", () => {
    const periods = [p("2026-11-02", "08:00", "12:00"), p("2026-11-02", "13:00", "17:00"), p("2026-11-03", "08:00", "17:00")];
    expect(quantityFor("half_day", periods)).toBe(4);
    expect(quantityFor("day", periods)).toBe(3);
    expect(quantityFor("hour", periods)).toBe(17);
    expect(quantityFor("month", [p("2026-11-01", "08:00", "17:00"), p("2026-12-15", "08:00", "17:00")])).toBe(2);
  });

  it("verrechnet Zonentarife je Zone und Aktivitätstarife nur bei passender Nutzung", () => {
    const lines = estimateLines({
      rates: [rate({ id: "z", basis: "zone" }), rate({ id: "e", unit: "day", activityCode: "ground_energetics", priceCents: 50000 })],
      periods: [p("2026-11-02", "08:00", "12:00")],
      zoneIds: ["zone-z2", "zone-z3"],
      zoneCodes: { "zone-z2": "Z-2", "zone-z3": "Z-3" },
      activityCodes: ["flight_open"],
      participants: 2,
      locale: "de",
    });
    expect(lines.map((l) => l.description)).toEqual(["Tarif (Z-2)", "Tarif (Z-3)"]);
    expect(lines.every((l) => l.netCents === 10000)).toBe(true);
  });

  it("rundet die Steuer je Steuersatz und unterstützt Reverse Charge", () => {
    const lines = [
      { netCents: 3333, taxRateBp: 2000 },
      { netCents: 3333, taxRateBp: 2000 },
      { netCents: 1000, taxRateBp: 1000 },
    ];
    expect(totals(lines)).toMatchObject({ netCents: 7666, taxCents: 1333 + 100, grossCents: 9099 });
    expect(totals(lines, true)).toMatchObject({ taxCents: 0, grossCents: 7666 });
  });
});
