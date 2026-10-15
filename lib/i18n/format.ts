import type { Locale } from "./config";

export const TIME_ZONE = "Europe/Vienna";

const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "de-AT");

export function formatDate(value: number | string | Date | null | undefined, locale: Locale): string {
  if (value === null || value === undefined || value === "") return "–";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(value: number | Date | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "–";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: number | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatWeekday(value: number | Date, locale: Locale, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, weekday: style }).format(new Date(value));
}

export function formatMoney(cents: number | null | undefined, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);
}

export function formatNumber(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(value);
}
