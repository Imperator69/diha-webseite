// Regelwerk für Buchungen: reine Funktionen ohne Datenbankzugriff, damit sie
// im Assistenten (Client), in Server Actions und in Unit-Tests gleich arbeiten.
import type { ChecklistItem, ConditionalRequirement, DetailField } from "@/db/schema";
import { overlaps, zonedDate } from "@/lib/time";

export type RuleActivity = {
  code: string;
  category: string;
  nameDe: string;
  nameEn: string;
  allowedZoneKinds: string[];
  requiredRoles: string[];
  requiredDocs: string[];
  conditional: ConditionalRequirement[];
  conflictsWith: string[];
  detailFields: DetailField[];
  checklist: ChecklistItem[];
  leadDays: number;
  requiresSiteClearance: boolean;
  active: boolean;
};

export type RuleZone = { id: string; code: string; kind: string; bookable: boolean; active: boolean; capacity: number };
export type Period = { startsAt: number; endsAt: number };
export type OtherBooking = { id: string; number: string; periods: Period[]; zoneIds: string[]; activityCodes: string[] };
export type Block = { id: string; zoneId: string | null; startsAt: number; endsAt: number; reason: string };
export type DraftPerson = { role: string; name: string; phone?: string | null; email?: string | null; qualification?: string | null };
export type AvailableDoc = { kind: string; validUntil: string | null; status: string };

export type BookingDraft = {
  activityCodes: string[];
  zoneIds: string[];
  periods: Period[];
  persons: DraftPerson[];
  docs: AvailableDoc[];
  details: Record<string, Record<string, unknown>>;
  participantsCount: number;
  guestsCount: number;
};

export type RuleContext = {
  activities: RuleActivity[];
  zones: RuleZone[];
  others: OtherBooking[];
  blocks: Block[];
  nowMs: number;
  /** Vorlaufzeiten erzwingen (Projekte: ja; Manager können übersteuern) */
  enforceLeadTime: boolean;
  guestThreshold?: number;
};

export type IssueCode =
  | "no_activity"
  | "no_zone"
  | "no_period"
  | "inactive_activity"
  | "period_invalid"
  | "period_past"
  | "lead_time"
  | "zone_not_bookable"
  | "activity_zone_mismatch"
  | "zone_unused"
  | "blocked"
  | "capacity"
  | "conflict"
  | "missing_role"
  | "role_incomplete"
  | "missing_doc"
  | "doc_expired"
  | "missing_field"
  | "field_range";

export type Issue = { code: IssueCode; severity: "error" | "warning"; params: Record<string, string | number> };

export type Requirements = {
  roles: string[];
  docs: string[];
  checklist: ChecklistItem[];
  requiresSiteClearance: boolean;
  leadDays: number;
};

export type Evaluation = { ok: boolean; issues: Issue[]; requirements: Requirements };

const DAY_MS = 86_400_000;

/** Standard-Prüfpunkte für jede Buchung (Manager). */
export const baseChecklist: ChecklistItem[] = [
  { key: "persons_verified", de: "Verantwortliche Personen und Nachweise geprüft", en: "Responsible persons and qualifications verified" },
  { key: "documents_verified", de: "Unterlagen vollständig und gültig", en: "Documents complete and valid" },
  { key: "insurance_checked", de: "Versicherungsdeckung bestätigt", en: "Insurance cover confirmed" },
  { key: "access_list", de: "Zutrittsliste und Einweisung vorbereitet", en: "Access list and briefing prepared" },
];

function matchesConflict(entry: string, activity: RuleActivity): boolean {
  return entry === activity.code || entry === activity.category;
}

/** Zwei Nutzungsarten schließen sich aus, wenn eine die andere (Code oder Kategorie) nennt. */
export function activitiesConflict(a: RuleActivity, b: RuleActivity): boolean {
  return a.conflictsWith.some((c) => matchesConflict(c, b)) || b.conflictsWith.some((c) => matchesConflict(c, a));
}

function conditionHolds(cond: ConditionalRequirement, details: Record<string, unknown> | undefined): boolean {
  const value = details?.[cond.field];
  if (typeof cond.equals === "boolean") return Boolean(value) === cond.equals;
  return String(value ?? "") === String(cond.equals);
}

export function requirementsFor(draft: Pick<BookingDraft, "activityCodes" | "details" | "guestsCount">, activities: RuleActivity[], guestThreshold = 10): Requirements {
  const selected = activities.filter((a) => draft.activityCodes.includes(a.code));
  const roles = new Set<string>();
  const docs = new Set<string>();
  const checklist: ChecklistItem[] = [...baseChecklist];
  let leadDays = 0;
  let requiresSiteClearance = false;
  for (const a of selected) {
    a.requiredRoles.forEach((r) => roles.add(r));
    a.requiredDocs.forEach((d) => docs.add(d));
    for (const cond of a.conditional) {
      if (conditionHolds(cond, draft.details[a.code])) {
        if (cond.doc) docs.add(cond.doc);
        if (cond.role) roles.add(cond.role);
      }
    }
    for (const item of a.checklist) if (!checklist.some((c) => c.key === item.key)) checklist.push(item);
    leadDays = Math.max(leadDays, a.leadDays);
    requiresSiteClearance ||= a.requiresSiteClearance;
  }
  if (draft.guestsCount > guestThreshold) docs.add("participant_list");
  if (requiresSiteClearance) checklist.push({ key: "site_clearance", de: "Schlussfreigabe des Geländes dokumentiert", en: "Site clearance documented" });
  return { roles: [...roles], docs: [...docs], checklist, requiresSiteClearance, leadDays };
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function evaluateBooking(draft: BookingDraft, ctx: RuleContext): Evaluation {
  const issues: Issue[] = [];
  const err = (code: IssueCode, params: Issue["params"] = {}) => issues.push({ code, severity: "error", params });
  const warn = (code: IssueCode, params: Issue["params"] = {}) => issues.push({ code, severity: "warning", params });

  const activities = ctx.activities.filter((a) => draft.activityCodes.includes(a.code));
  const zones = ctx.zones.filter((z) => draft.zoneIds.includes(z.id));
  const requirements = requirementsFor(draft, ctx.activities, ctx.guestThreshold);

  if (activities.length === 0) err("no_activity");
  if (zones.length === 0) err("no_zone");
  if (draft.periods.length === 0) err("no_period");

  for (const a of activities) if (!a.active) err("inactive_activity", { activity: a.code });

  // Zonen und Nutzungsarten müssen zueinander passen
  for (const z of zones) if (!z.bookable || !z.active) err("zone_not_bookable", { zone: z.code });
  for (const a of activities) {
    if (zones.length && !zones.some((z) => a.allowedZoneKinds.includes(z.kind))) err("activity_zone_mismatch", { activity: a.code });
  }
  for (const z of zones) {
    if (activities.length && !activities.some((a) => a.allowedZoneKinds.includes(z.kind))) warn("zone_unused", { zone: z.code });
  }

  // Zeiträume, Vorlauf, Sperrzeiten, Kapazität, Ausschlüsse
  const earliestStart = Math.min(...draft.periods.map((p) => p.startsAt));
  for (const p of draft.periods) {
    if (!(p.endsAt > p.startsAt)) err("period_invalid", { start: p.startsAt });
    else if (p.startsAt < ctx.nowMs) err("period_past", { start: p.startsAt });
  }
  if (draft.periods.length && requirements.leadDays > 0 && earliestStart < ctx.nowMs + requirements.leadDays * DAY_MS) {
    const strictest = activities.reduce((m, a) => (a.leadDays > m.leadDays ? a : m), activities[0]);
    (ctx.enforceLeadTime ? err : warn)("lead_time", { activity: strictest?.code ?? "", days: requirements.leadDays });
  }

  const zoneIds = new Set(draft.zoneIds);
  for (const p of draft.periods) {
    for (const b of ctx.blocks) {
      if ((b.zoneId === null || zoneIds.has(b.zoneId)) && overlaps(p.startsAt, p.endsAt, b.startsAt, b.endsAt)) {
        err("blocked", { zone: b.zoneId ? (ctx.zones.find((z) => z.id === b.zoneId)?.code ?? "") : "*", start: p.startsAt, reason: b.reason });
      }
    }
    const overlapping = ctx.others.filter((o) => o.periods.some((op) => overlaps(p.startsAt, p.endsAt, op.startsAt, op.endsAt)));
    for (const z of zones) {
      const used = overlapping.filter((o) => o.zoneIds.includes(z.id)).length;
      if (used >= Math.max(z.capacity, 0)) err("capacity", { zone: z.code, start: p.startsAt });
    }
    for (const o of overlapping) {
      const theirs = ctx.activities.filter((a) => o.activityCodes.includes(a.code));
      for (const mine of activities) {
        const clash = theirs.find((t) => activitiesConflict(mine, t));
        if (clash) err("conflict", { activity: mine.code, other: clash.code, start: p.startsAt });
      }
    }
  }

  // Verantwortliche Personen
  for (const role of requirements.roles) {
    const person = draft.persons.find((x) => x.role === role);
    if (!person) err("missing_role", { role });
    else if (isEmpty(person.name) || isEmpty(person.phone) || (role === "blaster" && isEmpty(person.qualification))) err("role_incomplete", { role });
  }

  // Unterlagen (gültig bis mindestens zum Ende des letzten Zeitraums)
  const lastEnd = draft.periods.length ? Math.max(...draft.periods.map((p) => p.endsAt)) : ctx.nowMs;
  const lastDay = zonedDate(lastEnd);
  for (const kind of requirements.docs) {
    const candidates = draft.docs.filter((d) => d.kind === kind && d.status !== "rejected");
    if (candidates.length === 0) err("missing_doc", { doc: kind });
    else if (!candidates.some((d) => !d.validUntil || d.validUntil >= lastDay)) err("doc_expired", { doc: kind });
  }

  // Detailangaben je Nutzungsart
  for (const a of activities) {
    const values = draft.details[a.code] ?? {};
    for (const f of a.detailFields) {
      const v = values[f.key];
      if (f.required && f.type !== "boolean" && isEmpty(v)) {
        err("missing_field", { activity: a.code, field: f.key });
        continue;
      }
      if (f.type === "number" && !isEmpty(v)) {
        const n = Number(v);
        if (!Number.isFinite(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) err("field_range", { activity: a.code, field: f.key });
      }
      if (f.type === "select" && !isEmpty(v) && f.options && !f.options.some((o) => o.value === v)) err("field_range", { activity: a.code, field: f.key });
    }
  }

  return { ok: !issues.some((i) => i.severity === "error"), issues, requirements };
}
