import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isoWeekday, startOfIsoWeek, zonedDate, zonedTime, zonedToUtc } from "@/lib/time";

describe("Zeitzone Europe/Vienna", () => {
  it("rechnet Winterzeit (UTC+1) korrekt", () => {
    expect(new Date(zonedToUtc("2026-01-15", "08:00")).toISOString()).toBe("2026-01-15T07:00:00.000Z");
  });
  it("rechnet Sommerzeit (UTC+2) korrekt", () => {
    expect(new Date(zonedToUtc("2026-07-15", "08:00")).toISOString()).toBe("2026-07-15T06:00:00.000Z");
  });
  it("übersteht die Umstellung Ende Oktober", () => {
    // 25.10.2026: 03:00 MESZ → 02:00 MEZ
    expect(new Date(zonedToUtc("2026-10-25", "12:00")).toISOString()).toBe("2026-10-25T11:00:00.000Z");
    expect(new Date(zonedToUtc("2026-10-24", "12:00")).toISOString()).toBe("2026-10-24T10:00:00.000Z");
  });
  it("liefert Wiener Kalendertag und Uhrzeit", () => {
    const ms = Date.parse("2026-03-31T22:30:00Z");
    expect(zonedDate(ms)).toBe("2026-04-01");
    expect(zonedTime(ms)).toBe("00:30");
  });
});

describe("Kalenderhilfen", () => {
  it("Wochentage und Wochenstart", () => {
    expect(isoWeekday("2026-10-15")).toBe(4);
    expect(isoWeekday("2026-10-18")).toBe(7);
    expect(startOfIsoWeek("2026-10-18")).toBe("2026-10-12");
  });
  it("Tage addieren und Abstände über Monatsgrenzen", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(daysBetween("2026-01-31", "2026-03-01")).toBe(29);
  });
});
