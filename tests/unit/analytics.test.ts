import { describe, expect, it } from "vitest";
import { intersect, measure, openWindows, subtract, union, utilization } from "@/lib/analytics/intervals";
import { zonedToUtc } from "@/lib/time";

const H = 3_600_000;

describe("Intervalle", () => {
  it("vereinigt, schneidet und zieht ab", () => {
    expect(union([[5, 8], [1, 3], [2, 4]])).toEqual([[1, 4], [5, 8]]);
    expect(intersect([[0, 10]], [[2, 4], [8, 12]])).toEqual([[2, 4], [8, 10]]);
    expect(subtract([[0, 10]], [[2, 4], [8, 12]])).toEqual([[0, 2], [4, 8]]);
    expect(measure([[0, 5], [3, 8]])).toBe(8);
  });

  it("berechnet Betriebsfenster aus überlappenden Slots abzüglich Sperrzeiten", () => {
    const slots = [
      { zoneId: null, startTime: "08:00", endTime: "12:30", weekdays: [1, 2, 3, 4, 5], active: true },
      { zoneId: null, startTime: "13:00", endTime: "17:30", weekdays: [1, 2, 3, 4, 5], active: true },
      { zoneId: null, startTime: "08:00", endTime: "17:30", weekdays: [1, 2, 3, 4, 5], active: true },
    ];
    // Montag, 19.10.2026: Ganztag 08:00–17:30 = 9,5 h; Sprengung 10:00–11:00 gesperrt
    const block = { zoneId: null, startsAt: zonedToUtc("2026-10-19", "10:00"), endsAt: zonedToUtc("2026-10-19", "11:00") };
    expect(measure(openWindows("2026-10-19", "z1", slots, [block])) / H).toBe(8.5);
    // Samstag: keine Slots
    expect(measure(openWindows("2026-10-24", "z1", slots, []))).toBe(0);
  });

  it("zählt Buchungen nur innerhalb der Betriebsfenster", () => {
    const slots = [{ zoneId: null, startTime: "08:00", endTime: "17:00", weekdays: [1, 2, 3, 4, 5], active: true }];
    const res = utilization({
      days: ["2026-10-19", "2026-10-20"],
      zoneIds: ["z1"],
      slots,
      blocks: [],
      // rund um die Uhr über zwei Tage gebucht
      booked: { z1: [[zonedToUtc("2026-10-19", "00:00"), zonedToUtc("2026-10-20", "12:00")]] },
    });
    expect(res.z1["2026-10"]).toEqual({ availableH: 18, bookedH: 13 });
  });
});
