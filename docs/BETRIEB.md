# Betrieb des Portals

Kurzanleitung für Admins und Manager. Das Portal unterstützt die Abläufe; behördliche Genehmigungen, Meldepflichten und die steuerliche Beurteilung ersetzt es nicht.

## 1. Zugänge

- **Benutzer anlegen** (Admin → Benutzer): Name, E-Mail, Rolle, bei Rolle *Projekt* die Projekte zuordnen. Der Einladungslink geht per E-Mail; ohne E-Mail-Versand wird er nach dem Anlegen angezeigt.
- **2FA** ist für Admins und Manager Pflicht. Verlorenes Gerät: Wiederherstellungscode verwenden oder Admin setzt 2FA zurück (Benutzer → „2FA zurücksetzen“).
- **Sperre:** nach 10 Fehlversuchen 15 Minuten. Deaktivierte Benutzer können sich nicht anmelden; laufende Sitzungen enden.
- Der letzte aktive Admin kann nicht herabgestuft oder deaktiviert werden.

## 2. Projekte zulassen

Projekte → Projekt öffnen → Zulassung: Firmendaten, UID, Sanktions- und Exportkontrollprüfung, Endverbleibserklärung (wo nötig) abhaken und Ergebnis setzen. Rechnungsanschrift (Straße, PLZ, Ort, Land, UID) wird für Rechnungen benötigt.

## 3. Gelände einrichten

- **Zonen** (Gelände → Zone): Typ, Kapazität, buchbar, öffentlich sichtbar, Sicherheitshinweise, Umriss auf der Karte zeichnen. Ein eigenes Kartenbild (Luftbild, Lageplan) kann hochgeladen werden; die Zonen bleiben darüber liegen.
- **Slot-Vorlagen** (Gelände → Slot-Vorlagen): buchbare Zeitfenster je Wochentag, für alle oder einzelne Zonen. Sie bestimmen auch die verfügbare Zeit in den Auswertungen.
- **Sperrzeiten:** Abbau-Sprengungen und -betrieb, Wartung, behördliche Auflagen, Wetter. Gesperrte Zeiten sind nicht buchbar. Bereits bestehende Buchungen werden nicht automatisch verschoben; die Liste zeigt je Sperrzeit die betroffenen Buchungen zur Abstimmung mit dem Projekt.
- **Nutzungsarten:** je Art erlaubte Zonentypen, Pflichtrollen (z. B. Sprengbefugte:r), Pflichtunterlagen, bedingte Anforderungen (z. B. Funkbewilligung, wenn gesendet wird), Ausschlüsse (z. B. kein Flugbetrieb während Wirkmitteltests), Vorlaufzeit, Prüf-Checkliste, Geländefreigabe nach dem Test.

## 4. Buchungen

1. Das Projekt stellt eine Anfrage über den Assistenten (Nutzung, Zone, Termin, Angaben, Verantwortliche, Unterlagen).
2. **Prüfung:** Personen verifizieren, Unterlagen akzeptieren oder ablehnen, Checkliste abarbeiten, Nachrichten an das Projekt. Bestätigen ist erst möglich, wenn Regeln und Checkliste erfüllt sind. Die Vorlaufzeit kann im Einzelfall aufgehoben werden (im Audit-Log protokolliert).
3. **Testtag:** Betriebsprotokoll (Ist-Zeiten, Wetter, Ereignisse) in der Buchung; Vorkommnisse unter Vorkommnisse erfassen.
4. **Abschließen:** Bei Nutzungsarten mit Geländefreigabe (z. B. Wirkmittel) erst nach dokumentierter Freigabe durch die benannte Person.
5. **Abrechnen:** Rechnung aus der Buchung erstellen (siehe 6).

Sprengungen: Die Nutzungsart verlangt eine:n Sprengbefugte:n vor Ort samt Nachweis; ohne diese Angaben kann die Anfrage nicht abgeschickt werden. Gleichzeitiger Flugbetrieb ist ausgeschlossen.

## 5. Genehmigungen, Dokumente, Fristen

- **Genehmigungen:** Register aller Verfahren (Austro Control, Bezirkshauptmannschaft, Montanbehörde, Fernmeldebüro, Gemeinde, Versicherung, Verträge) mit Status, Aktenzahl, Gültigkeit, nächster Frist und Verantwortlichen. „Standard-Register anlegen“ erzeugt eine Vorlage typischer Verfahren.
- **Dokumente:** alle Unterlagen mit Filtern; Gelände- und Zonenunterlagen (Einsatzplan, Lageplan) hier hochladen, Verfahrensunterlagen direkt am Genehmigungseintrag.
- **Fristen:** Die Tagesjobs senden eine Sammelmail an Admins und Manager, sobald ein neuer Punkt fällig wird (Frist in 14 Tagen, Gültigkeit endet in 60 Tagen, Unterlage läuft in 30 Tagen ab, unbestätigte Buchung in 7 Tagen, überfällige Rechnung). Projekte werden an ablaufende Projektunterlagen erinnert. Bewilligte Genehmigungen werden nach Ablauf automatisch auf „abgelaufen“ gesetzt.

## 6. Rechnungen

1. **Einstellungen** (Admin): Firmenwortlaut, Anschrift, UID, Firmenbuch, Bankverbindung, Zahlungsziel, Nummernpräfix.
2. **Tarife** (Rechnungen → Tarife): Nettopreise je Einheit und Bezug (Buchung, Zone, Person), optional nur für eine Zone oder Nutzungsart.
3. **Entwurf** aus Buchung oder frei; Positionen, Leistungszeitraum, Steuersatz je Position, Hinweistext. PDF-Vorschau ist als Entwurf gekennzeichnet.
4. **Ausstellen:** Das Portal prüft die Pflichtangaben nach § 11 UStG und vergibt die nächste Nummer (`PRÄFIX-JAHR-NNNN`, lückenlos). Danach ist die Rechnung unveränderlich, das PDF wird abgelegt und auf Wunsch per E-Mail versandt.
5. **Zahlungseingang** mit Datum, Betrag, Referenz; Teilzahlungen möglich.
6. **Zahlungserinnerung / Mahnung** aus der Rechnung (bis Stufe 3).
7. **Storno:** erzeugt eine Gutschrift mit eigener Nummer; offene Beträge werden verrechnet, bereits Bezahltes als Erstattung erfasst.

Reverse Charge nur nach Klärung mit der Steuerberatung (bei Leistungen im Zusammenhang mit einem Grundstück liegt der Leistungsort in Österreich, § 3a Abs. 9 UStG).

## 7. Auswertungen

Auslastung je Zone und Monat (gebuchte Stunden bestätigter Termine innerhalb der Slot-Fenster, abzüglich Sperrzeiten), Buchungen je Monat, Umsatz und Zahlungseingang, offene Posten nach Alter, Nutzungsarten, Projekte, Genehmigungsstand. CSV-Export für Buchungen, Rechnungen und Auslastung (Semikolon, UTF-8, für Excel).

## 8. Datenschutz-Aufgaben

- **Auskunft (Art. 15 DSGVO):** Benutzer → Benutzer öffnen → „Datenauskunft (JSON)“.
- **Löschung (Art. 17 DSGVO):** Benutzer → „Benutzer anonymisieren“. Buchungs- und Rechnungsdaten bleiben wegen gesetzlicher Aufbewahrungspflichten erhalten (Art. 17 Abs. 3 lit. b DSGVO).
- **Löschfristen:** Einstellungen → Betrieb & Löschfristen; die Tagesjobs löschen Kontaktanfragen, Spam, Postausgang, abgelaufene Sitzungen und Tokens automatisch.
- **Audit-Log** (Admin): alle Änderungen mit Benutzer und Zeitpunkt.
