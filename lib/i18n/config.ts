export const locales = ["de", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";
export const localeCookie = "diha_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "de" ? "en" : "de";
}

/** Bevorzugte Sprache aus dem Accept-Language-Header, sonst Deutsch. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

/** Tauscht das Sprachpräfix eines Pfads, z. B. /de/portal → /en/portal. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = target;
    const path = parts.join("/");
    return localizedSlugs(path, target);
  }
  return `/${target}${pathname === "/" ? "" : pathname}`;
}

// Rechtsseiten haben sprachspezifische Slugs.
const slugPairs: [string, string][] = [
  ["impressum", "imprint"],
  ["datenschutz", "privacy"],
];

function localizedSlugs(path: string, target: Locale): string {
  let result = path;
  for (const [de, en] of slugPairs) {
    if (target === "en") result = result.replace(new RegExp(`^/en/${de}(?=/|$)`), `/en/${en}`);
    else result = result.replace(new RegExp(`^/de/${en}(?=/|$)`), `/de/${de}`);
  }
  return result;
}

export function legalPath(locale: Locale, page: "imprint" | "privacy"): string {
  if (locale === "de") return page === "imprint" ? "/de/impressum" : "/de/datenschutz";
  return page === "imprint" ? "/en/imprint" : "/en/privacy";
}
