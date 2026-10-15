import { CompanyForm, InvoiceSettingsForm, OperationsForm, RunJobsForm } from "@/components/portal/settings-forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { appEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/i18n/format";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";
import { getSetting } from "@/lib/settings";

export default async function SettingsPage({ params }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "settings.manage");
  const t = translator(locale);
  const [company, invoice, retention, booking, jobs] = await Promise.all([getSetting("company"), getSetting("invoice"), getSetting("retention"), getSetting("booking"), getSetting("jobs")]);
  const env = appEnv();
  const checks: [string, boolean][] = [
    [t("E-Mail-Versand (RESEND_API_KEY)", "Email delivery (RESEND_API_KEY)"), Boolean(env.RESEND_API_KEY)],
    [t("Verschlüsselungsschlüssel (APP_SECRET)", "Encryption key (APP_SECRET)"), Boolean(env.APP_SECRET)],
    [t("Externer Job-Auslöser (CRON_SECRET)", "External job trigger (CRON_SECRET)"), Boolean(env.CRON_SECRET)],
  ];
  return (
    <>
      <PageHeader title={t("Einstellungen", "Settings")} description={t("Firmendaten, Rechnungen, Löschfristen und Systemstatus.", "Company details, invoices, retention periods and system status.")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("Firmendaten", "Company details")} />
          <CardBody>
            <CompanyForm locale={locale} value={company} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Rechnungen", "Invoices")} />
            <CardBody>
              <InvoiceSettingsForm locale={locale} value={invoice} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Betrieb & Löschfristen", "Operations & retention")} />
            <CardBody>
              <OperationsForm locale={locale} retention={retention} booking={booking} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title={t("System", "System")}
              description={
                jobs.lastRunAt
                  ? t(`Tagesjobs zuletzt: ${formatDateTime(jobs.lastRunAt, locale)}`, `Daily jobs last run: ${formatDateTime(jobs.lastRunAt, locale)}`)
                  : t("Tagesjobs sind noch nicht gelaufen.", "Daily jobs have not run yet.")
              }
            />
            <CardBody className="space-y-4">
              <ul className="space-y-1.5 text-sm">
                {checks.map(([l, ok]) => (
                  <li key={l} className="flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full ${ok ? "bg-ok" : "bg-warn"}`} aria-hidden />
                    {l}: <span className={ok ? "text-ok" : "text-warn"}>{ok ? t("eingerichtet", "configured") : t("fehlt", "missing")}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-fg-muted">
                {t(
                  "Die Tagesjobs laufen automatisch täglich um 05:15 UTC (Fristen-Übersicht, Erinnerungen, Löschfristen).",
                  "Daily jobs run automatically at 05:15 UTC (deadline summary, reminders, retention).",
                )}
              </p>
              <RunJobsForm locale={locale} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
