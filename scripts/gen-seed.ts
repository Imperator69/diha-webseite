// Erzeugt drizzle/0001_seed.sql aus lib/seed-data.ts: `node scripts/gen-seed.ts`
import { writeFileSync } from "node:fs";
import { seedActivities, seedRates, seedSlots, seedZones } from "../lib/seed-data.ts";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const lines: string[] = ["-- Startdaten (indikativ, durch Manager im Portal anpassbar)"];

for (const z of seedZones) {
  lines.push(
    `INSERT INTO zones (id, code, name_de, name_en, desc_de, desc_en, kind, color, polygon, bookable, public_visible, capacity, sort_order) VALUES (${[
      z.id, z.code, z.nameDe, z.nameEn, z.descDe, z.descEn, z.kind, z.color, z.polygon, z.bookable, z.publicVisible, z.capacity, z.sortOrder,
    ].map(q).join(", ")});`,
  );
}
for (const a of seedActivities) {
  lines.push(
    `INSERT INTO activity_types (id, code, name_de, name_en, desc_de, desc_en, category, allowed_zone_kinds, required_roles, required_docs, conditional, conflicts_with, detail_fields, checklist, lead_days, requires_site_clearance, sort_order) VALUES (${[
      a.id, a.code, a.nameDe, a.nameEn, a.descDe, a.descEn, a.category, a.allowedZoneKinds, a.requiredRoles, a.requiredDocs, a.conditional, a.conflictsWith, a.detailFields, a.checklist, a.leadDays, a.requiresSiteClearance, a.sortOrder,
    ].map(q).join(", ")});`,
  );
}
for (const s of seedSlots) {
  lines.push(
    `INSERT INTO slot_templates (id, zone_id, name_de, name_en, start_time, end_time, weekdays, sort_order) VALUES (${[
      s.id, null, s.nameDe, s.nameEn, s.startTime, s.endTime, s.weekdays, s.sortOrder,
    ].map(q).join(", ")});`,
  );
}
for (const r of seedRates) {
  lines.push(
    `INSERT INTO rates (id, code, name_de, name_en, unit, price_cents, tax_rate_bp, activity_code, sort_order) VALUES (${[
      r.id, r.code, r.nameDe, r.nameEn, r.unit, 0, 2000, "activityCode" in r ? r.activityCode : null, r.sortOrder,
    ].map(q).join(", ")});`,
  );
}
const settings: Record<string, unknown> = {
  company: {
    name: "DIHA GmbH (in Gründung)",
    street: "tba",
    postalCode: "",
    city: "tba",
    country: "Österreich",
    vatId: "",
    companyRegister: "",
    court: "",
    email: "",
    phone: "",
    iban: "",
    bic: "",
    bank: "",
  },
  invoice: { paymentDays: 14, prefix: "DIHA", footerDe: "", footerEn: "" },
  retention: { inquiryMonths: 12, outboxDays: 30 },
  booking: { guestThreshold: 10 },
};
for (const [key, value] of Object.entries(settings)) {
  lines.push(`INSERT INTO settings (key, value) VALUES (${q(key)}, ${q(value)});`);
}

writeFileSync(new URL("../drizzle/0001_seed.sql", import.meta.url), lines.join("\n--> statement-breakpoint\n") + "\n");
console.log(`seed: ${lines.length - 1} statements`);
