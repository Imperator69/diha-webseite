import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import type { SiteContent } from "@/content/site";
import { LangSwitch } from "./lang-switch";

export function SiteHeader({ locale, content }: { locale: Locale; content: SiteContent }) {
  const home = `/${locale}`;
  const links = [
    { href: `${home}#leistungen`, label: content.nav.services },
    { href: `${home}#gelaende`, label: content.nav.site },
    { href: `${home}#tests`, label: content.nav.tests },
    { href: `${home}#ablauf`, label: content.nav.process },
    { href: `${home}#standort`, label: content.nav.location },
    { href: `${home}#kontakt`, label: content.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href={home} className="shrink-0" aria-label="DIHA – Startseite">
          <Logo size="sm" tone="dark" />
        </Link>
        <nav aria-label={locale === "de" ? "Hauptnavigation" : "Main navigation"} className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm text-white/80">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitch locale={locale} />
          <Link href={`/${locale}/portal`} className={buttonClass("outline-light", "sm", "hidden sm:inline-flex")}>
            {content.nav.login}
          </Link>
          <details className="relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg ring-1 ring-white/20" aria-label="Menü">
              <Menu className="size-5" />
            </summary>
            <nav className="absolute right-0 mt-2 w-64 rounded-xl bg-ink-2 p-2 shadow-xl ring-1 ring-white/10" aria-label="Mobile">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                  {l.label}
                </a>
              ))}
              <Link href={`/${locale}/portal`} className="mt-1 block rounded-lg bg-signal px-3 py-2 text-sm font-semibold">
                {content.nav.login}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
