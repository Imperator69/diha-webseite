import { isLocale, type Locale } from "@/lib/i18n/config";

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v.length ? v : null;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function all(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function localeOf(fd: FormData): Locale {
  const v = str(fd, "locale");
  return isLocale(v) ? v : "de";
}

/** Nur relative Portal-Pfade als Rücksprungziel zulassen (kein Open Redirect). */
export function safePortalPath(value: string | null | undefined, locale: Locale): string {
  if (value && /^\/(de|en)\/portal(\/[\w\-/?=&.%]*)?$/.test(value) && !value.includes("//")) return value;
  return `/${locale}/portal`;
}

export function moneyToCents(value: string): number | null {
  const clean = value.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
