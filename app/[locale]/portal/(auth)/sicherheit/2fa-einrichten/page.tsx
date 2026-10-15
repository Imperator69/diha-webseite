import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { renderSVG } from "uqr";
import { TotpSetupForm } from "@/components/portal/auth-forms";
import { getViewer } from "@/lib/auth/current";
import { generateTotpSecret, otpauthUri } from "@/lib/auth/totp";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "2FA einrichten · DIHA Portal" };

export default async function TotpSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const t = translator(locale);
  const current = await getViewer();
  if (!current) redirect(`/${locale}/portal/login`);
  const { viewer } = current;
  if (viewer.totpEnabled) redirect(`/${locale}/portal/konto`);

  const appSecret = appEnv().APP_SECRET;
  if (!appSecret || appSecret.length < 32) throw new Error("APP_SECRET fehlt oder ist zu kurz.");
  let secret: string;
  if (viewer.totpSecret) {
    secret = await decryptSecret(viewer.totpSecret, appSecret);
  } else {
    secret = generateTotpSecret();
    await db()
      .update(schema.users)
      .set({ totpSecret: await encryptSecret(secret, appSecret) })
      .where(eq(schema.users.id, viewer.id));
  }
  const uri = otpauthUri(secret, viewer.email);
  const svg = renderSVG(uri, { border: 1 });
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Zwei-Faktor-Anmeldung einrichten", "Set up two-factor sign-in")}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {viewer.role === "project"
            ? t("Empfohlen für alle Zugänge.", "Recommended for all accounts.")
            : t("Für Admins und Manager verpflichtend.", "Mandatory for admins and managers.")}
        </p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
        <li>{t("Authenticator-App öffnen (z. B. Microsoft Authenticator, Google Authenticator, 1Password).", "Open an authenticator app (e.g. Microsoft Authenticator, Google Authenticator, 1Password).")}</li>
        <li>{t("QR-Code scannen oder den Schlüssel manuell eingeben.", "Scan the QR code or enter the key manually.")}</li>
        <li>{t("Den angezeigten 6-stelligen Code unten eingeben.", "Enter the 6-digit code shown below.")}</li>
      </ol>
      <div className="mx-auto w-48 rounded-xl bg-white p-3 ring-1 ring-border" aria-label={t("QR-Code für die Authenticator-App", "QR code for the authenticator app")} role="img" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-center font-mono text-sm tracking-wider">{grouped}</p>
      <TotpSetupForm locale={locale} />
    </div>
  );
}
