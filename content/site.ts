// Inhalte der Landingpage (DE/EN). Testmöglichkeiten sind bewusst als Platzhalter angelegt
// und werden ergänzt, sobald das Leistungsangebot feststeht.
import type { Locale } from "@/lib/i18n/config";

export type SiteContent = {
  meta: { title: string; description: string; keywords: string[] };
  nav: { services: string; site: string; tests: string; process: string; location: string; contact: string; login: string };
  hero: { eyebrow: string; title: string; claim: string; lead: string; ctaPrimary: string; ctaSecondary: string; badges: string[] };
  facts: { value: string; label: string; note?: string }[];
  services: { title: string; intro: string; items: { title: string; text: string }[] };
  site: { title: string; intro: string; disclaimer: string };
  tests: { title: string; intro: string; soon: string; items: { title: string; text: string }[] };
  fields: { title: string; intro: string; items: string[] };
  process: { title: string; intro: string; steps: { title: string; text: string }[] };
  location: { title: string; text: string; address: string[]; points: string[] };
  about: { title: string; text: string[] };
  faq: { title: string; items: { q: string; a: string }[] };
  contact: { title: string; intro: string };
  footer: { tagline: string; imprint: string; privacy: string; rights: string };
};

const de: SiteContent = {
  meta: {
    title: "DIHA Testzentrum Eibenstein – Drohnen- und Robotik-Testgelände in Niederösterreich",
    description:
      "Testgelände für Drohnen, Sensorik und Bodenrobotik im Steinbruch Eibenstein an der Thaya (Waldviertel, Niederösterreich): Ausbildung, Zertifizierung, Erprobung und Demonstration. Testslots online anfragen.",
    keywords: [
      "Drohnen Testgelände Österreich",
      "Drohnentestzentrum Niederösterreich",
      "UAS Testfeld",
      "Bodenrobotik Test",
      "Drohnen Ausbildung Waldviertel",
      "Eibenstein an der Thaya",
      "DIHA",
    ],
  },
  nav: { services: "Leistungen", site: "Gelände", tests: "Testmöglichkeiten", process: "Ablauf", location: "Standort", contact: "Kontakt", login: "Portal-Login" },
  hero: {
    eyebrow: "Testzentrum Eibenstein · Waldviertel",
    title: "Testzentrum für Drohnen und Robotik in Eibenstein, Niederösterreich",
    claim: "Heute testen. Morgen sichern.",
    lead: "Ein kontrolliertes Gelände mit realer Topografie, Fahrwegen und Wasserflächen: für Ausbildung, Zertifizierung, Erprobung und Demonstration von Drohnen, Sensorik und Bodenrobotik.",
    ctaPrimary: "Testslot anfragen",
    ctaSecondary: "Gelände erkunden",
    badges: ["Drohnen (UAS)", "Bodenrobotik (UGV)", "Sensorik", "Werkstatt & Container"],
  },
  facts: [
    { value: "ca. 25 ha", label: "Flächenrahmen", note: "indikativ, Abgrenzung in Detailplanung" },
    { value: "bis 64 m", label: "Geländerelief", note: "mehrere Arbeitsebenen, natürliche Abschirmung" },
    { value: "vorhanden", label: "Zufahrt, Fahrwege, Wasserflächen", note: "keine Neuerschließung nötig" },
    { value: "EU 2019/947", label: "Rechtsrahmen Flugbetrieb", note: "unter Aufsicht von Austro Control" },
  ],
  services: {
    title: "Vier Leistungen, ein Gelände",
    intro: "Der Schwerpunkt liegt auf Menschen und Systemen, nicht auf Beton: ausbilden, prüfen, erproben, zeigen.",
    items: [
      { title: "Ausbilden", text: "Fernpilot:innen, Techniker:innen und Einsatzorganisationen in geregelten Formaten trainieren." },
      { title: "Zertifizieren", text: "Prüfungs-, Nachweis- und Rezertifizierungstage gemeinsam mit anerkannten Prüfstellen." },
      { title: "Erproben", text: "Drohnen, Sensoren und Bodenrobotik unter realen Gelände- und Wetterbedingungen testen." },
      { title: "Demonstrieren", text: "Lösungen Betrieben, Gemeinden, Behörden und Forschung praxisnah vorführen." },
    ],
  },
  site: {
    title: "Das Gelände",
    intro: "Wenige, klar definierte Bereiche innerhalb eines kontrollierten Areals. Wählen Sie einen Bereich, um ihn näher anzusehen.",
    disclaimer: "Indikative Darstellung, keine vermessenen Grenzen. Der Abbaubetrieb des Steinbruchs läuft räumlich und zeitlich getrennt weiter.",
  },
  tests: {
    title: "Testmöglichkeiten",
    intro: "Das konkrete Leistungsangebot wird derzeit festgelegt. Die folgenden Bereiche sind geplant.",
    soon: "Details folgen",
    items: [
      { title: "Flugtests", text: "Flüge in der offenen und speziellen Kategorie auf abgegrenzten Arbeitsebenen." },
      { title: "Bodenrobotik", text: "Fahr- und Funktionstests auf Fahrwegen und unebenem Gelände." },
      { title: "Sensorik & Messungen", text: "Detektion, Peilung, Signatur- und Umweltmessungen im Relief." },
      { title: "Werkstatt & Container", text: "Module für Prototypenbau, Integration und Vorbereitung vor Ort." },
      { title: "Ausbildung & Prüfung", text: "Kurse und Nachweistage für Fernpilot:innen und Einsatzkräfte." },
      { title: "Wasser & Wetter", text: "Tests an der Wasserfläche und unter realen Witterungsbedingungen." },
    ],
  },
  fields: {
    title: "Anwendungsfelder",
    intro: "Was hier geübt und getestet wird, kommt direkt in der Praxis an.",
    items: ["Landwirtschaft", "Forst", "Katastrophenschutz", "Infrastruktur", "Vermessung", "Industrie", "Energie & Netze"],
  },
  process: {
    title: "So läuft eine Buchung",
    intro: "Projekte buchen ihre Testslots im Portal. Wir prüfen Unterlagen und Sicherheit, bevor ein Termin bestätigt wird.",
    steps: [
      { title: "Anfrage", text: "Nutzungsart, Bereich und Wunschtermin im Portal wählen oder über das Kontaktformular anfragen." },
      { title: "Prüfung", text: "Wir prüfen Verantwortliche, Nachweise und Genehmigungen und stimmen Sicherheitsbereiche ab." },
      { title: "Bestätigung", text: "Nach der Prüfung wird der Slot verbindlich bestätigt, inklusive Ablauf und Zutrittsregelung." },
      { title: "Test", text: "Durchführung mit Briefing vor Ort, Range Safety und dokumentiertem Abschluss." },
    ],
  },
  location: {
    title: "Standort Eibenstein an der Thaya",
    text: "Das Testzentrum liegt im Steinbruch Eibenstein in der Stadtgemeinde Raabs an der Thaya im Waldviertel. Ein bestehendes Industrieareal statt unberührter Grünfläche: Die Nutzung ist eine Erweiterung, keine Neuerschließung.",
    address: ["Steinbruch Eibenstein", "Stadtgemeinde Raabs an der Thaya", "Niederösterreich, Österreich"],
    points: ["Bezirk Waidhofen an der Thaya", "Relief hält Sicht und Geräusch weitgehend in der Mulde", "Abstand zur Wohnbebauung"],
  },
  about: {
    title: "Über DIHA",
    text: [
      "DIHA – Drone Innovation Hub Austria ist ein Unternehmen der AEEG. Wir betreiben das Testzentrum Eibenstein als kontrollierten Ort für Ausbildung, Erprobung und Innovation.",
      "Wir arbeiten mit Hochschulen, Unternehmen und regionalen Einrichtungen zusammen und öffnen jungen Technologieunternehmen planbare Testtage statt monatelanger Suche nach einem Gelände.",
    ],
  },
  faq: {
    title: "Häufige Fragen",
    items: [
      {
        q: "Wer kann Testslots buchen?",
        a: "Unternehmen, Forschungseinrichtungen, Ausbildungsstellen und Einsatzorganisationen. Nach einer kurzen Zulassungsprüfung erhalten Projekte einen Zugang zum Buchungsportal.",
      },
      {
        q: "Brauche ich eine eigene Betriebsgenehmigung für Drohnenflüge?",
        a: "Das hängt von der Betriebsart ab. Für Flüge in der offenen Kategorie genügen Registrierung, Kompetenznachweis und Versicherung. Für die spezielle Kategorie (z. B. BVLOS oder Abwurf) ist eine Betriebsgenehmigung, eine STS-Erklärung oder bei EU-ausländischen Betreibern eine Bestätigung nach Art. 13 VO (EU) 2019/947 nötig.",
      },
      {
        q: "Kann ich nur die Werkstatt oder die Container nutzen?",
        a: "Ja. Werkstatt- und Containermodule sind einzeln buchbar, zum Beispiel für Prototypenbau oder als Basis für mehrtägige Kampagnen.",
      },
      {
        q: "Wie weit im Voraus muss ich buchen?",
        a: "Die Vorlaufzeit hängt von der Testart ab und liegt zwischen wenigen Tagen und mehreren Wochen. Das Portal zeigt sie bei jeder Nutzungsart an.",
      },
      {
        q: "Läuft der Steinbruchbetrieb weiter?",
        a: "Ja. Testbetrieb und Abbau sind räumlich und zeitlich getrennt. Sperrzeiten des Abbaubetriebs sind im Buchungskalender berücksichtigt.",
      },
    ],
  },
  contact: {
    title: "Kontakt",
    intro: "Sie planen Tests, Schulungen oder eine Demonstration? Schreiben Sie uns, wir melden uns zeitnah.",
  },
  footer: {
    tagline: "Testzentrum für Drohnen und Robotik in Eibenstein, Niederösterreich.",
    imprint: "Impressum",
    privacy: "Datenschutz",
    rights: "Alle Rechte vorbehalten.",
  },
};

const en: SiteContent = {
  meta: {
    title: "DIHA Test Centre Eibenstein – Drone and robotics test site in Lower Austria",
    description:
      "Test site for drones, sensors and ground robotics in the Eibenstein quarry near Raabs an der Thaya (Waldviertel, Lower Austria): training, certification, trials and demonstrations. Request test slots online.",
    keywords: ["drone test site Austria", "UAS test range Europe", "ground robotics testing", "drone training Lower Austria", "Eibenstein", "DIHA"],
  },
  nav: { services: "Services", site: "Site", tests: "Testing", process: "Process", location: "Location", contact: "Contact", login: "Portal login" },
  hero: {
    eyebrow: "Eibenstein Test Centre · Waldviertel",
    title: "Test centre for drones and robotics in Eibenstein, Lower Austria",
    claim: "Test today. Secure tomorrow.",
    lead: "A controlled site with real topography, haul roads and water bodies: for training, certification, trials and demonstrations of drones, sensors and ground robotics.",
    ctaPrimary: "Request a test slot",
    ctaSecondary: "Explore the site",
    badges: ["Drones (UAS)", "Ground robotics (UGV)", "Sensors", "Workshop & containers"],
  },
  facts: [
    { value: "approx. 25 ha", label: "Site framework", note: "indicative, boundaries in detailed planning" },
    { value: "up to 64 m", label: "Terrain relief", note: "several working levels, natural shielding" },
    { value: "in place", label: "Access, haul roads, water bodies", note: "no new development required" },
    { value: "EU 2019/947", label: "Legal framework for flights", note: "supervised by Austro Control" },
  ],
  services: {
    title: "Four services, one site",
    intro: "The focus is on people and systems, not on concrete: train, certify, test, demonstrate.",
    items: [
      { title: "Train", text: "Train remote pilots, technicians and emergency services in structured formats." },
      { title: "Certify", text: "Examination, proficiency and recertification days with recognised bodies." },
      { title: "Test", text: "Test drones, sensors and ground robotics under real terrain and weather conditions." },
      { title: "Demonstrate", text: "Show solutions to companies, municipalities, authorities and research in practice." },
    ],
  },
  site: {
    title: "The site",
    intro: "A few clearly defined areas within a controlled perimeter. Select an area to take a closer look.",
    disclaimer: "Indicative illustration, no surveyed boundaries. Quarry operations continue, separated in space and time.",
  },
  tests: {
    title: "Testing capabilities",
    intro: "The detailed service offering is currently being defined. The following areas are planned.",
    soon: "Details to follow",
    items: [
      { title: "Flight tests", text: "Flights in the open and specific categories on dedicated working levels." },
      { title: "Ground robotics", text: "Driving and functional tests on haul roads and rough terrain." },
      { title: "Sensors & measurements", text: "Detection, direction finding, signature and environmental measurements." },
      { title: "Workshop & containers", text: "Modules for prototyping, integration and on-site preparation." },
      { title: "Training & examination", text: "Courses and proficiency days for remote pilots and responders." },
      { title: "Water & weather", text: "Tests at the water body and under real weather conditions." },
    ],
  },
  fields: {
    title: "Fields of application",
    intro: "What is practised and tested here goes straight into real-world use.",
    items: ["Agriculture", "Forestry", "Civil protection", "Infrastructure", "Surveying", "Industry", "Energy & grids"],
  },
  process: {
    title: "How booking works",
    intro: "Projects book their test slots in the portal. We review documents and safety before a slot is confirmed.",
    steps: [
      { title: "Request", text: "Choose the type of use, area and preferred date in the portal, or send us a request." },
      { title: "Review", text: "We check responsible persons, documents and permits and agree on safety areas." },
      { title: "Confirmation", text: "After review the slot is confirmed, including schedule and access rules." },
      { title: "Test", text: "On-site briefing, range safety and a documented close-out." },
    ],
  },
  location: {
    title: "Location Eibenstein an der Thaya",
    text: "The test centre is located in the Eibenstein quarry in the municipality of Raabs an der Thaya in the Waldviertel region. An existing industrial site rather than untouched green land: the use is an extension, not new development.",
    address: ["Eibenstein quarry", "Municipality of Raabs an der Thaya", "Lower Austria, Austria"],
    points: ["District of Waidhofen an der Thaya", "The relief keeps sight and sound largely within the basin", "Distance to residential areas"],
  },
  about: {
    title: "About DIHA",
    text: [
      "DIHA – Drone Innovation Hub Austria is a company by AEEG. We operate the Eibenstein test centre as a controlled place for training, trials and innovation.",
      "We work with universities, companies and regional institutions and offer young technology companies predictable test days instead of a months-long search for a site.",
    ],
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Who can book test slots?",
        a: "Companies, research institutions, training providers and emergency services. After a short admission check, projects receive access to the booking portal.",
      },
      {
        q: "Do I need my own operational authorisation for drone flights?",
        a: "It depends on the mode of operation. Flights in the open category require registration, a competency certificate and insurance. The specific category (e.g. BVLOS or dropping) requires an operational authorisation, an STS declaration or, for operators from other EU states, a confirmation under Art. 13 of Regulation (EU) 2019/947.",
      },
      {
        q: "Can I use only the workshop or the containers?",
        a: "Yes. Workshop and container modules can be booked individually, for example for prototyping or as a base for multi-day campaigns.",
      },
      {
        q: "How far in advance do I need to book?",
        a: "Lead times depend on the type of test and range from a few days to several weeks. The portal shows the lead time for every type of use.",
      },
      {
        q: "Do quarry operations continue?",
        a: "Yes. Testing and quarrying are separated in space and time. Quarry blackout periods are reflected in the booking calendar.",
      },
    ],
  },
  contact: {
    title: "Contact",
    intro: "Planning tests, training or a demonstration? Write to us and we will get back to you shortly.",
  },
  footer: {
    tagline: "Test centre for drones and robotics in Eibenstein, Lower Austria.",
    imprint: "Imprint",
    privacy: "Privacy",
    rights: "All rights reserved.",
  },
};

export function siteContent(locale: Locale): SiteContent {
  return locale === "en" ? en : de;
}
