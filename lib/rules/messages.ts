import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { blockReasonLabels, docKindLabels, label, personRoleLabels } from "@/lib/i18n/labels";
import type { Issue, RuleActivity } from "./engine";

/** Verständliche Meldung zu einem Regelverstoß. */
export function issueText(issue: Issue, locale: Locale, activities: RuleActivity[]): string {
  const p = issue.params;
  const act = (code: unknown) => {
    const a = activities.find((x) => x.code === code);
    return a ? (locale === "en" ? a.nameEn : a.nameDe) : String(code ?? "");
  };
  const field = (code: unknown, key: unknown) => {
    const f = activities.find((x) => x.code === code)?.detailFields.find((d) => d.key === key);
    return f ? (locale === "en" ? f.en : f.de) : String(key);
  };
  const when = (ms: unknown) => (typeof ms === "number" ? formatDateTime(ms, locale) : "");
  const de: Record<string, string> = {
    no_activity: "Bitte mindestens eine Nutzungsart wählen.",
    no_zone: "Bitte mindestens einen Bereich wählen.",
    no_period: "Bitte mindestens einen Termin wählen.",
    inactive_activity: `„${act(p.activity)}“ ist derzeit nicht buchbar.`,
    period_invalid: "Ein Termin hat ein Ende vor dem Beginn.",
    period_past: `Der Termin ${when(p.start)} liegt in der Vergangenheit.`,
    lead_time: `„${act(p.activity)}“ braucht mindestens ${p.days} Tage Vorlauf.`,
    zone_not_bookable: `Bereich ${p.zone} ist nicht buchbar.`,
    activity_zone_mismatch: `Für „${act(p.activity)}“ ist kein passender Bereich gewählt.`,
    zone_unused: `Bereich ${p.zone} passt zu keiner gewählten Nutzungsart.`,
    blocked: `${p.zone === "*" ? "Das Gelände" : `Bereich ${p.zone}`} ist am ${when(p.start)} gesperrt (${label(blockReasonLabels, String(p.reason), locale)}).`,
    capacity: `Bereich ${p.zone} ist am ${when(p.start)} bereits belegt.`,
    conflict: `„${act(p.activity)}“ ist am ${when(p.start)} nicht möglich, weil gleichzeitig „${act(p.other)}“ stattfindet.`,
    missing_role: `Bitte ${label(personRoleLabels, String(p.role), locale)} benennen.`,
    role_incomplete: `Angaben zu ${label(personRoleLabels, String(p.role), locale)} unvollständig (Name, Telefon${p.role === "blaster" ? ", Nachweis der Sprengbefugnis" : ""}).`,
    missing_doc: `Unterlage fehlt: ${label(docKindLabels, String(p.doc), locale)}.`,
    doc_expired: `Unterlage nicht bis zum Termin gültig: ${label(docKindLabels, String(p.doc), locale)}.`,
    missing_field: `„${act(p.activity)}“: Angabe „${field(p.activity, p.field)}“ fehlt.`,
    field_range: `„${act(p.activity)}“: Wert für „${field(p.activity, p.field)}“ ist nicht zulässig.`,
  };
  const en: Record<string, string> = {
    no_activity: "Please choose at least one type of use.",
    no_zone: "Please choose at least one area.",
    no_period: "Please choose at least one date.",
    inactive_activity: `“${act(p.activity)}” is currently not bookable.`,
    period_invalid: "A date ends before it starts.",
    period_past: `The date ${when(p.start)} is in the past.`,
    lead_time: `“${act(p.activity)}” requires at least ${p.days} days lead time.`,
    zone_not_bookable: `Area ${p.zone} cannot be booked.`,
    activity_zone_mismatch: `No suitable area selected for “${act(p.activity)}”.`,
    zone_unused: `Area ${p.zone} does not match any selected type of use.`,
    blocked: `${p.zone === "*" ? "The site" : `Area ${p.zone}`} is blocked on ${when(p.start)} (${label(blockReasonLabels, String(p.reason), locale)}).`,
    capacity: `Area ${p.zone} is already booked on ${when(p.start)}.`,
    conflict: `“${act(p.activity)}” is not possible on ${when(p.start)} because “${act(p.other)}” takes place at the same time.`,
    missing_role: `Please name the ${label(personRoleLabels, String(p.role), locale).toLowerCase()}.`,
    role_incomplete: `Details for ${label(personRoleLabels, String(p.role), locale).toLowerCase()} incomplete (name, phone${p.role === "blaster" ? ", blasting licence" : ""}).`,
    missing_doc: `Missing document: ${label(docKindLabels, String(p.doc), locale)}.`,
    doc_expired: `Document not valid until the date: ${label(docKindLabels, String(p.doc), locale)}.`,
    missing_field: `“${act(p.activity)}”: “${field(p.activity, p.field)}” is missing.`,
    field_range: `“${act(p.activity)}”: value for “${field(p.activity, p.field)}” is not allowed.`,
  };
  return (locale === "en" ? en : de)[issue.code] ?? issue.code;
}
