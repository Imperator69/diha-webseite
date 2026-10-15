"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { FormStatus } from "@/components/portal/form-status";
import type { FormState } from "@/lib/actions/auth";
import { addPaymentAction } from "@/lib/actions/invoices";
import type { Locale } from "@/lib/i18n/config";
import { paymentMethodLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";

export function PaymentForm({ locale, invoiceId, openCents, today, refund }: { locale: Locale; invoiceId: string; openCents: number; today: string; refund: boolean }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(addPaymentAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <FormStatus state={state} locale={locale} okText={t("Zahlung erfasst.", "Payment recorded.")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={refund ? t("Erstattet (€)", "Refunded (€)") : t("Betrag (€)", "Amount (€)")} htmlFor="pay_amount" required>
          <Input id="pay_amount" name="amount" inputMode="decimal" defaultValue={(Math.abs(openCents) / 100).toFixed(2).replace(".", locale === "de" ? "," : ".")} required />
        </Field>
        <Field label={t("Eingang am", "Received on")} htmlFor="pay_date" required>
          <Input id="pay_date" name="received_on" type="date" defaultValue={today} required />
        </Field>
        <Field label={t("Zahlungsart", "Method")} htmlFor="pay_method">
          <Select id="pay_method" name="method" defaultValue="transfer">
            {Object.entries(paymentMethodLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[locale]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Referenz / Kontoauszug", "Reference / statement")} htmlFor="pay_ref">
          <Input id="pay_ref" name="reference" />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {refund ? t("Erstattung erfassen", "Record refund") : t("Zahlung erfassen", "Record payment")}
      </Button>
    </form>
  );
}
