"use client";

import { useActionState } from "react";
import { changePasswordAction, regenerateRecoveryCodesAction, updateProfileAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import { RecoveryCodes } from "./auth-forms";
import { FormStatus } from "./form-status";

export function ProfileForm({ locale, name, phone, preferred }: { locale: Locale; name: string; phone: string | null; preferred: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      <Field label={t("Name", "Name")} htmlFor="name" required>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label={t("Telefon", "Phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </Field>
      <Field label={t("Bevorzugte Sprache", "Preferred language")} htmlFor="preferred_locale">
        <Select id="preferred_locale" name="preferred_locale" defaultValue={preferred}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {t("Speichern", "Save")}
      </Button>
    </form>
  );
}

export function PasswordForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormStatus state={state} locale={locale} okText={t("Passwort geändert.", "Password changed.")} />
      <Field label={t("Aktuelles Passwort", "Current password")} htmlFor="current" required>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={t("Neues Passwort", "New password")} htmlFor="password" hint={t("Mindestens 12 Zeichen.", "At least 12 characters.")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label={t("Wiederholen", "Repeat")} htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {t("Passwort ändern", "Change password")}
      </Button>
    </form>
  );
}

export function RecoveryRegenForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(regenerateRecoveryCodesAction, {});
  if (state.ok && Array.isArray(state.data?.codes)) return <RecoveryCodes locale={locale} codes={state.data.codes as string[]} />;
  return (
    <form action={action}>
      <FormStatus state={state} locale={locale} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {t("Neue Wiederherstellungscodes erzeugen", "Generate new recovery codes")}
      </Button>
    </form>
  );
}
