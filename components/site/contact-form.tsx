"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitContact, type ContactState } from "@/lib/actions/contact";
import { legalPath, type Locale } from "@/lib/i18n/config";
import { inquiryTopicLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";

const fieldClass =
  "block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-signal/40";

export function ContactForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { ok: false });

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-white/5 p-6 ring-1 ring-white/10" role="status">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-400" aria-hidden="true" />
        <div>
          <p className="font-semibold text-white">{t("Danke, Ihre Anfrage ist eingegangen.", "Thank you, your request has been received.")}</p>
          <p className="mt-1 text-sm text-white/70">{t("Wir melden uns zeitnah bei Ihnen.", "We will get back to you shortly.")}</p>
        </div>
      </div>
    );
  }

  const err = (name: string) => state.fields?.[name];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="block text-sm text-white/80">
        {t("Name", "Name")} *
        <input name="name" required autoComplete="name" className={`${fieldClass} mt-1.5`} aria-invalid={!!err("name")} />
      </label>
      <label className="block text-sm text-white/80">
        {t("E-Mail", "Email")} *
        <input name="email" type="email" required autoComplete="email" className={`${fieldClass} mt-1.5`} aria-invalid={!!err("email")} />
      </label>
      <label className="block text-sm text-white/80">
        {t("Organisation", "Organisation")}
        <input name="organization" autoComplete="organization" className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="block text-sm text-white/80">
        {t("Telefon", "Phone")}
        <input name="phone" type="tel" autoComplete="tel" className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="block text-sm text-white/80 sm:col-span-2">
        {t("Thema", "Topic")} *
        <select name="topic" required className={`${fieldClass} mt-1.5`} defaultValue="testing">
          {Object.entries(inquiryTopicLabels).map(([value, text]) => (
            <option key={value} value={value} className="text-ink">
              {text[locale]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-white/80 sm:col-span-2">
        {t("Nachricht", "Message")} *
        <textarea name="message" required rows={5} className={`${fieldClass} mt-1.5`} aria-invalid={!!err("message")} />
      </label>
      <label className="flex items-start gap-2.5 text-sm text-white/70 sm:col-span-2">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-signal" aria-invalid={!!err("consent")} />
        <span>
          {t("Ich habe die ", "I have read the ")}
          <Link href={legalPath(locale, "privacy")} className="underline hover:text-white">
            {t("Datenschutzerklärung", "privacy policy")}
          </Link>
          {t(
            " gelesen. Meine Angaben werden zur Bearbeitung der Anfrage gespeichert und nach 12 Monaten gelöscht.",
            ". My details will be stored to handle the request and deleted after 12 months.",
          )}
        </span>
      </label>
      {state.error && (
        <p className="text-sm font-medium text-red-300 sm:col-span-2" role="alert">
          {state.error === "invalid"
            ? t("Bitte prüfen Sie die markierten Felder und die Zustimmung.", "Please check the highlighted fields and the consent box.")
            : state.error === "rate"
              ? t("Zu viele Anfragen. Bitte versuchen Sie es später erneut.", "Too many requests. Please try again later.")
              : t("Senden fehlgeschlagen. Bitte versuchen Sie es erneut.", "Sending failed. Please try again.")}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center rounded-lg bg-signal px-6 font-semibold text-white hover:bg-signal-600 disabled:opacity-60">
          {pending ? t("Wird gesendet …", "Sending …") : t("Anfrage senden", "Send request")}
        </button>
      </div>
    </form>
  );
}
