// Startdaten: indikative Zonen, Aktivitätskatalog, Slot-Vorlagen, Tarifpositionen.
// Nur öffentliche Rechtslage und Inhalte der Eibenstein-Präsentation, keine vertraulichen Projektdaten.
import type { ChecklistItem, ConditionalRequirement, DetailField, Point } from "@/db/schema";

export type SeedZone = {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  kind: "base" | "flight" | "robotics" | "energetics" | "water" | "workshop" | "buffer";
  color: string;
  polygon: Point[];
  bookable: boolean;
  publicVisible: boolean;
  capacity: number;
  sortOrder: number;
};

export const seedZones: SeedZone[] = [
  {
    id: "zone-z1",
    code: "Z-1",
    nameDe: "Betriebs- und Sicherheitsbasis",
    nameEn: "Operations and safety base",
    descDe: "Am Eingang: Zutrittskontrolle, Briefing, Range Safety und Erste Hilfe.",
    descEn: "At the entrance: access control, briefing, range safety and first aid.",
    kind: "base",
    color: "#1f3864",
    polygon: [
      [62, 586],
      [214, 560],
      [244, 650],
      [84, 676],
    ],
    bookable: true,
    publicVisible: true,
    capacity: 3,
    sortOrder: 1,
  },
  {
    id: "zone-z2",
    code: "Z-2",
    nameDe: "Flug- und Sensorflächen",
    nameEn: "Flight and sensor areas",
    descDe: "Robuste, vorhandene Arbeitsebenen für Flugbetrieb, Sensorik und Messungen.",
    descEn: "Existing, robust working levels for flight operations, sensors and measurements.",
    kind: "flight",
    color: "#2f6f8f",
    polygon: [
      [214, 186],
      [300, 128],
      [450, 104],
      [520, 168],
      [500, 262],
      [404, 318],
      [270, 312],
      [204, 252],
    ],
    bookable: true,
    publicVisible: true,
    capacity: 2,
    sortOrder: 2,
  },
  {
    id: "zone-z3",
    code: "Z-3",
    nameDe: "Robotik- und Erprobungsroute",
    nameEn: "Robotics and test route",
    descDe: "Entlang geeigneter bestehender Fahrwege, für Bodenrobotik und Fahrversuche.",
    descEn: "Along suitable existing haul roads, for ground robotics and driving trials.",
    kind: "robotics",
    color: "#a0731b",
    polygon: [
      [262, 548],
      [356, 500],
      [452, 436],
      [530, 360],
      [584, 296],
      [622, 318],
      [572, 392],
      [490, 470],
      [392, 534],
      [296, 584],
    ],
    bookable: true,
    publicVisible: true,
    capacity: 1,
    sortOrder: 3,
  },
  {
    id: "zone-z4",
    code: "Z-4",
    nameDe: "Bodentest-Zone mit Wirkmittel",
    nameEn: "Ground test zone with energetics",
    descDe: "Abgesetzter Bereich mit gesondertem Zugang. Nur mit Sprengbefugten vor Ort und behördlicher Grundlage.",
    descEn: "Separate area with dedicated access. Only with a licensed blaster on site and the required authorisations.",
    kind: "energetics",
    color: "#c8102e",
    polygon: [
      [748, 230],
      [856, 206],
      [906, 290],
      [866, 368],
      [774, 362],
      [734, 298],
    ],
    bookable: true,
    publicVisible: false,
    capacity: 1,
    sortOrder: 4,
  },
  {
    id: "zone-z5",
    code: "Z-5",
    nameDe: "Wasser- und Wettertests",
    nameEn: "Water and weather tests",
    descDe: "Nur in abgestimmten, dafür geeigneten Bereichen der Wasserfläche.",
    descEn: "Only in agreed, suitable parts of the water body.",
    kind: "water",
    color: "#2a7ab0",
    polygon: [
      [632, 452],
      [712, 418],
      [796, 436],
      [828, 494],
      [778, 546],
      [688, 552],
      [636, 508],
    ],
    bookable: true,
    publicVisible: true,
    capacity: 1,
    sortOrder: 5,
  },
  {
    id: "zone-z6",
    code: "Z-6",
    nameDe: "Container und Werkstatt",
    nameEn: "Containers and workshop",
    descDe: "Mobile Werkstatt- und Büromodule für Prototypenbau und Vorbereitung.",
    descEn: "Mobile workshop and office modules for prototyping and preparation.",
    kind: "workshop",
    color: "#4f5b6b",
    polygon: [
      [226, 528],
      [338, 508],
      [356, 586],
      [252, 610],
    ],
    bookable: true,
    publicVisible: true,
    capacity: 4,
    sortOrder: 6,
  },
  {
    id: "zone-z7",
    code: "Z-7",
    nameDe: "Schutz- und Pufferbereich",
    nameEn: "Safety buffer",
    descDe: "Nicht buchbar. Abstand zum aktiven Abbaubetrieb und zu Nachbarflächen.",
    descEn: "Not bookable. Separation from active quarry operations and neighbouring land.",
    kind: "buffer",
    color: "#7f7f7f",
    polygon: [
      [560, 96],
      [740, 78],
      [870, 140],
      [884, 196],
      [744, 214],
      [600, 204],
      [552, 152],
    ],
    bookable: false,
    publicVisible: true,
    capacity: 0,
    sortOrder: 7,
  },
];

export type SeedActivity = {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  category: "workshop" | "flight" | "ground" | "energetics" | "sensor" | "training" | "event" | "water";
  allowedZoneKinds: string[];
  requiredRoles: string[];
  requiredDocs: string[];
  conditional: ConditionalRequirement[];
  conflictsWith: string[];
  detailFields: DetailField[];
  checklist: ChecklistItem[];
  leadDays: number;
  requiresSiteClearance: boolean;
  sortOrder: number;
};

const uasFields: DetailField[] = [
  { key: "uas_model", type: "text", de: "UAS-Typ / Modell", en: "UAS type / model", required: true },
  { key: "mtom_kg", type: "number", de: "Startmasse (MTOM)", en: "Take-off mass (MTOM)", unit: "kg", required: true, min: 0, max: 25 },
  { key: "max_height_m", type: "number", de: "Maximale Flughöhe über Grund", en: "Maximum height above ground", unit: "m", required: true, min: 0 },
  {
    key: "operator_country",
    type: "select",
    de: "Registrierungsstaat des Betreibers",
    en: "Operator's state of registration",
    required: true,
    options: [
      { value: "AT", de: "Österreich", en: "Austria" },
      { value: "EU", de: "Anderer EU-/EASA-Staat", en: "Other EU/EASA state" },
    ],
  },
  { key: "operator_id", type: "text", de: "Betreiber-ID", en: "Operator ID", required: true },
];

export const seedActivities: SeedActivity[] = [
  {
    id: "act-workshop",
    code: "workshop",
    nameDe: "Container & Werkstatt (Prototypenbau)",
    nameEn: "Containers & workshop (prototyping)",
    descDe: "Nutzung von Werkstatt- und Büromodulen, z. B. für Aufbau, Integration und Wartung.",
    descEn: "Use of workshop and office modules, e.g. for assembly, integration and maintenance.",
    category: "workshop",
    allowedZoneKinds: ["workshop"],
    requiredRoles: ["project_lead"],
    requiredDocs: [],
    conditional: [{ field: "hazardous_materials", equals: true, doc: "hazmat_declaration" }],
    conflictsWith: [],
    detailFields: [
      { key: "modules", type: "number", de: "Anzahl Module", en: "Number of modules", required: true, min: 1, max: 4 },
      { key: "work_description", type: "textarea", de: "Geplante Arbeiten", en: "Planned work", required: true },
      { key: "hazardous_materials", type: "boolean", de: "Gefahrstoffe (z. B. Akkus, Kraftstoffe) im Einsatz", en: "Hazardous materials in use (e.g. batteries, fuels)" },
      { key: "power_kw", type: "number", de: "Strombedarf", en: "Power demand", unit: "kW", min: 0 },
    ],
    checklist: [{ key: "fire_briefing", de: "Brandschutz-Einweisung erfolgt", en: "Fire safety briefing done" }],
    leadDays: 2,
    requiresSiteClearance: false,
    sortOrder: 1,
  },
  {
    id: "act-flight-open",
    code: "flight_open",
    nameDe: "UAS-Flug (offene Kategorie)",
    nameEn: "UAS flight (open category)",
    descDe: "Flüge in Sichtweite (VLOS) bis 120 m, ohne Abwurf, nach VO (EU) 2019/947.",
    descEn: "Flights within visual line of sight (VLOS) up to 120 m, no dropping, under Regulation (EU) 2019/947.",
    category: "flight",
    allowedZoneKinds: ["flight", "robotics", "water"],
    requiredRoles: ["project_lead", "remote_pilot"],
    requiredDocs: ["operator_registration", "pilot_competency", "insurance"],
    conditional: [],
    conflictsWith: ["energetics"],
    detailFields: [
      ...uasFields.map((f) => (f.key === "max_height_m" ? { ...f, max: 120 } : f)),
      {
        key: "subcategory",
        type: "select",
        de: "Unterkategorie",
        en: "Subcategory",
        required: true,
        options: [
          { value: "A1", de: "A1", en: "A1" },
          { value: "A2", de: "A2", en: "A2" },
          { value: "A3", de: "A3", en: "A3" },
        ],
      },
    ],
    checklist: [
      { key: "airspace_check", de: "Luftraum und Geo-Zonen geprüft", en: "Airspace and geo-zones checked" },
      { key: "ground_area_secured", de: "Bodenabsperrbereich eingerichtet", en: "Ground safety area set up" },
    ],
    leadDays: 3,
    requiresSiteClearance: false,
    sortOrder: 2,
  },
  {
    id: "act-flight-specific",
    code: "flight_specific",
    nameDe: "UAS-Flug (spezielle Kategorie)",
    nameEn: "UAS flight (specific category)",
    descDe: "Z. B. BVLOS oder Abwurf inerter Lasten. Abwurf ist in der offenen Kategorie unzulässig (Art. 4 VO (EU) 2019/947).",
    descEn: "E.g. BVLOS or dropping inert payloads. Dropping is not permitted in the open category (Art. 4 Regulation (EU) 2019/947).",
    category: "flight",
    allowedZoneKinds: ["flight", "robotics", "water"],
    requiredRoles: ["project_lead", "remote_pilot"],
    requiredDocs: ["operator_registration", "pilot_competency", "operation_authorisation", "insurance"],
    conditional: [],
    conflictsWith: ["energetics"],
    detailFields: [
      ...uasFields,
      {
        key: "operation_mode",
        type: "select",
        de: "Betriebsart",
        en: "Mode of operation",
        required: true,
        options: [
          { value: "VLOS", de: "VLOS (Sichtweite)", en: "VLOS" },
          { value: "EVLOS", de: "EVLOS (erweiterte Sichtweite)", en: "EVLOS" },
          { value: "BVLOS", de: "BVLOS (außer Sichtweite)", en: "BVLOS" },
        ],
      },
      { key: "inert_drop", type: "boolean", de: "Abwurf inerter Lasten", en: "Dropping of inert payloads" },
      { key: "drop_mass_kg", type: "number", de: "Masse je Abwurf", en: "Mass per drop", unit: "kg", min: 0 },
      { key: "authorisation_ref", type: "text", de: "Aktenzahl Betriebsgenehmigung / STS / Art. 13", en: "Reference of authorisation / STS / Art. 13", required: true },
    ],
    checklist: [
      { key: "authorisation_valid", de: "Betriebsgenehmigung deckt Betriebsart und Standort", en: "Authorisation covers mode of operation and site" },
      { key: "airspace_check", de: "Luftraum und Geo-Zonen geprüft", en: "Airspace and geo-zones checked" },
      { key: "ground_area_secured", de: "Bodenabsperrbereich und Abwurfzone markiert", en: "Ground safety area and drop zone marked" },
    ],
    leadDays: 10,
    requiresSiteClearance: false,
    sortOrder: 3,
  },
  {
    id: "act-ground-robotics",
    code: "ground_robotics",
    nameDe: "Bodentest Robotik / UGV",
    nameEn: "Ground test robotics / UGV",
    descDe: "Fahr- und Funktionstests unbemannter Bodenfahrzeuge im Gelände.",
    descEn: "Driving and functional tests of unmanned ground vehicles in the terrain.",
    category: "ground",
    allowedZoneKinds: ["robotics", "flight"],
    requiredRoles: ["project_lead", "safety_officer"],
    requiredDocs: ["risk_assessment"],
    conditional: [],
    conflictsWith: [],
    detailFields: [
      { key: "vehicle_type", type: "text", de: "Fahrzeug / System", en: "Vehicle / system", required: true },
      { key: "mass_kg", type: "number", de: "Masse", en: "Mass", unit: "kg", required: true, min: 0 },
      { key: "max_speed_kmh", type: "number", de: "Höchstgeschwindigkeit", en: "Maximum speed", unit: "km/h", required: true, min: 0 },
      { key: "remote_controlled", type: "boolean", de: "Ferngesteuert / autonom", en: "Remote-controlled / autonomous" },
    ],
    checklist: [{ key: "route_cleared", de: "Route freigegeben, kein Abbauverkehr", en: "Route cleared, no quarry traffic" }],
    leadDays: 3,
    requiresSiteClearance: false,
    sortOrder: 4,
  },
  {
    id: "act-ground-energetics",
    code: "ground_energetics",
    nameDe: "Bodentest mit Wirkmittel",
    nameEn: "Ground test with energetics",
    descDe: "Statische Tests am Boden. Jede Sprengung erfordert eine:n Sprengbefugte:n vor Ort und einen Sprengplan.",
    descEn: "Static ground tests. Every detonation requires a licensed blaster on site and a blasting plan.",
    category: "energetics",
    allowedZoneKinds: ["energetics"],
    requiredRoles: ["project_lead", "blaster", "safety_officer"],
    requiredDocs: ["blasting_plan", "blaster_license", "explosives_permit", "risk_assessment", "insurance"],
    conditional: [],
    conflictsWith: ["flight", "event", "training"],
    detailFields: [
      { key: "agent_description", type: "textarea", de: "Wirkmittel und Versuchsaufbau", en: "Energetic material and test set-up", required: true },
      { key: "net_mass_kg", type: "number", de: "Nettoexplosivstoffmasse je Versuch", en: "Net explosive mass per test", unit: "kg", required: true, min: 0 },
      { key: "tests_count", type: "number", de: "Anzahl Versuche", en: "Number of tests", required: true, min: 1 },
      { key: "transport_by", type: "text", de: "Anlieferung durch (Beförderer)", en: "Delivered by (carrier)", required: true },
    ],
    checklist: [
      { key: "blasting_plan_reviewed", de: "Sprengplan geprüft", en: "Blasting plan reviewed" },
      { key: "blaster_verified", de: "Sprengbefugnis der Person vor Ort geprüft", en: "On-site blaster's licence verified" },
      { key: "quarry_operator_informed", de: "Abbaubetreiber informiert, keine parallele Sprengung", en: "Quarry operator informed, no parallel blasting" },
      { key: "emergency_services", de: "Einsatzplan aktiv, Einsatzorganisationen verständigt", en: "Emergency plan active, emergency services notified" },
      { key: "exclusion_zone", de: "Absperrung gemäß Gutachten/Sprengplan eingerichtet", en: "Exclusion zone set up per expert opinion / blasting plan" },
    ],
    leadDays: 14,
    requiresSiteClearance: true,
    sortOrder: 5,
  },
  {
    id: "act-sensor",
    code: "sensor_passive",
    nameDe: "Sensorik & Messungen",
    nameEn: "Sensors & measurements",
    descDe: "Passive Detektion, Peilung, Signatur- und Umweltmessungen.",
    descEn: "Passive detection, direction finding, signature and environmental measurements.",
    category: "sensor",
    allowedZoneKinds: ["flight", "base", "robotics"],
    requiredRoles: ["project_lead"],
    requiredDocs: [],
    conditional: [{ field: "transmits", equals: true, doc: "radio_license" }],
    conflictsWith: [],
    detailFields: [
      { key: "equipment", type: "textarea", de: "Messtechnik", en: "Equipment", required: true },
      { key: "transmits", type: "boolean", de: "Gerät sendet aktiv (Funk)", en: "Equipment actively transmits (radio)" },
      { key: "frequencies", type: "text", de: "Frequenzbereiche", en: "Frequency ranges" },
    ],
    checklist: [{ key: "frequency_check", de: "Frequenznutzung geprüft", en: "Frequency use checked" }],
    leadDays: 5,
    requiresSiteClearance: false,
    sortOrder: 6,
  },
  {
    id: "act-training",
    code: "training",
    nameDe: "Ausbildung & Schulung",
    nameEn: "Training & courses",
    descDe: "Kurse, Prüfungs- und Nachweistage mit anerkannten Stellen.",
    descEn: "Courses, examination and proficiency days with recognised bodies.",
    category: "training",
    allowedZoneKinds: ["base", "flight"],
    requiredRoles: ["project_lead", "instructor"],
    requiredDocs: ["participant_list"],
    conditional: [],
    conflictsWith: [],
    detailFields: [
      { key: "course_title", type: "text", de: "Kurs / Format", en: "Course / format", required: true },
      { key: "certifying_body", type: "text", de: "Prüf-/Ausbildungsstelle", en: "Examining / training body" },
    ],
    checklist: [{ key: "briefing", de: "Sicherheitsbriefing für Teilnehmende", en: "Safety briefing for participants" }],
    leadDays: 7,
    requiresSiteClearance: false,
    sortOrder: 7,
  },
  {
    id: "act-demo",
    code: "demo_event",
    nameDe: "Demonstration mit Gästen",
    nameEn: "Demonstration with guests",
    descDe: "Vorführungen für Betriebe, Behörden, Forschung. Namentliche Registrierung aller Gäste.",
    descEn: "Demonstrations for companies, authorities and research. All guests registered by name.",
    category: "event",
    allowedZoneKinds: ["base", "flight", "robotics", "water"],
    requiredRoles: ["project_lead", "safety_officer", "first_aider"],
    requiredDocs: ["participant_list", "risk_assessment"],
    conditional: [{ field: "public_event", equals: true, doc: "event_notice" }],
    conflictsWith: ["energetics"],
    detailFields: [
      { key: "programme", type: "textarea", de: "Programm", en: "Programme", required: true },
      { key: "public_event", type: "boolean", de: "Veranstaltung mit Publikum (anzeigepflichtig)", en: "Event open to the public (notification required)" },
    ],
    checklist: [
      { key: "guest_list", de: "Gästeliste vollständig, Begleitung organisiert", en: "Guest list complete, escorts organised" },
      { key: "emergency_services", de: "Sanitäts-/Brandwache geklärt", en: "Medical/fire watch arranged" },
    ],
    leadDays: 14,
    requiresSiteClearance: false,
    sortOrder: 8,
  },
  {
    id: "act-water",
    code: "water_weather",
    nameDe: "Wasser- & Wettertests",
    nameEn: "Water & weather tests",
    descDe: "Tests auf oder an der Wasserfläche, z. B. Dichtheit, Bergung, Wetterbeständigkeit.",
    descEn: "Tests on or at the water body, e.g. waterproofing, recovery, weather resistance.",
    category: "water",
    allowedZoneKinds: ["water"],
    requiredRoles: ["project_lead", "safety_officer"],
    requiredDocs: ["risk_assessment"],
    conditional: [],
    conflictsWith: [],
    detailFields: [{ key: "test_description", type: "textarea", de: "Versuchsbeschreibung", en: "Test description", required: true }],
    checklist: [{ key: "water_safety", de: "Wasserrettungsmittel bereit", en: "Water rescue equipment ready" }],
    leadDays: 5,
    requiresSiteClearance: false,
    sortOrder: 9,
  },
];

export const seedSlots = [
  { id: "slot-am", nameDe: "Vormittag", nameEn: "Morning", startTime: "08:00", endTime: "12:00", weekdays: [1, 2, 3, 4, 5], sortOrder: 1 },
  { id: "slot-pm", nameDe: "Nachmittag", nameEn: "Afternoon", startTime: "13:00", endTime: "17:00", weekdays: [1, 2, 3, 4, 5], sortOrder: 2 },
  { id: "slot-sat", nameDe: "Samstag Vormittag", nameEn: "Saturday morning", startTime: "08:00", endTime: "12:00", weekdays: [6], sortOrder: 3 },
];

// Preise sind noch nicht festgelegt: 0 € bedeutet „auf Anfrage“.
export const seedRates = [
  { id: "rate-zone-halfday", code: "zone_half_day", nameDe: "Geländenutzung je Zone, Halbtag", nameEn: "Site use per zone, half day", unit: "half_day", basis: "zone", sortOrder: 1 },
  { id: "rate-workshop-month", code: "workshop_month", nameDe: "Werkstatt-/Containermodul, Monat", nameEn: "Workshop/container module, month", unit: "month", activityCode: "workshop", sortOrder: 2 },
  { id: "rate-range-safety", code: "range_safety", nameDe: "Range Safety / Sicherheitspersonal, Halbtag", nameEn: "Range safety staff, half day", unit: "half_day", sortOrder: 3 },
  { id: "rate-energetics", code: "energetics_surcharge", nameDe: "Zuschlag Wirkmittel-Testtag", nameEn: "Energetics test day surcharge", unit: "day", activityCode: "ground_energetics", sortOrder: 4 },
];
