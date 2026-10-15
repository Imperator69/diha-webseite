import { ResetForm } from "@/components/portal/auth-forms";
import { Alert } from "@/components/ui/card";
import { findValidToken } from "@/lib/auth/tokens";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "Passwort zurücksetzen · DIHA Portal", referrer: "no-referrer" };

export default async function ResetPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: raw, token } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const t = translator(locale);
  const found = await findValidToken(token, "reset");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("Neues Passwort festlegen", "Set a new password")}</h1>
      {found ? <ResetForm locale={locale} token={token} /> : <Alert tone="danger">{t("Der Link ist ungültig oder abgelaufen.", "The link is invalid or has expired.")}</Alert>}
    </div>
  );
}
