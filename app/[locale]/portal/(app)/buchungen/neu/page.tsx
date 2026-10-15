import { BookingWizard } from "@/components/booking/wizard";
import { Alert, PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { buildWizardData, initialWizardState } from "@/lib/bookings/wizard-data";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function NewBookingPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "bookings.create");
  const t = translator(locale);
  const q = await searchParams;
  const data = await buildWizardData(viewer, locale, { projectId: sp(q.project) });
  if (data.projects.length === 0) {
    return (
      <>
        <PageHeader title={t("Slot buchen", "Book a slot")} />
        <Alert tone="warn">{t("Ihrem Zugang ist noch kein aktives Projekt zugeordnet. Bitte wenden Sie sich an DIHA.", "No active project is assigned to your account yet. Please contact DIHA.")}</Alert>
      </>
    );
  }
  const initial = initialWizardState(data, { zoneId: sp(q.zone), projectId: sp(q.project) });
  return (
    <>
      <PageHeader title={t("Slot buchen", "Book a slot")} description={t("In sieben Schritten zur Anfrage. Ihr Fortschritt lässt sich jederzeit als Entwurf speichern.", "Seven steps to your request. You can save your progress as a draft at any time.")} />
      <BookingWizard locale={locale} data={data} initial={initial} />
    </>
  );
}
