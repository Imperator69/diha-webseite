// Rechtstexte. Platzhalter „tba“ werden ersetzt, sobald die Firmendaten der DIHA GmbH feststehen.
// Hinweis: Vorlage, keine Rechtsberatung. Vor Livegang rechtlich prüfen lassen.
import type { Locale } from "@/lib/i18n/config";

export type LegalSection = { heading: string; paragraphs: string[]; list?: string[] };
export type LegalPage = { title: string; description: string; updated: string; sections: LegalSection[] };

const imprintDe: LegalPage = {
  title: "Impressum",
  description: "Offenlegung und Angaben gemäß § 5 ECG, § 14 UGB und § 25 MedienG.",
  updated: "Stand: tba",
  sections: [
    {
      heading: "Medieninhaber und Diensteanbieter",
      paragraphs: ["DIHA GmbH (in Gründung)", "Anschrift: tba", "E-Mail: tba", "Telefon: tba"],
    },
    {
      heading: "Unternehmensangaben",
      paragraphs: [
        "Rechtsform: Gesellschaft mit beschränkter Haftung (in Gründung)",
        "Firmenbuchnummer: tba",
        "Firmenbuchgericht: tba",
        "Sitz: tba",
        "UID-Nummer: tba",
        "Geschäftsführung: tba",
        "Unternehmensgegenstand: Betrieb eines Test- und Ausbildungszentrums für Drohnen, Sensorik und Bodenrobotik",
        "Mitglied der Wirtschaftskammer: tba",
        "Aufsichtsbehörde / Gewerbebehörde: tba",
      ],
    },
    {
      heading: "Offenlegung nach § 25 MedienG",
      paragraphs: [
        "Grundlegende Richtung: Information über das Testzentrum Eibenstein, seine Leistungen und die Buchung von Testslots.",
        "Eigentumsverhältnisse: DIHA – Drone Innovation Hub Austria ist ein Unternehmen der AEEG. Beteiligungsverhältnisse: tba.",
      ],
    },
    {
      heading: "Haftung für Inhalte und Links",
      paragraphs: [
        "Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und Aktualität übernehmen wir keine Gewähr. Angaben zum Gelände sind indikativ und ersetzen keine vermessenen Pläne oder behördlichen Bewilligungen.",
        "Für Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich.",
      ],
    },
    {
      heading: "Urheberrecht",
      paragraphs: [
        "Texte, Grafiken und das DIHA-Logo sind urheberrechtlich geschützt. Die Schrift Inter steht unter der SIL Open Font License 1.1.",
      ],
    },
  ],
};

const imprintEn: LegalPage = {
  title: "Imprint",
  description: "Legal disclosure pursuant to § 5 E-Commerce Act, § 14 Commercial Code and § 25 Media Act (Austria).",
  updated: "Last updated: tba",
  sections: [
    {
      heading: "Media owner and service provider",
      paragraphs: ["DIHA GmbH (in formation)", "Address: tba", "Email: tba", "Phone: tba"],
    },
    {
      heading: "Company details",
      paragraphs: [
        "Legal form: limited liability company (in formation)",
        "Commercial register number: tba",
        "Commercial register court: tba",
        "Registered office: tba",
        "VAT ID: tba",
        "Managing directors: tba",
        "Business purpose: operation of a test and training centre for drones, sensors and ground robotics",
        "Chamber membership: tba",
        "Supervisory / trade authority: tba",
      ],
    },
    {
      heading: "Disclosure pursuant to § 25 Media Act",
      paragraphs: [
        "Editorial line: information about the Eibenstein test centre, its services and the booking of test slots.",
        "Ownership: DIHA – Drone Innovation Hub Austria is a company by AEEG. Shareholdings: tba.",
      ],
    },
    {
      heading: "Liability for content and links",
      paragraphs: [
        "The content of this website has been prepared with care. We accept no liability for accuracy, completeness or timeliness. Information about the site is indicative and does not replace surveyed plans or official permits.",
        "The operators of linked external pages are solely responsible for their content.",
      ],
    },
    {
      heading: "Copyright",
      paragraphs: ["Texts, graphics and the DIHA logo are protected by copyright. The Inter typeface is licensed under the SIL Open Font License 1.1."],
    },
  ],
};

const privacyDe: LegalPage = {
  title: "Datenschutzerklärung",
  description: "Informationen nach Art. 13 und 14 DSGVO zur Verarbeitung personenbezogener Daten auf dieser Website und im Buchungsportal.",
  updated: "Stand: tba",
  sections: [
    {
      heading: "1. Verantwortlicher",
      paragraphs: [
        "Verantwortlich für die Datenverarbeitung ist die DIHA GmbH (in Gründung), Anschrift: tba, E-Mail: tba.",
        "Datenschutzanfragen richten Sie bitte an: tba.",
      ],
    },
    {
      heading: "2. Grundsätze",
      paragraphs: [
        "Wir verarbeiten personenbezogene Daten nur, soweit dies für den Betrieb der Website, die Bearbeitung von Anfragen und die Abwicklung von Buchungen erforderlich ist. Auf dieser Website gibt es keine Analyse-, Tracking- oder Werbewerkzeuge und keine eingebundenen Inhalte von Drittanbietern; Schriften und Karten werden von unserem eigenen Server ausgeliefert.",
      ],
    },
    {
      heading: "3. Aufruf der Website (Server-Protokolle)",
      paragraphs: [
        "Beim Aufruf verarbeitet unser Hosting-Dienstleister technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung), um die Website auszuliefern und vor Angriffen zu schützen.",
        "Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Protokolle werden nur kurzfristig gespeichert.",
      ],
    },
    {
      heading: "4. Cookies und lokale Speicherung",
      paragraphs: [
        "Die öffentliche Website setzt keine Cookies. Wählen Sie aktiv eine Sprache, speichern wir diese Wahl in einem funktionalen Cookie (diha_locale, 12 Monate). Im Portal setzen wir nach dem Login ein Sitzungs-Cookie (diha_session, höchstens 12 Stunden), das für die Anmeldung zwingend erforderlich ist.",
        "Diese Speicherungen sind für die von Ihnen ausdrücklich gewünschten Funktionen unbedingt erforderlich (§ 165 Abs. 3 TKG 2021). Eine Einwilligung ist dafür nicht notwendig, ein Cookie-Banner daher nicht vorgesehen.",
      ],
    },
    {
      heading: "5. Kontaktformular",
      paragraphs: [
        "Wenn Sie uns über das Kontaktformular schreiben, verarbeiten wir Name, E-Mail-Adresse, optional Organisation und Telefonnummer, das gewählte Thema und Ihre Nachricht, um Ihre Anfrage zu beantworten.",
        "Rechtsgrundlage sind vorvertragliche Maßnahmen bzw. unser berechtigtes Interesse an der Beantwortung von Anfragen (Art. 6 Abs. 1 lit. b und f DSGVO). Anfragen werden 12 Monate nach Eingang gelöscht, sofern daraus kein Vertragsverhältnis entsteht. Zur Missbrauchsabwehr speichern wir einen anonymisierten, täglich wechselnden Prüfwert statt Ihrer IP-Adresse.",
      ],
    },
    {
      heading: "6. Buchungsportal",
      paragraphs: [
        "Für Kundenprojekte, Manager und Administratoren betreiben wir ein Portal. Wir verarbeiten dort Kontodaten (Name, E-Mail, Rolle, Sprache, Passwort als Hash, gegebenenfalls ein verschlüsselter Zwei-Faktor-Schlüssel), Projekt- und Rechnungsdaten, Buchungsdaten, Angaben zu verantwortlichen Personen und Teilnehmenden sowie hochgeladene Nachweise (z. B. Kompetenznachweise, Versicherungen, Sprengbefugnisse).",
        "Rechtsgrundlagen: Vertragserfüllung und vorvertragliche Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO), rechtliche Verpflichtungen etwa aus Luftfahrt-, Sprengmittel-, Arbeitnehmerschutz- und Steuerrecht (Art. 6 Abs. 1 lit. c DSGVO) sowie unser berechtigtes Interesse an einem sicheren Betrieb des Testgeländes einschließlich Zutrittskontrolle (Art. 6 Abs. 1 lit. f DSGVO).",
        "Änderungen im Portal werden zur Nachvollziehbarkeit protokolliert. Zugriff erhalten nur berechtigte Personen; Projekte sehen ausschließlich ihre eigenen Daten.",
      ],
    },
    {
      heading: "7. Empfänger und Auftragsverarbeiter",
      paragraphs: ["Wir setzen folgende Dienstleister ein, mit denen Auftragsverarbeitungsverträge nach Art. 28 DSGVO bestehen:"],
      list: [
        "Cloudflare, Inc. (Hosting, Datenbank und Dateispeicher). Datenbank und Dateispeicher werden in der EU-Jurisdiktion betrieben. Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert; ergänzend gelten Standardvertragsklauseln.",
        "Resend (E-Mail-Versand von Systemnachrichten wie Einladungen und Statusmeldungen), Versand über die EU-Region. Für Übermittlungen in Drittländer gelten Standardvertragsklauseln bzw. das Data Privacy Framework.",
        "Im Einzelfall Behörden, soweit wir zur Übermittlung gesetzlich verpflichtet sind (z. B. im Rahmen von Genehmigungsverfahren).",
      ],
    },
    {
      heading: "8. Speicherdauer",
      paragraphs: [
        "Kontodaten speichern wir bis zur Löschung des Zugangs. Buchungs- und Rechnungsdaten bewahren wir entsprechend den gesetzlichen Aufbewahrungspflichten auf (Bücher und Belege 7 Jahre nach § 132 BAO; für Aufzeichnungen über Sprengmittel gelten längere Fristen). Kontaktanfragen löschen wir nach 12 Monaten, Sitzungsdaten nach Ablauf.",
      ],
    },
    {
      heading: "9. Ihre Rechte",
      paragraphs: [
        "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Wenden Sie sich dazu an die oben genannte Adresse.",
        "Sie können sich bei der Österreichischen Datenschutzbehörde beschweren: Barichgasse 40–42, 1030 Wien, www.dsb.gv.at.",
      ],
    },
    {
      heading: "10. Datensicherheit",
      paragraphs: [
        "Die Übertragung erfolgt verschlüsselt (TLS). Passwörter speichern wir ausschließlich als gesalzene Hashwerte, Zwei-Faktor-Schlüssel verschlüsselt. Administratoren und Manager müssen eine Zwei-Faktor-Anmeldung nutzen.",
      ],
    },
  ],
};

const privacyEn: LegalPage = {
  title: "Privacy policy",
  description: "Information pursuant to Art. 13 and 14 GDPR on the processing of personal data on this website and in the booking portal.",
  updated: "Last updated: tba",
  sections: [
    {
      heading: "1. Controller",
      paragraphs: ["The controller is DIHA GmbH (in formation), address: tba, email: tba.", "Please send data protection requests to: tba."],
    },
    {
      heading: "2. Principles",
      paragraphs: [
        "We only process personal data where necessary to operate the website, answer enquiries and handle bookings. This website uses no analytics, tracking or advertising tools and no embedded third-party content; fonts and maps are served from our own server.",
      ],
    },
    {
      heading: "3. Visiting the website (server logs)",
      paragraphs: [
        "When you visit, our hosting provider processes technically necessary data (IP address, time, requested address, browser identifier) to deliver the website and protect it against attacks.",
        "The legal basis is our legitimate interest in secure and stable operation (Art. 6(1)(f) GDPR). Logs are stored only briefly.",
      ],
    },
    {
      heading: "4. Cookies and local storage",
      paragraphs: [
        "The public website sets no cookies. If you actively choose a language, we store that choice in a functional cookie (diha_locale, 12 months). In the portal we set a session cookie after login (diha_session, at most 12 hours), which is strictly required for signing in.",
        "These are strictly necessary for functions you explicitly request (§ 165(3) Austrian Telecommunications Act 2021). Consent is not required, so there is no cookie banner.",
      ],
    },
    {
      heading: "5. Contact form",
      paragraphs: [
        "If you write to us via the contact form, we process your name, email address, optionally organisation and phone number, the chosen topic and your message in order to respond.",
        "The legal basis is pre-contractual measures or our legitimate interest in answering enquiries (Art. 6(1)(b) and (f) GDPR). Enquiries are deleted 12 months after receipt unless a contract results. For abuse prevention we store an anonymised check value that changes daily instead of your IP address.",
      ],
    },
    {
      heading: "6. Booking portal",
      paragraphs: [
        "We operate a portal for customer projects, managers and administrators. There we process account data (name, email, role, language, password as a hash, an encrypted two-factor key where applicable), project and billing data, booking data, details of responsible persons and participants, and uploaded documents (e.g. competency certificates, insurance, blasting licences).",
        "Legal bases: performance of a contract and pre-contractual measures (Art. 6(1)(b) GDPR), legal obligations such as aviation, explosives, occupational safety and tax law (Art. 6(1)(c) GDPR), and our legitimate interest in the safe operation of the test site including access control (Art. 6(1)(f) GDPR).",
        "Changes in the portal are logged for traceability. Only authorised persons have access; projects see only their own data.",
      ],
    },
    {
      heading: "7. Recipients and processors",
      paragraphs: ["We use the following service providers under data processing agreements pursuant to Art. 28 GDPR:"],
      list: [
        "Cloudflare, Inc. (hosting, database and file storage). Database and file storage are operated in the EU jurisdiction. Cloudflare is certified under the EU-US Data Privacy Framework; standard contractual clauses apply in addition.",
        "Resend (sending system emails such as invitations and status updates) via the EU region. Transfers to third countries are covered by standard contractual clauses or the Data Privacy Framework.",
        "In individual cases, authorities where we are legally obliged to disclose data (e.g. in permit procedures).",
      ],
    },
    {
      heading: "8. Retention",
      paragraphs: [
        "Account data is kept until the account is deleted. Booking and invoice data are retained in line with statutory obligations (books and records 7 years under § 132 Austrian Federal Fiscal Code; longer periods apply to explosives records). Contact enquiries are deleted after 12 months, session data on expiry.",
      ],
    },
    {
      heading: "9. Your rights",
      paragraphs: [
        "You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15 to 21 GDPR). Please contact us at the address above.",
        "You may lodge a complaint with the Austrian Data Protection Authority: Barichgasse 40–42, 1030 Vienna, www.dsb.gv.at.",
      ],
    },
    {
      heading: "10. Security",
      paragraphs: [
        "Data is transmitted encrypted (TLS). Passwords are stored only as salted hashes, two-factor keys encrypted. Administrators and managers must use two-factor sign-in.",
      ],
    },
  ],
};

export function legalContent(locale: Locale, page: "imprint" | "privacy"): LegalPage {
  if (page === "imprint") return locale === "en" ? imprintEn : imprintDe;
  return locale === "en" ? privacyEn : privacyDe;
}
