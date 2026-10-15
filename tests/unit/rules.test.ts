import { describe, expect, it } from "vitest";
import { evaluateBooking, requirementsFor, type BookingDraft, type RuleContext } from "@/lib/rules/engine";
import { weekAvailability } from "@/lib/rules/availability";
import { seedActivities, seedSlots, seedZones } from "@/lib/seed-data";
import { zonedToUtc } from "@/lib/time";

const activities = seedActivities.map((a) => ({ ...a, active: true }));
const zones = seedZones.map((z) => ({ id: z.id, code: z.code, kind: z.kind, bookable: z.bookable, active: true, capacity: z.capacity }));
const NOW = zonedToUtc("2026-10-15", "09:00");
const day = (d: string, from = "08:00", to = "12:00") => ({ startsAt: zonedToUtc(d, from), endsAt: zonedToUtc(d, to) });

const ctx = (over: Partial<RuleContext> = {}): RuleContext => ({ activities, zones, others: [], blocks: [], nowMs: NOW, enforceLeadTime: true, ...over });

const flightDraft = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  activityCodes: ["flight_open"],
  zoneIds: ["zone-z2"],
  periods: [day("2026-11-02")],
  persons: [
    { role: "project_lead", name: "Petra Projekt", phone: "+43 1 234" },
    { role: "remote_pilot", name: "Paul Pilot", phone: "+43 1 999" },
  ],
  docs: [
    { kind: "operator_registration", validUntil: null, status: "accepted" },
    { kind: "pilot_competency", validUntil: "2027-01-01", status: "uploaded" },
    { kind: "insurance", validUntil: "2026-12-31", status: "accepted" },
  ],
  details: { flight_open: { uas_model: "X8", mtom_kg: 4.2, max_height_m: 80, operator_country: "AT", operator_id: "AUT123", subcategory: "A2" } },
  participantsCount: 3,
  guestsCount: 0,
  ...over,
});

const codes = (r: ReturnType<typeof evaluateBooking>) => r.issues.filter((i) => i.severity === "error").map((i) => i.code);

describe("Regelwerk Buchungen", () => {
  it("akzeptiert eine vollständige Flugbuchung", () => {
    const r = evaluateBooking(flightDraft(), ctx());
    expect(r.ok).toBe(true);
    expect(r.requirements.roles).toEqual(["project_lead", "remote_pilot"]);
  });

  it("verlangt bei jeder Sprengung eine:n Sprengbefugte:n mit Nachweis", () => {
    const draft = flightDraft({
      activityCodes: ["ground_energetics"],
      zoneIds: ["zone-z4"],
      periods: [day("2026-11-16")],
      persons: [
        { role: "project_lead", name: "Petra", phone: "1" },
        { role: "safety_officer", name: "Sami", phone: "2" },
      ],
      docs: [],
      details: { ground_energetics: { agent_description: "Test", net_mass_kg: 1, tests_count: 2, transport_by: "AEEG" } },
    });
    const r = evaluateBooking(draft, ctx());
    expect(codes(r)).toContain("missing_role");
    expect(r.issues.find((i) => i.code === "missing_role")?.params.role).toBe("blaster");
    expect(codes(r)).toContain("missing_doc");

    const withBlasterNoProof = evaluateBooking({ ...draft, persons: [...draft.persons, { role: "blaster", name: "Bruno", phone: "3" }] }, ctx());
    expect(withBlasterNoProof.issues.some((i) => i.code === "role_incomplete" && i.params.role === "blaster")).toBe(true);
    expect(r.requirements.requiresSiteClearance).toBe(true);
  });

  it("verbietet Flugbetrieb parallel zu Wirkmittel-Tests am ganzen Gelände", () => {
    const other = { id: "b1", number: "B-1", periods: [day("2026-11-02", "08:00", "17:00")], zoneIds: ["zone-z4"], activityCodes: ["ground_energetics"] };
    const r = evaluateBooking(flightDraft(), ctx({ others: [other] }));
    expect(codes(r)).toContain("conflict");
  });

  it("prüft Kapazität je Zone", () => {
    const other = (id: string) => ({ id, number: id, periods: [day("2026-11-02")], zoneIds: ["zone-z2"], activityCodes: ["ground_robotics"] });
    expect(evaluateBooking(flightDraft(), ctx({ others: [other("a")] })).ok).toBe(true);
    expect(codes(evaluateBooking(flightDraft(), ctx({ others: [other("a"), other("b")] })))).toContain("capacity");
  });

  it("berücksichtigt Sperrzeiten des Abbaubetriebs (gesamtes Gelände)", () => {
    const block = { id: "x", zoneId: null, ...day("2026-11-02", "10:00", "11:00"), reason: "quarry_blasting" };
    expect(codes(evaluateBooking(flightDraft(), ctx({ blocks: [block] })))).toContain("blocked");
  });

  it("erzwingt Vorlaufzeiten für Projekte, Manager erhalten nur eine Warnung", () => {
    const early = flightDraft({ periods: [day("2026-10-16")] });
    expect(codes(evaluateBooking(early, ctx()))).toContain("lead_time");
    const asManager = evaluateBooking(early, ctx({ enforceLeadTime: false }));
    expect(asManager.ok).toBe(true);
    expect(asManager.issues.some((i) => i.code === "lead_time" && i.severity === "warning")).toBe(true);
  });

  it("prüft Zonentyp, Pflichtfelder, Grenzwerte und Gültigkeit der Unterlagen", () => {
    expect(codes(evaluateBooking(flightDraft({ zoneIds: ["zone-z6"] }), ctx()))).toContain("activity_zone_mismatch");
    const heavy = flightDraft({ details: { flight_open: { ...flightDraft().details.flight_open, mtom_kg: 30 } } });
    expect(codes(evaluateBooking(heavy, ctx()))).toContain("field_range");
    const missing = flightDraft({ details: { flight_open: { uas_model: "" } } });
    expect(codes(evaluateBooking(missing, ctx()))).toContain("missing_field");
    const expired = flightDraft({ docs: flightDraft().docs.map((d) => (d.kind === "insurance" ? { ...d, validUntil: "2026-10-31" } : d)) });
    expect(codes(evaluateBooking(expired, ctx()))).toContain("doc_expired");
    expect(codes(evaluateBooking(flightDraft({ zoneIds: ["zone-z7"] }), ctx()))).toContain("zone_not_bookable");
  });

  it("aktiviert bedingte Unterlagen (Funkbewilligung nur bei sendenden Geräten)", () => {
    expect(requirementsFor({ activityCodes: ["sensor_passive"], details: { sensor_passive: { transmits: false } }, guestsCount: 0 }, activities).docs).not.toContain("radio_license");
    expect(requirementsFor({ activityCodes: ["sensor_passive"], details: { sensor_passive: { transmits: true } }, guestsCount: 0 }, activities).docs).toContain("radio_license");
  });
});

describe("Verfügbarkeit", () => {
  const slots = seedSlots.map((s) => ({ ...s, zoneId: null, active: true }));
  it("markiert Vergangenheit, Vorlauf, Sperren, Belegung und Konflikte", () => {
    const cells = weekAvailability({
      weekStart: "2026-11-02",
      slots,
      zones,
      zoneIds: ["zone-z2"],
      activityCodes: ["flight_open"],
      activities,
      others: [
        { id: "a", number: "a", periods: [day("2026-11-03")], zoneIds: ["zone-z2"], activityCodes: ["ground_robotics"] },
        { id: "b", number: "b", periods: [day("2026-11-03")], zoneIds: ["zone-z2"], activityCodes: ["ground_robotics"] },
        { id: "c", number: "c", periods: [day("2026-11-04", "13:00", "17:00")], zoneIds: ["zone-z4"], activityCodes: ["ground_energetics"] },
      ],
      blocks: [{ id: "x", zoneId: null, ...day("2026-11-05"), reason: "quarry_blasting" }],
      nowMs: NOW,
      leadDays: 3,
    });
    const at = (date: string, slot: string) => cells.find((c) => c.date === date && c.slotId === slot)?.status;
    expect(at("2026-11-02", "slot-am")).toBe("free");
    expect(at("2026-11-03", "slot-am")).toBe("busy");
    expect(at("2026-11-04", "slot-pm")).toBe("conflict");
    expect(at("2026-11-05", "slot-am")).toBe("blocked");
    expect(at("2026-11-07", "slot-sat")).toBe("free");
    expect(cells.some((c) => c.date === "2026-11-08")).toBe(false);
  });
});
