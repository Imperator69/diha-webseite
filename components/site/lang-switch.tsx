"use client";

import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { localeCookie, locales, switchLocalePath, type Locale } from "@/lib/i18n/config";

/** Sprachumschalter: wechselt das Pfad-Präfix und merkt sich die Wahl (funktionales Cookie). */
export function LangSwitch({ locale, tone = "dark", onSwitch }: { locale: Locale; tone?: "dark" | "light"; onSwitch?: (locale: Locale) => void }) {
  const pathname = usePathname() || `/${locale}`;
  return (
    <div className={clsx("inline-flex rounded-lg p-0.5 text-xs font-semibold ring-1", tone === "dark" ? "ring-white/20" : "ring-border")} role="group" aria-label="Sprache / Language">
      {locales.map((l) => (
        <a
          key={l}
          href={switchLocalePath(pathname, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          onClick={() => {
            document.cookie = `${localeCookie}=${l}; path=/; max-age=31536000; samesite=lax`;
            onSwitch?.(l);
          }}
          className={clsx(
            "rounded-md px-2.5 py-1 uppercase",
            l === locale ? (tone === "dark" ? "bg-white text-ink" : "bg-ink text-white") : tone === "dark" ? "text-white/80 hover:text-white" : "text-fg-muted hover:text-fg",
          )}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
