import type { Locale } from "./config";

const messages: Record<string, { de: string; en: string }> = {
  invalid: { de: "Die Angaben sind nicht korrekt.", en: "The details are not correct." },
  rate: { de: "Zu viele Versuche. Bitte warten Sie einige Minuten.", en: "Too many attempts. Please wait a few minutes." },
  locked: { de: "Konto vorübergehend gesperrt (15 Minuten) nach zu vielen Fehlversuchen.", en: "Account temporarily locked (15 minutes) after too many failed attempts." },
  token: { de: "Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.", en: "The link is invalid or has expired. Please request a new one." },
  mismatch: { de: "Die Passwörter stimmen nicht überein.", en: "The passwords do not match." },
  min_length: { de: "Das Passwort muss mindestens 12 Zeichen lang sein.", en: "The password must be at least 12 characters long." },
  max_length: { de: "Das Passwort ist zu lang.", en: "The password is too long." },
  mix: { de: "Bitte Buchstaben und Ziffern oder Sonderzeichen kombinieren.", en: "Please combine letters with digits or symbols." },
  current: { de: "Das aktuelle Passwort ist falsch.", en: "The current password is incorrect." },
  auth: { de: "Bitte melden Sie sich erneut an.", en: "Please sign in again." },
  forbidden: { de: "Dafür fehlt die Berechtigung.", en: "You do not have permission for this." },
  exists: { de: "Diese E-Mail-Adresse ist bereits vergeben.", en: "This email address is already in use." },
  last_admin: { de: "Der letzte aktive Admin kann nicht geändert oder deaktiviert werden.", en: "The last active admin cannot be changed or disabled." },
  not_found: { de: "Eintrag nicht gefunden.", en: "Entry not found." },
  conflict: { de: "Der Eintrag wurde zwischenzeitlich geändert.", en: "The entry was changed in the meantime." },
  file: { de: "Datei fehlt, ist zu groß (max. 25 MB) oder hat ein nicht erlaubtes Format.", en: "File missing, too large (max. 25 MB) or of a disallowed type." },
  iban: { de: "Die IBAN ist ungültig (Prüfziffer).", en: "The IBAN is invalid (check digits)." },
  bic: { de: "Der BIC ist ungültig.", en: "The BIC is invalid." },
  vat_id: { de: "Die UID-Nummer hat kein gültiges Format.", en: "The VAT ID has an invalid format." },
  overpaid: { de: "Der Betrag übersteigt den offenen Betrag.", en: "The amount exceeds the open balance." },
  frozen: { de: "Ausgestellte Rechnungen können nicht mehr geändert werden. Bitte stornieren.", en: "Issued invoices cannot be changed. Please cancel instead." },
  line: { de: "Bitte jede Position vollständig ausfüllen (Beschreibung, Menge > 0, Preis).", en: "Please complete every line (description, quantity > 0, price)." },
  server: { de: "Unerwarteter Fehler. Bitte erneut versuchen.", en: "Unexpected error. Please try again." },
};

export function errorText(locale: Locale, code: string | null | undefined): string {
  if (!code) return "";
  return messages[code]?.[locale] ?? messages.server[locale];
}
