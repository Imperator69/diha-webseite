import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { siteContent } from "@/content/site";
import { isLocale } from "@/lib/i18n/config";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const content = siteContent(locale);
  return (
    <>
      <a href="#main" className="skip-link">
        {locale === "de" ? "Zum Inhalt springen" : "Skip to content"}
      </a>
      <SiteHeader locale={locale} content={content} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} content={content} />
    </>
  );
}
