import type { Locale } from "./config";
import type { Text } from "./t";

type LabelMap = Record<string, Text>;

export const roleLabels: LabelMap = {
  admin: { de: "Admin", en: "Admin" },
  manager: { de: "Manager", en: "Manager" },
  project: { de: "Projekt", en: "Project" },
};

export const userStatusLabels: LabelMap = {
  invited: { de: "Eingeladen", en: "Invited" },
  active: { de: "Aktiv", en: "Active" },
  disabled: { de: "Deaktiviert", en: "Disabled" },
};

export const bookingStatusLabels: LabelMap = {
  draft: { de: "Entwurf", en: "Draft" },
  requested: { de: "Angefragt", en: "Requested" },
  in_review: { de: "In Prüfung", en: "In review" },
  confirmed: { de: "Bestätigt", en: "Confirmed" },
  rejected: { de: "Abgelehnt", en: "Rejected" },
  cancelled: { de: "Storniert", en: "Cancelled" },
  completed: { de: "Durchgeführt", en: "Completed" },
  invoiced: { de: "Abgerechnet", en: "Invoiced" },
};

export const zoneKindLabels: LabelMap = {
  base: { de: "Betriebs- & Sicherheitsbasis", en: "Operations & safety base" },
  flight: { de: "Flug- & Sensorfläche", en: "Flight & sensor area" },
  robotics: { de: "Robotik- & Erprobungsroute", en: "Robotics & test route" },
  energetics: { de: "Bodentest-Zone mit Wirkmittel", en: "Ground test zone (energetics)" },
  water: { de: "Wasser- & Wettertests", en: "Water & weather tests" },
  workshop: { de: "Container & Werkstatt", en: "Containers & workshop" },
  buffer: { de: "Schutz- & Pufferbereich", en: "Safety buffer" },
};

export const activityCategoryLabels: LabelMap = {
  workshop: { de: "Werkstatt", en: "Workshop" },
  flight: { de: "Flug", en: "Flight" },
  ground: { de: "Bodentest", en: "Ground test" },
  energetics: { de: "Wirkmittel", en: "Energetics" },
  sensor: { de: "Sensorik", en: "Sensors" },
  training: { de: "Ausbildung", en: "Training" },
  event: { de: "Veranstaltung", en: "Event" },
  water: { de: "Wasser/Wetter", en: "Water/weather" },
};

/** Rollen der verantwortlichen Personen je Buchung. */
export const personRoleLabels: LabelMap = {
  project_lead: { de: "Projektverantwortliche:r", en: "Project lead" },
  remote_pilot: { de: "Fernpilot:in", en: "Remote pilot" },
  blaster: { de: "Sprengbefugte:r vor Ort", en: "Licensed blaster on site" },
  safety_officer: { de: "Sicherheitsverantwortliche:r", en: "Safety officer" },
  instructor: { de: "Ausbilder:in", en: "Instructor" },
  first_aider: { de: "Ersthelfer:in", en: "First aider" },
  explosives_officer: { de: "Beauftragte:r Schieß- und Sprengmittel", en: "Explosives officer" },
};

/** Dokumentarten (Projekt-, Buchungs- und Standortunterlagen). */
export const docKindLabels: LabelMap = {
  operator_registration: { de: "UAS-Betreiberregistrierung (Betreiber-ID)", en: "UAS operator registration (operator ID)" },
  pilot_competency: { de: "Kompetenznachweis Fernpilot:in", en: "Remote pilot competency certificate" },
  operation_authorisation: {
    de: "Betriebsgenehmigung / STS-Erklärung / Art.-13-Bestätigung",
    en: "Operational authorisation / STS declaration / Art. 13 confirmation",
  },
  insurance: { de: "Versicherungsnachweis (Haftpflicht)", en: "Proof of insurance (liability)" },
  risk_assessment: { de: "Gefährdungsbeurteilung", en: "Risk assessment" },
  blasting_plan: { de: "Sprengplan", en: "Blasting plan" },
  blaster_license: { de: "Nachweis Sprengbefugnis", en: "Blasting licence" },
  explosives_permit: { de: "Erwerbs-/Besitzberechtigung Sprengmittel", en: "Explosives acquisition/possession permit" },
  radio_license: { de: "Funkbewilligung / Frequenznachweis", en: "Radio licence / frequency approval" },
  participant_list: { de: "Teilnehmer- und Gästeliste", en: "Participant and guest list" },
  event_notice: { de: "Veranstaltungsanzeige / -bewilligung", en: "Event notification / permit" },
  hazmat_declaration: { de: "Gefahrstoff-Erklärung", en: "Hazardous materials declaration" },
  end_use_declaration: { de: "Endverbleibserklärung", en: "End-use declaration" },
  company_register: { de: "Firmenbuchauszug", en: "Commercial register extract" },
  emergency_plan: { de: "Einsatz- und Alarmplan", en: "Emergency and alarm plan" },
  safety_case: { de: "Sicherheitsnachweis (Safety Case)", en: "Safety case" },
  permit_decision: { de: "Bescheid / Genehmigung", en: "Decision / permit" },
  submission: { de: "Einreichung / Antrag", en: "Submission / application" },
  contract: { de: "Vertrag", en: "Contract" },
  site_plan: { de: "Lage- / Zonenplan", en: "Site / zone plan" },
  other: { de: "Sonstiges", en: "Other" },
};

export const authorityLabels: LabelMap = {
  austro_control: { de: "Austro Control (Drone Competence Center)", en: "Austro Control (Drone Competence Center)" },
  bh_waidhofen: { de: "BH Waidhofen an der Thaya", en: "District authority Waidhofen an der Thaya" },
  gemeinde_raabs: { de: "Stadtgemeinde Raabs an der Thaya", en: "Municipality of Raabs an der Thaya" },
  land_noe: { de: "Amt der NÖ Landesregierung", en: "Lower Austria state government" },
  montanbehoerde: { de: "Montanbehörde", en: "Mining authority" },
  fernmeldebuero: { de: "Fernmeldebüro", en: "Telecommunications office" },
  arbeitsinspektorat: { de: "Arbeitsinspektorat NÖ", en: "Labour inspectorate Lower Austria" },
  bmlv: { de: "BMLV", en: "Federal Ministry of Defence (BMLV)" },
  bmi: { de: "BMI", en: "Federal Ministry of the Interior (BMI)" },
  export_control: { de: "Exportkontrollbehörde", en: "Export control authority" },
  insurer: { de: "Versicherung / Makler", en: "Insurer / broker" },
  landowner: { de: "Grundeigentümer / Standortpartner", en: "Landowner / site partner" },
  other: { de: "Sonstige Stelle", en: "Other body" },
};

export const permitStatusLabels: LabelMap = {
  planned: { de: "Geplant", en: "Planned" },
  preparing: { de: "In Vorbereitung", en: "In preparation" },
  submitted: { de: "Eingereicht", en: "Submitted" },
  improvement_requested: { de: "Verbesserungsauftrag", en: "Improvement requested" },
  granted: { de: "Bewilligt", en: "Granted" },
  rejected: { de: "Abgelehnt", en: "Rejected" },
  expired: { de: "Abgelaufen", en: "Expired" },
  withdrawn: { de: "Zurückgezogen", en: "Withdrawn" },
};

export const permitKindLabels: LabelMap = {
  permit: { de: "Genehmigung", en: "Permit" },
  submission: { de: "Einreichung", en: "Submission" },
  notification: { de: "Anzeige / Meldung", en: "Notification" },
  insurance: { de: "Versicherung", en: "Insurance" },
  contract: { de: "Vertrag / Zustimmung", en: "Contract / consent" },
  other: { de: "Sonstiges", en: "Other" },
};

export const blockReasonLabels: LabelMap = {
  quarry_blasting: { de: "Sprengung Abbaubetrieb", en: "Quarry blasting" },
  quarry_operation: { de: "Abbaubetrieb", en: "Quarry operations" },
  maintenance: { de: "Wartung / Umbau", en: "Maintenance" },
  authority: { de: "Behördliche Auflage", en: "Authority requirement" },
  weather: { de: "Wetter", en: "Weather" },
  other: { de: "Sonstiges", en: "Other" },
};

export const invoiceStatusLabels: LabelMap = {
  draft: { de: "Entwurf", en: "Draft" },
  issued: { de: "Offen", en: "Open" },
  partially_paid: { de: "Teilbezahlt", en: "Partially paid" },
  paid: { de: "Bezahlt", en: "Paid" },
  cancelled: { de: "Storniert", en: "Cancelled" },
};

export const creditNoteStatusLabels: LabelMap = {
  draft: { de: "Entwurf", en: "Draft" },
  issued: { de: "Erstattung offen", en: "Refund open" },
  partially_paid: { de: "Teilweise erstattet", en: "Partially refunded" },
  paid: { de: "Ausgeglichen", en: "Settled" },
  cancelled: { de: "Storniert", en: "Cancelled" },
};

export const paymentMethodLabels: LabelMap = {
  transfer: { de: "Überweisung", en: "Bank transfer" },
  cash: { de: "Bar", en: "Cash" },
  card: { de: "Karte", en: "Card" },
  other: { de: "Sonstiges", en: "Other" },
};

export const rateUnitLabels: LabelMap = {
  hour: { de: "Stunde", en: "hour" },
  half_day: { de: "Halbtag", en: "half day" },
  day: { de: "Tag", en: "day" },
  month: { de: "Monat", en: "month" },
  flat: { de: "pauschal", en: "flat" },
  person_day: { de: "Personentag", en: "person day" },
};

export const severityLabels: LabelMap = {
  info: { de: "Information", en: "Information" },
  minor: { de: "Gering", en: "Minor" },
  major: { de: "Erheblich", en: "Major" },
  serious: { de: "Schwer", en: "Serious" },
};

export const inquiryTopicLabels: LabelMap = {
  testing: { de: "Testslot / Erprobung", en: "Test slot / trials" },
  training: { de: "Ausbildung & Zertifizierung", en: "Training & certification" },
  workshop: { de: "Container & Werkstatt", en: "Containers & workshop" },
  partnership: { de: "Kooperation / Forschung", en: "Partnership / research" },
  other: { de: "Sonstiges", en: "Other" },
};

export const inquiryStatusLabels: LabelMap = {
  new: { de: "Neu", en: "New" },
  in_progress: { de: "In Bearbeitung", en: "In progress" },
  done: { de: "Erledigt", en: "Done" },
  spam: { de: "Spam", en: "Spam" },
};

export const admissionStatusLabels: LabelMap = {
  pending: { de: "Zulassung offen", en: "Admission pending" },
  approved: { de: "Zugelassen", en: "Approved" },
  rejected: { de: "Abgelehnt", en: "Rejected" },
};

/** Zulassungsprüfung je Projekt (Kunde). */
export const admissionCheckLabels: LabelMap = {
  identity: { de: "Firmendaten und Ansprechpartner geprüft", en: "Company data and contact verified" },
  vat: { de: "UID-Nummer geprüft", en: "VAT ID verified" },
  sanctions: { de: "Sanktionslisten-Screening durchgeführt", en: "Sanctions list screening done" },
  end_use: { de: "Endverbleibserklärung liegt vor (falls erforderlich)", en: "End-use declaration on file (if required)" },
  terms: { de: "Nutzungsbedingungen akzeptiert", en: "Terms of use accepted" },
  insurance: { de: "Versicherungsnachweis liegt vor", en: "Proof of insurance on file" },
};

export function label(map: LabelMap, key: string | null | undefined, locale: Locale): string {
  if (!key) return "–";
  const entry = map[key];
  return entry ? entry[locale] : key;
}

export function options(map: LabelMap, locale: Locale): { value: string; label: string }[] {
  return Object.entries(map).map(([value, text]) => ({ value, label: text[locale] }));
}
