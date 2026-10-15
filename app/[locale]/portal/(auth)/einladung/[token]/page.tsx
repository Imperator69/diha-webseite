import { InviteForm } from "@/components/portal/auth-forms";
import { Alert } from "@/components/ui/card";
import { findValidToken } from "@/lib/auth/tokens";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "Einladung · DIHA Portal", referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: raw, token } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const t = translator(locale);
  const found = await findValidToken(token, "invite");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Zugang aktivieren", "Activate your account")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("Legen Sie Ihr Passwort für das DIHA-Portal fest.", "Set your password for the DIHA portal.")}</p>
      </div>
      {found ? (
        <InviteForm locale={locale} token={token} name={found.user.name} email={found.user.email} />
      ) : (
        <Alert tone="danger">{t("Der Einladungslink ist ungültig oder abgelaufen. Bitte wenden Sie sich an DIHA.", "The invitation link is invalid or has expired. Please contact DIHA.")}</Alert>
      )}
    </div>
  );
}
