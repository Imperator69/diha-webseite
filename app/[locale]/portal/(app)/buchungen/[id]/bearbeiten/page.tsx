import { notFound, redirect } from "next/navigation";
import { BookingWizard } from "@/components/booking/wizard";
import { PageHeader } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { canSeeBooking, loadBooking } from "@/lib/bookings/data";
import { buildWizardData, initialWizardState } from "@/lib/bookings/wizard-data";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

const steps = ["use", "area", "time", "details", "persons", "docs", "review"] as const;

export default async function EditBookingPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale, "bookings.create");
  const { id } = await params;
  const full = await loadBooking(id);
  if (!full || !canSeeBooking(viewer, full.booking.projectId)) notFound();
  const editable = isStaff(viewer.role) ? ["draft", "requested", "in_review"] : ["draft", "requested"];
  if (!editable.includes(full.booking.status)) redirect(`/${locale}/portal/buchungen/${id}`);
  const t = translator(locale);
  const q = await searchParams;
  const data = await buildWizardData(viewer, locale, { booking: full });
  const stepParam = sp(q.step);
  const step = steps.find((s) => s === stepParam);
  return (
    <>
      <PageHeader eyebrow={full.booking.number} title={t("Buchung bearbeiten", "Edit booking")} description={full.booking.title} />
      <BookingWizard locale={locale} data={data} initial={initialWizardState(data, { booking: full })} initialStep={step} />
    </>
  );
}
