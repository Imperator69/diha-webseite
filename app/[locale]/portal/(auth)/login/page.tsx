import { redirect } from "next/navigation";
import { LoginForm } from "@/components/portal/auth-forms";
import { Alert } from "@/components/ui/card";
import { ensureInitialAdmins } from "@/lib/auth/bootstrap";
import { getViewer } from "@/lib/auth/current";
import { isLocale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";

export const metadata = { title: "Login · DIHA Portal" };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const sp = await searchParams;
  const current = await getViewer();
  if (current) redirect(`/${locale}/portal`);
  await ensureInitialAdmins();
  const t = translator(locale);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Anmelden", "Sign in")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("Zugang für Projekte, Manager und Administration.", "Access for projects, managers and administrators.")}</p>
      </div>
      {sp.logged_out && <Alert tone="ok">{t("Sie wurden abgemeldet.", "You have been signed out.")}</Alert>}
      <LoginForm locale={locale} next={sp.next} />
      <p className="text-xs text-fg-muted">
        {t(
          "Noch kein Zugang? Zugänge werden nach einer Zulassungsprüfung von DIHA angelegt. ",
          "No access yet? Accounts are created by DIHA after an admission check. ",
        )}
        <a href={`/${locale}#kontakt`} className="underline underline-offset-2">
          {t("Anfrage stellen", "Send a request")}
        </a>
      </p>
    </div>
  );
}
