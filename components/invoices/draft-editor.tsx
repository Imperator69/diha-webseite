"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { issueInvoiceAction, saveDraftAction, type DraftResult } from "@/lib/actions/invoices";
import type { Locale } from "@/lib/i18n/config";
import { errorText } from "@/lib/i18n/errors";
import { formatMoney } from "@/lib/i18n/format";
import { rateUnitLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { buildLine, invoiceUnits, issueProblemText, parseDecimal, taxRates } from "@/lib/invoices/compute";
import { totals } from "@/lib/pricing";

export type EditorLine = { key: string; description: string; quantity: string; unit: string; unitPrice: string; taxRateBp: number };
export type EditorRate = { id: string; name: string; unit: string; priceCents: number; taxRateBp: number };

const unitText: Record<string, { de: string; en: string }> = { ...rateUnitLabels, piece: { de: "Stück", en: "piece" } };
let seq = 0;
const key = () => `l${++seq}`;

export function DraftEditor({
  locale,
  id,
  initial,
  rates,
  defaultTaxRateBp,
}: {
  locale: Locale;
  id: string;
  initial: { invoiceLocale: Locale; serviceFrom: string; serviceTo: string; reverseCharge: boolean; notes: string; lines: Omit<EditorLine, "key">[] };
  rates: EditorRate[];
  defaultTaxRateBp: number;
}) {
  const t = translator(locale);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [head, setHead] = useState({
    invoiceLocale: initial.invoiceLocale,
    serviceFrom: initial.serviceFrom,
    serviceTo: initial.serviceTo,
    reverseCharge: initial.reverseCharge,
    notes: initial.notes,
  });
  const [lines, setLines] = useState<EditorLine[]>(() => initial.lines.map((l) => ({ ...l, key: key() })));
  const [result, setResult] = useState<(DraftResult & { action: "save" | "issue" }) | null>(null);
  const [sendMail, setSendMail] = useState(true);

  const computed = useMemo(() => {
    const built = lines.map((l) => {
      const q = parseDecimal(l.quantity);
      const p = parseDecimal(l.unitPrice);
      return q !== null && p !== null
        ? buildLine({ description: l.description, quantity: q, unit: l.unit, unitPriceCents: Math.round(p * 100), taxRateBp: head.reverseCharge ? 0 : l.taxRateBp })
        : null;
    });
    return {
      built,
      sum: totals(
        built.filter((b): b is NonNullable<typeof b> => b !== null),
        head.reverseCharge,
      ),
    };
  }, [lines, head.reverseCharge]);

  const update = (k: string, patch: Partial<EditorLine>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const payload = () => ({ locale, id, ...head, lines: lines.map(({ description, quantity, unit, unitPrice, taxRateBp }) => ({ description, quantity, unit, unitPrice, taxRateBp })) });

  const save = () =>
    start(async () => {
      const r = await saveDraftAction(payload());
      setResult({ ...r, action: "save" });
      if (r.ok) router.refresh();
    });
  const issue = () =>
    start(async () => {
      const saved = await saveDraftAction(payload());
      if (!saved.ok) return setResult({ ...saved, action: "save" });
      if (!confirm(t("Rechnung jetzt verbindlich ausstellen? Danach sind keine Änderungen mehr möglich.", "Issue the invoice now? It cannot be changed afterwards."))) return;
      const r = await issueInvoiceAction({ locale, id, sendMail });
      setResult({ ...r, action: "issue" });
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-6">
      {result && !result.ok && (
        <Alert tone="danger">
          {result.error === "problems" ? (
            <>
              <p className="font-semibold">{t("Für eine ordnungsgemäße Rechnung fehlt noch:", "Required details missing:")}</p>
              <ul className="mt-1 list-disc pl-5">
                {result.problems?.map((p) => (
                  <li key={p}>{issueProblemText[p][locale]}</li>
                ))}
              </ul>
            </>
          ) : result.error === "line" ? (
            `${errorText(locale, "line")} (${t("Position", "Line")} ${result.line})`
          ) : (
            errorText(locale, result.error)
          )}
        </Alert>
      )}
      {result?.ok && result.action === "save" && <Alert tone="ok">{t("Entwurf gespeichert.", "Draft saved.")}</Alert>}

      <div className="grid gap-4 md:grid-cols-4">
        <Field label={t("Rechnungssprache", "Invoice language")} htmlFor="inv_locale">
          <Select id="inv_locale" value={head.invoiceLocale} onChange={(e) => setHead({ ...head, invoiceLocale: e.target.value as Locale })}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label={t("Leistung von", "Service from")} htmlFor="inv_from" required>
          <Input id="inv_from" type="date" value={head.serviceFrom} onChange={(e) => setHead({ ...head, serviceFrom: e.target.value })} />
        </Field>
        <Field label={t("Leistung bis", "Service to")} htmlFor="inv_to">
          <Input id="inv_to" type="date" value={head.serviceTo} onChange={(e) => setHead({ ...head, serviceTo: e.target.value })} />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox label={t("Reverse Charge", "Reverse charge")} checked={head.reverseCharge} onChange={(e) => setHead({ ...head, reverseCharge: e.target.checked })} />
        </div>
      </div>
      {head.reverseCharge && (
        <p className="text-xs text-warn">
          {t(
            "Reverse Charge nur, wenn die Leistung beim Empfänger steuerbar ist. Leistungen im Zusammenhang mit einem Grundstück (§ 3a Abs. 9 UStG) sind in Österreich steuerbar. Bitte mit der Steuerberatung klären.",
            "Reverse charge applies only where the service is taxable at the recipient. Services connected with immovable property (§ 3a(9) Austrian VAT Act) are taxable in Austria. Please confirm with your tax adviser.",
          )}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-muted">
              <th className="w-8 pb-2">#</th>
              <th className="pb-2">{t("Beschreibung", "Description")}</th>
              <th className="w-24 pb-2">{t("Menge", "Qty")}</th>
              <th className="w-32 pb-2">{t("Einheit", "Unit")}</th>
              <th className="w-32 pb-2">{t("Einzelpreis €", "Unit price €")}</th>
              <th className="w-24 pb-2">{t("USt.", "VAT")}</th>
              <th className="w-28 pb-2 text-right">{t("Netto", "Net")}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.key} className="align-top">
                <td className="py-1.5 pr-2 pt-3.5 text-xs text-fg-muted">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <Input aria-label={t(`Beschreibung Position ${i + 1}`, `Description line ${i + 1}`)} value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2">
                  <Input aria-label={t(`Menge Position ${i + 1}`, `Quantity line ${i + 1}`)} inputMode="decimal" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2">
                  <Select aria-label={t(`Einheit Position ${i + 1}`, `Unit line ${i + 1}`)} value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })}>
                    {invoiceUnits.map((u) => (
                      <option key={u} value={u}>
                        {unitText[u][locale]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    aria-label={t(`Einzelpreis Position ${i + 1}`, `Unit price line ${i + 1}`)}
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => update(l.key, { unitPrice: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Select
                    aria-label={t(`Steuersatz Position ${i + 1}`, `Tax rate line ${i + 1}`)}
                    value={head.reverseCharge ? 0 : l.taxRateBp}
                    disabled={head.reverseCharge}
                    onChange={(e) => update(l.key, { taxRateBp: Number(e.target.value) })}
                  >
                    {taxRates.map((r) => (
                      <option key={r} value={r}>
                        {r / 100} %
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1.5 pt-3 text-right tabular-nums">{computed.built[i] ? formatMoney(computed.built[i]!.netCents, locale) : "–"}</td>
                <td className="py-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-danger"
                    aria-label={t("Position entfernen", "Remove line")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLines((ls) => [...ls, { key: key(), description: "", quantity: "1", unit: "flat", unitPrice: "0", taxRateBp: defaultTaxRateBp }])}
        >
          <Plus className="size-4" />
          {t("Position", "Line")}
        </Button>
        {rates.length > 0 && (
          <div className="w-full sm:w-96">
            <Select
              aria-label={t("Position aus Tarif", "Line from rate")}
              value=""
              onChange={(e) => {
                const r = rates.find((x) => x.id === e.target.value);
                if (r) setLines((ls) => [...ls, { key: key(), description: r.name, quantity: "1", unit: r.unit, unitPrice: (r.priceCents / 100).toFixed(2), taxRateBp: r.taxRateBp }]);
              }}
            >
              <option value="">{t("+ aus Tarif …", "+ from rate …")}</option>
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {formatMoney(r.priceCents, locale)} / {unitText[r.unit]?.[locale] ?? r.unit}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <dl className="ml-auto w-full max-w-sm space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t("Summe netto", "Total net")}</dt>
          <dd className="tabular-nums">{formatMoney(computed.sum.netCents, locale)}</dd>
        </div>
        {computed.sum.groups.map((g) => (
          <div key={g.taxRateBp} className="flex justify-between">
            <dt className="text-fg-muted">
              {t("USt.", "VAT")} {g.taxRateBp / 100} %
            </dt>
            <dd className="tabular-nums">{formatMoney(g.taxCents, locale)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <dt>{t("Gesamt", "Total")}</dt>
          <dd className="tabular-nums">{formatMoney(computed.sum.grossCents, locale)}</dd>
        </div>
      </dl>

      <Field label={t("Hinweis auf der Rechnung", "Note on the invoice")} htmlFor="inv_notes">
        <Textarea id="inv_notes" rows={2} value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={save} disabled={pending}>
          {t("Entwurf speichern", "Save draft")}
        </Button>
        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener" className="text-sm font-medium underline">
          {t("PDF-Vorschau", "PDF preview")}
        </a>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Checkbox label={t("per E-Mail an das Projekt senden", "email to the project")} checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
          <Button type="button" onClick={issue} disabled={pending}>
            {t("Rechnung ausstellen", "Issue invoice")}
          </Button>
        </div>
      </div>
    </div>
  );
}
