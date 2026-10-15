import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";

/** Kanonische URL und hreflang-Alternativen für eine Seite mit sprachspezifischen Pfaden. */
export function localizedAlternates(locale: Locale, paths: { de: string; en: string }): Metadata["alternates"] {
  const base = siteUrl();
  return {
    canonical: `${base}${paths[locale]}`,
    languages: {
      "de-AT": `${base}${paths.de}`,
      en: `${base}${paths.en}`,
      "x-default": `${base}${paths.de}`,
    },
  };
}

export function ogImage(locale: Locale): string {
  return `${siteUrl()}/og/diha-og-${locale}.png`;
}
