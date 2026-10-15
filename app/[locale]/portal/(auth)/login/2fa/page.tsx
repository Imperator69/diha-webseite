import { redirect } from "next/navigation";
import { SecondFactorForm } from "@/components/portal/auth-forms";
import { getViewer } from "@/lib/auth/current";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "2FA · DIHA Portal" };

export default async function SecondFactorPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const current = await getViewer();
  if (!current) redirect(`/${locale}/portal/login`);
  if (!current.viewer.totpEnabled || current.session.mfaVerified) redirect(`/${locale}/portal`);
  const t = translator(locale);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Zwei-Faktor-Anmeldung", "Two-factor sign-in")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("Bitte bestätigen Sie die Anmeldung mit Ihrem zweiten Faktor.", "Please confirm the sign-in with your second factor.")}</p>
      </div>
      <SecondFactorForm locale={locale} next={(await searchParams).next} />
    </div>
  );
}
