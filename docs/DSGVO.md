# Datenschutz: Verarbeitungsverzeichnis (Vorlage) und TOM

Arbeitsgrundlage für das Verzeichnis nach Art. 30 DSGVO. Angaben mit *tba* vor Inbetriebnahme ergänzen und rechtlich prüfen lassen.

## Verantwortlicher

| | |
|---|---|
| Name, Anschrift | *tba* (DIHA GmbH, a company by AEEG) |
| Vertretung | *tba* |
| Datenschutz-Kontakt | *tba* |
| Datenschutzbeauftragte:r | *tba* (Pflicht nach Art. 37 DSGVO prüfen) |

## Verarbeitungstätigkeiten

| # | Tätigkeit | Zweck | Betroffene | Datenkategorien | Rechtsgrundlage | Empfänger | Löschung |
|---|---|---|---|---|---|---|---|
| 1 | Website | Bereitstellung, Sicherheit | Besucher:innen | technische Zugriffsdaten (IP-Adresse, Zeitpunkt, Browser) beim Hoster | Art. 6 Abs. 1 lit. f | Cloudflare | laut Anbieter kurzfristig |
| 2 | Kontaktanfragen | Beantwortung, Anbahnung | Interessent:innen | Name, E-Mail, Organisation, Telefon, Nachricht; für den Missbrauchsschutz kurzzeitig ein geschlüsselter, täglich wechselnder Prüfwert statt der IP | Art. 6 Abs. 1 lit. b, f | Cloudflare | 12 Monate (Spam 30 Tage), einstellbar |
| 3 | Portal-Konten | Zugang, Sicherheit, Nachvollziehbarkeit | Mitarbeitende, Projektpersonal | Name, E-Mail, Rolle, Passwort-Hash, 2FA-Schlüssel (verschlüsselt), Sitzungen, Audit-Log | Art. 6 Abs. 1 lit. b, f | Cloudflare, Resend (E-Mails) | bis Löschung des Zugangs; Sitzungen bei Ablauf |
| 4 | Buchungen und Testbetrieb | Planung, Sicherheit am Gelände, Zutritt, Nachweis gegenüber Behörden | Projektpersonal, verantwortliche Personen, Teilnehmende, Gäste | Namen, Kontaktdaten, Funktion, Qualifikationsnachweise (z. B. Fernpilotenzeugnis, Sprengbefugnis), Teilnehmerlisten, Betriebsprotokolle | Art. 6 Abs. 1 lit. b, c, f | Cloudflare; Behörden nur bei Rechtspflicht | Aufbewahrungsfristen der jeweiligen Rechtsgrundlage, mindestens bis Abschluss und Abrechnung |
| 5 | Genehmigungen, Vorkommnisse | Behördenverfahren, Meldewesen, Sicherheit | Ansprechpersonen, Beteiligte | Namen, Funktionen, Aktenzahlen, Sachverhalte | Art. 6 Abs. 1 lit. c, f | Cloudflare; Behörden | solange Verfahren/Genehmigung wirksam, danach gesetzliche Fristen |
| 6 | Rechnungswesen | Abrechnung, Buchhaltung | Ansprechpersonen der Kunden | Name, Anschrift, UID, Rechnungs- und Zahlungsdaten | Art. 6 Abs. 1 lit. b, c | Cloudflare, Resend; Steuerberatung | 7 Jahre (§ 132 BAO) |
| 7 | Systemnachrichten | Einladungen, Statusmeldungen, Fristen | Empfänger:innen | E-Mail-Adresse, Betreff, Inhalt (nur Postausgang) | Art. 6 Abs. 1 lit. b, f | Resend | Postausgang 30 Tage, einstellbar |

Keine Verarbeitung besonderer Kategorien nach Art. 9 DSGVO vorgesehen. Nicht in der Software: Videoüberwachung, Ortung von Personen.

## Auftragsverarbeiter und Drittland

| Anbieter | Leistung | Vertrag | Drittland |
|---|---|---|---|
| Cloudflare, Inc. | Hosting (Workers), Datenbank (D1), Dateien (R2) | Data Processing Addendum des Anbieters abschließen/akzeptieren | D1 und R2 mit Jurisdiktion EU angelegt; Zugriffe aus den USA über EU-US Data Privacy Framework und Standardvertragsklauseln abgesichert |
| Resend | E-Mail-Versand | Data Processing Agreement des Anbieters | Versand über EU-Region; Übermittlungen in die USA über DPF/SCC |

Vor Inbetriebnahme: Vertragsstände und aktuelle Zertifizierung der Anbieter prüfen und dokumentieren.

## Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

**Vertraulichkeit**
- Rollen Admin/Manager/Projekt; jede Seite, Aktion und API-Route prüft die Berechtigung serverseitig; Projekt-Benutzer sehen nur Daten ihrer Projekte (E2E-Test `tests/e2e/rbac.spec.ts`).
- Passwörter mit scrypt gehasht, Mindestlänge 12; 2FA (TOTP) Pflicht für Admins und Manager; 2FA-Schlüssel mit AES-GCM verschlüsselt; Wiederherstellungscodes nur gehasht.
- Sitzungen: zufälliges Token, in der Datenbank nur als Hash; Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; maximal 12 Stunden, 2 Stunden Inaktivität.
- Login-Sperre nach 10 Fehlversuchen, Rate-Limits für Login, Passwort-Reset und Kontaktformular.
- Einladungs- und Reset-Links einmalig, befristet (7 Tage bzw. 2 Stunden), nur als Hash gespeichert.
- Dateien nur über geprüfte Routen, Typ- und Größenprüfung (25 MB), Auslieferung mit `Content-Security-Policy: sandbox`.
- Sicherheits-Header: CSP ohne Fremdquellen, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; Portal mit `noindex`.
- Server-Actions und Upload-APIs prüfen den Origin (CSRF).

**Integrität**
- Audit-Log aller Änderungen (Benutzer, Zeitpunkt, Aktion).
- Ausgestellte Rechnungen durch Datenbank-Trigger gegen Änderung gesperrt; Korrektur nur über Gutschrift.

**Verfügbarkeit und Belastbarkeit**
- Betrieb auf Cloudflare; D1 Time Travel; regelmäßige Exporte von D1 und Sicherung von R2 (siehe DEPLOYMENT.md).

**Datenminimierung und Löschung**
- Website ohne Tracking, ohne Cookies vor Nutzeraktion, ohne Drittanbieter-Requests (Schriften, Karten lokal).
- Kontaktformular und Login speichern statt der IP-Adresse einen mit `APP_SECRET` geschlüsselten, täglich wechselnden Prüfwert (HMAC); Löschung im täglichen Bereinigungslauf.
- Automatische Löschung nach den in den Einstellungen hinterlegten Fristen (Tagesjobs).
- Anonymisierung von Benutzerkonten; Export für Auskunftsersuchen.

**Überprüfung**
- Unit- und End-to-End-Tests; Berechtigungen vor jedem Release testen (`pnpm test`, `pnpm test:e2e`).

## Betroffenenrechte

Auskunft und Datenübertragbarkeit: Export je Benutzer (Admin). Berichtigung: im Konto bzw. durch Admin. Löschung: Anonymisierung, eingeschränkt durch Aufbewahrungspflichten. Widerspruch gegen Verarbeitungen nach lit. f prüfen und dokumentieren. Beschwerderecht bei der Österreichischen Datenschutzbehörde.

## Datenschutzverletzungen

Meldung an die Datenschutzbehörde binnen 72 Stunden nach Bekanntwerden, sofern ein Risiko für Betroffene nicht unwahrscheinlich ist (Art. 33 DSGVO); Benachrichtigung der Betroffenen bei hohem Risiko (Art. 34 DSGVO). Ablauf, Zuständigkeit und Dokumentation festlegen (*tba*).

## Datenschutz-Folgenabschätzung

Vor Inbetriebnahme prüfen, ob eine DSFA nach Art. 35 DSGVO erforderlich ist (Kriterien der DSFA-V der Datenschutzbehörde). Nach dem derzeitigen Funktionsumfang werden keine besonderen Kategorien verarbeitet und keine Personen systematisch überwacht; das Ergebnis der Prüfung dokumentieren.
