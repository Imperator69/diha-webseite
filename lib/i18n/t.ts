import type { Locale } from "./config";

export type Text = { de: string; en: string };

/** Zweisprachige Texte direkt am Verwendungsort: t("Speichern", "Save"). */
export function translator(locale: Locale) {
  return (de: string, en: string) => (locale === "en" ? en : de);
}

export function pick(locale: Locale, text: Text): string {
  return locale === "en" ? text.en : text.de;
}

export function pickField<T extends Record<string, unknown>>(row: T, base: string, locale: Locale): string {
  const key = `${base}${locale === "en" ? "En" : "De"}`;
  return String(row[key] ?? "");
}
