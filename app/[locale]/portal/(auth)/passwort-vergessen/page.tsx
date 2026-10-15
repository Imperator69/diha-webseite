import { ForgotForm } from "@/components/portal/auth-forms";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "Passwort vergessen · DIHA Portal" };

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const t = translator(locale);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Passwort vergessen", "Forgot password")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("Wir senden Ihnen einen Link zum Zurücksetzen.", "We will send you a reset link.")}</p>
      </div>
      <ForgotForm locale={locale} />
      <a href={`/${locale}/portal/login`} className="block text-center text-sm text-fg-muted hover:text-fg">
        {t("Zurück zur Anmeldung", "Back to sign in")}
      </a>
    </div>
  );
}
