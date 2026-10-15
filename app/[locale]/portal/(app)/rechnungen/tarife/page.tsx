import Link from "next/link";
import { asc } from "drizzle-orm";
import { RateForm, type RateValues } from "@/components/invoices/rate-form";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { deleteRateAction } from "@/lib/actions/invoices";
import { requireViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { formatMoney } from "@/lib/i18n/format";
import { label, rateUnitLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";

export default async function RatesPage({ params, searchParams }: PageProps) {
  const locale = await localeParam(params);
  await requireViewer(locale, "invoices.manage");
  const t = translator(locale);
  const q = await searchParams;
  const [rates, zones, activities] = await Promise.all([
    db().select().from(schema.rates).orderBy(asc(schema.rates.sortOrder), asc(schema.rates.code)),
    db().select({ id: schema.zones.id, code: schema.zones.code }).from(schema.zones).orderBy(asc(schema.zones.sortOrder)),
    db().select({ code: schema.activityTypes.code, nameDe: schema.activityTypes.nameDe, nameEn: schema.activityTypes.nameEn }).from(schema.activityTypes).orderBy(asc(schema.activityTypes.sortOrder)),
  ]);
  const editing = rates.find((r) => r.id === sp(q.edit));
  const values: RateValues = editing
    ? { ...editing, price: (editing.priceCents / 100).toFixed(2).replace(".", locale === "de" ? "," : ".") }
    : { code: "", nameDe: "", nameEn: "", unit: "day", basis: "booking", price: "0", taxRateBp: 2000, zoneId: null, activityCode: null, active: true, sortOrder: (rates.at(-1)?.sortOrder ?? 0) + 10 };
  const zoneCode = Object.fromEntries(zones.map((z) => [z.id, z.code]));
  const basisText = { booking: t("je Buchung", "per booking"), zone: t("je Zone", "per zone"), person: t("je Person", "per person") } as const;
  return (
    <>
      <PageHeader
        eyebrow={t("Rechnungen", "Invoices")}
        title={t("Tarife", "Rates")}
        description={t(
          "Nettopreise für Preisschätzung im Buchungsassistenten und für Rechnungsentwürfe. Änderungen wirken nicht auf bereits ausgestellte Rechnungen.",
          "Net prices for the booking assistant estimate and draft invoices. Changes do not affect invoices already issued.",
        )}
      />
      {sp(q.saved) === "deleted" && <Alert tone="ok" className="mb-4">{t("Tarif gelöscht.", "Rate deleted.")}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <Table>
            <thead>
              <tr>
                <Th>{t("Tarif", "Rate")}</Th>
                <Th>{t("Einheit", "Unit")}</Th>
                <Th>{t("Gilt für", "Applies to")}</Th>
                <Th className="text-right">{t("Netto", "Net")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className={r.id === editing?.id ? "bg-signal/5" : undefined}>
                  <Td>
                    <Link href={`/${locale}/portal/rechnungen/tarife?edit=${r.id}`} className="font-medium hover:underline">
                      {locale === "en" ? r.nameEn : r.nameDe}
                    </Link>
                    <p className="font-mono text-xs text-fg-muted">{r.code}</p>
                  </Td>
                  <Td className="text-sm">
                    {label(rateUnitLabels, r.unit, locale)} · {basisText[r.basis]}
                  </Td>
                  <Td className="text-sm">
                    {[r.zoneId ? zoneCode[r.zoneId] : null, r.activityCode].filter(Boolean).join(" · ") || t("alle", "all")}
                    {!r.active && (
                      <Badge tone="neutral" className="ml-2">
                        {t("inaktiv", "inactive")}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right text-sm tabular-nums">
                    {formatMoney(r.priceCents, locale)}
                    <p className="text-xs text-fg-muted">{r.taxRateBp / 100} %</p>
                  </Td>
                  <Td>
                    <form action={deleteRateAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t("Löschen", "Delete")}
                      </Button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader
            title={editing ? t("Tarif bearbeiten", "Edit rate") : t("Neuer Tarif", "New rate")}
            actions={
              editing ? (
                <ButtonLink href={`/${locale}/portal/rechnungen/tarife`} variant="ghost" size="sm">
                  {t("Neu", "New")}
                </ButtonLink>
              ) : undefined
            }
          />
          <CardBody>
            <RateForm key={values.id ?? "new"} locale={locale} rate={values} zones={zones} activities={activities.map((a) => ({ code: a.code, name: locale === "en" ? a.nameEn : a.nameDe }))} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
