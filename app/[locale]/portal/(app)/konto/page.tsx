import { ShieldCheck, ShieldAlert } from "lucide-react";
import { PasswordForm, ProfileForm, RecoveryRegenForm } from "@/components/portal/account-forms";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { label, roleLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function AccountPage({ params }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  return (
    <>
      <PageHeader title={t("Mein Konto", "My account")} description={`${viewer.email} · ${label(roleLabels, viewer.role, locale)}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("Profil", "Profile")} />
          <CardBody>
            <ProfileForm locale={locale} name={viewer.name} phone={viewer.phone} preferred={viewer.locale} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Passwort", "Password")} />
            <CardBody>
              <PasswordForm locale={locale} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Zwei-Faktor-Anmeldung", "Two-factor sign-in")} />
            <CardBody className="space-y-4">
              {viewer.totpEnabled ? (
                <>
                  <p className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="size-5 text-ok" /> {t("Aktiv", "Enabled")}
                  </p>
                  <RecoveryRegenForm locale={locale} />
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm">
                    <ShieldAlert className="size-5 text-warn" /> {t("Nicht eingerichtet (empfohlen)", "Not set up (recommended)")}
                  </p>
                  <ButtonLink href={`/${locale}/portal/sicherheit/2fa-einrichten`} size="sm">
                    {t("Jetzt einrichten", "Set up now")}
                  </ButtonLink>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
