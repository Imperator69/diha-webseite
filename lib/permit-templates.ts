// Vorlage für das Genehmigungs- und Einreichungsregister. Allgemeine Verfahren nach
// öffentlichem Recht; der konkrete Zuschnitt wird im Portal ergänzt (Opt-in per Button).
export const permitTemplates: { title: string; titleEn: string; authority: string; kind: "permit" | "submission" | "notification" | "insurance" | "contract" | "other" }[] = [
  { title: "Standort- und Nutzungsvertrag mit Grundeigentümer", titleEn: "Site and land use agreement with landowner", authority: "landowner", kind: "contract" },
  {
    title: "Schriftliche Zustimmung zu Bewilligungsanträgen und Behördenbetretung",
    titleEn: "Written consent to permit applications and authority site access",
    authority: "landowner",
    kind: "contract",
  },
  { title: "Parzellenscharfe Katasterauskunft (Widmung, Bergbauwidmung)", titleEn: "Parcel-level land register information (zoning, mining designation)", authority: "other", kind: "other" },
  { title: "UAS-Betreiberregistrierung (Betreiber-ID)", titleEn: "UAS operator registration (operator ID)", authority: "austro_control", kind: "submission" },
  { title: "Pre-Application Meeting Drone Competence Center", titleEn: "Pre-application meeting Drone Competence Center", authority: "austro_control", kind: "notification" },
  { title: "Betriebsgenehmigung UAS, Kategorie „speziell“ (SORA)", titleEn: "UAS operational authorisation, specific category (SORA)", authority: "austro_control", kind: "permit" },
  { title: "Geo-Zone / Flugbeschränkungsgebiet", titleEn: "Geographical zone / flight restriction area", authority: "austro_control", kind: "permit" },
  { title: "Funkbewilligung Telemetrie, Steuerung, Messtechnik", titleEn: "Radio licence for telemetry, control, measurement", authority: "fernmeldebuero", kind: "permit" },
  { title: "Betriebsanlagengenehmigung (ortsfeste Einrichtungen)", titleEn: "Commercial facility permit (fixed installations)", authority: "bh_waidhofen", kind: "permit" },
  { title: "Abstimmung Gewinnungsbetriebsplan / Abgrenzung Abbaubetrieb", titleEn: "Alignment with extraction plan / separation from quarrying", authority: "montanbehoerde", kind: "submission" },
  { title: "Rodungsbewilligung bzw. -anzeige (§ 17 ForstG)", titleEn: "Clearing permit or notification (§ 17 Forest Act)", authority: "bh_waidhofen", kind: "permit" },
  { title: "Naturschutzrechtliches Screening", titleEn: "Nature conservation screening", authority: "land_noe", kind: "submission" },
  { title: "Evaluierung nach § 4 ASchG und Sicherheitsnachweis", titleEn: "Risk evaluation under § 4 ASchG and safety case", authority: "arbeitsinspektorat", kind: "other" },
  { title: "Einsatz- und Alarmplan mit Feuerwehr, Rettung, Polizei", titleEn: "Emergency and alarm plan with fire brigade, ambulance, police", authority: "other", kind: "other" },
  { title: "Versicherungsbestätigung (UAS-, Betriebs-, Umwelthaftpflicht)", titleEn: "Insurance confirmation (UAS, operational, environmental liability)", authority: "insurer", kind: "insurance" },
  { title: "Veranstaltungsanzeige für Demonstrationstage", titleEn: "Event notification for demonstration days", authority: "gemeinde_raabs", kind: "notification" },
];
