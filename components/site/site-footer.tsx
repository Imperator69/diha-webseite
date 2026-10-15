import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { legalPath, type Locale } from "@/lib/i18n/config";
import type { SiteContent } from "@/content/site";
import { LangSwitch } from "./lang-switch";

export function SiteFooter({ locale, content }: { locale: Locale; content: SiteContent }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Logo size="md" tone="dark" />
          <p className="mt-5 max-w-sm text-sm text-white/65">{content.footer.tagline}</p>
        </div>
        <nav aria-label={locale === "de" ? "Rechtliches" : "Legal"}>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link href={legalPath(locale, "imprint")} className="hover:text-white">
                {content.footer.imprint}
              </Link>
            </li>
            <li>
              <Link href={legalPath(locale, "privacy")} className="hover:text-white">
                {content.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/portal`} className="hover:text-white">
                {content.nav.login}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="md:justify-self-end">
          <LangSwitch locale={locale} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 sm:px-6 lg:px-8">
          © {year} DIHA – Drone Innovation Hub Austria · a company by AEEG. {content.footer.rights}
        </p>
      </div>
    </footer>
  );
}
