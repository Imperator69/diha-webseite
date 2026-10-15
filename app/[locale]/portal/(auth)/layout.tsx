import { Logo } from "@/components/brand/logo";
import { LangSwitch } from "@/components/site/lang-switch";
import { isLocale } from "@/lib/i18n/config";

export const metadata = { robots: { index: false, follow: false } };

export default async function AuthLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  return (
    <div data-area="portal" className="grid min-h-screen bg-bg text-fg lg:grid-cols-[1fr_1.1fr]">
      <aside className="bg-contours relative hidden flex-col justify-between p-12 text-white lg:flex">
        <a href={`/${locale}`} aria-label="DIHA">
          <Logo size="lg" tone="dark" />
        </a>
        <div>
          <p className="text-3xl font-bold leading-tight">{locale === "de" ? "Heute testen. Morgen sichern." : "Test today. Secure tomorrow."}</p>
          <p className="mt-3 max-w-md text-white/65">
            {locale === "de"
              ? "Portal für Buchungen, Gelände, Genehmigungen und Abrechnung des Testzentrums Eibenstein."
              : "Portal for bookings, site, permits and billing of the Eibenstein test centre."}
          </p>
        </div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <a href={`/${locale}`} className="lg:invisible" aria-label="DIHA">
            <Logo size="sm" />
          </a>
          <LangSwitch locale={locale} tone="light" />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
