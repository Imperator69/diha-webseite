import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, PageHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function NewInvoicePage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "invoices.manage");
  const t = translator(locale);
  const q = await searchParams;
  const [projects, bookings] = await Promise.all([
    db().select({ id: schema.projects.id, name: schema.projects.name, organization: schema.projects.organization }).from(schema.projects).where(eq(schema.projects.status, "active")).orderBy(asc(schema.projects.name)),
    db()
      .select({ id: schema.bookings.id, number: schema.bookings.number, title: schema.bookings.title, projectName: schema.projects.name })
      .from(schema.bookings)
      .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
      .where(and(inArray(schema.bookings.status, ["confirmed", "completed", "invoiced"])))
      .orderBy(desc(schema.bookings.firstStart))
      .limit(200),
  ]);
  return (
    <>
      <PageHeader
        title={t("Neue Rechnung", "New invoice")}
        description={t(
          "Mit Buchung werden Leistungszeitraum und Positionen aus den Tarifen vorbelegt. Die Rechnung bleibt ein Entwurf, bis sie ausgestellt wird.",
          "With a booking, the service period and lines are prefilled from the rates. The invoice stays a draft until issued.",
        )}
      />
      {sp(q.error) && <Alert tone="danger" className="mb-4">{t("Bitte ein Projekt wählen.", "Please choose a project.")}</Alert>}
      <Card className="max-w-2xl">
        <CardBody>
          <form action={createInvoiceAction} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <Field label={t("Projekt (Rechnungsempfänger)", "Project (recipient)")} htmlFor="project_id" required>
              <Select id="project_id" name="project_id" defaultValue={sp(q.project) ?? ""} required>
                <option value="">–</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.organization}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Buchung (optional)", "Booking (optional)")} htmlFor="booking_id" hint={t("Muss zum gewählten Projekt gehören.", "Must belong to the chosen project.")}>
              <Select id="booking_id" name="booking_id" defaultValue={sp(q.booking) ?? ""}>
                <option value="">–</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.number} · {b.title} · {b.projectName}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">{t("Entwurf anlegen", "Create draft")}</Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
