"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  acceptInviteAction,
  confirmTotpSetupAction,
  loginAction,
  requestResetAction,
  resetPasswordAction,
  verifySecondFactorAction,
  type FormState,
} from "@/lib/actions/auth";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { errorText } from "@/lib/i18n/errors";
import { translator } from "@/lib/i18n/t";

function ErrorBox({ locale, state }: { locale: Locale; state: FormState }) {
  if (!state.error) return null;
  return <Alert tone="danger">{errorText(locale, state.error)}</Alert>;
}

export function LoginForm({ locale, next }: { locale: Locale; next?: string }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <ErrorBox locale={locale} state={state} />
      <Field label={t("E-Mail", "Email")} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label={t("Passwort", "Password")} htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("Anmelden …", "Signing in …") : t("Anmelden", "Sign in")}
      </Button>
      <p className="text-center text-sm">
        <Link href={`/${locale}/portal/passwort-vergessen`} className="text-fg-muted underline-offset-4 hover:text-fg hover:underline">
          {t("Passwort vergessen?", "Forgot password?")}
        </Link>
      </p>
    </form>
  );
}

export function SecondFactorForm({ locale, next }: { locale: Locale; next?: string }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(verifySecondFactorAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <ErrorBox locale={locale} state={state} />
      <Field
        label={t("Code aus der Authenticator-App", "Code from your authenticator app")}
        htmlFor="code"
        hint={t("Alternativ einen Wiederherstellungscode (xxxxx-xxxxx) eingeben.", "Alternatively enter a recovery code (xxxxx-xxxxx).")}
      >
        <Input id="code" name="code" inputMode="text" autoComplete="one-time-code" required autoFocus className="text-center text-lg tracking-[0.3em]" />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("Bestätigen", "Verify")}
      </Button>
    </form>
  );
}

function PasswordFields({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <>
      <Field label={t("Neues Passwort", "New password")} htmlFor="password" hint={t("Mindestens 12 Zeichen, Buchstaben und Ziffern/Sonderzeichen.", "At least 12 characters, letters and digits/symbols.")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label={t("Passwort wiederholen", "Repeat password")} htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
    </>
  );
}

export function InviteForm({ locale, token, name, email }: { locale: Locale; token: string; name: string; email: string }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInviteAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <ErrorBox locale={locale} state={state} />
      <Field label={t("E-Mail", "Email")}>
        <Input value={email} readOnly disabled autoComplete="username" />
      </Field>
      <Field label={t("Name", "Name")} htmlFor="name" required>
        <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
      </Field>
      <PasswordFields locale={locale} />
      <Button type="submit" className="w-full" disabled={pending}>
        {t("Zugang aktivieren", "Activate account")}
      </Button>
    </form>
  );
}

export function ForgotForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(requestResetAction, {});
  if (state.ok)
    return (
      <Alert tone="ok">
        {t(
          "Falls ein aktives Konto mit dieser Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.",
          "If an active account with this address exists, we have sent a reset link.",
        )}
      </Alert>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ErrorBox locale={locale} state={state} />
      <Field label={t("E-Mail", "Email")} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("Link anfordern", "Request link")}
      </Button>
    </form>
  );
}

export function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  if (state.ok)
    return (
      <div className="space-y-4">
        <Alert tone="ok">{t("Passwort geändert. Sie können sich jetzt anmelden.", "Password changed. You can now sign in.")}</Alert>
        <Link href={`/${locale}/portal/login`} className="text-sm font-semibold text-signal">
          {t("Zur Anmeldung", "Go to sign in")}
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <ErrorBox locale={locale} state={state} />
      <PasswordFields locale={locale} />
      <Button type="submit" className="w-full" disabled={pending}>
        {t("Passwort speichern", "Save password")}
      </Button>
    </form>
  );
}

export function RecoveryCodes({ locale, codes, continueHref }: { locale: Locale; codes: string[]; continueHref?: string }) {
  const t = translator(locale);
  return (
    <div className="space-y-4">
      <Alert tone="warn">
        {t(
          "Speichern Sie diese Wiederherstellungscodes sicher. Jeder Code funktioniert genau einmal, falls Ihr Gerät nicht verfügbar ist. Sie werden nur jetzt angezeigt.",
          "Store these recovery codes safely. Each code works exactly once if your device is unavailable. They are shown only now.",
        )}
      </Alert>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-bg-subtle p-4 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {continueHref && (
        <a href={continueHref} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-signal px-4 text-sm font-semibold text-white hover:bg-signal-600">
          {t("Weiter zum Portal", "Continue to portal")}
        </a>
      )}
    </div>
  );
}

export function TotpSetupForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(confirmTotpSetupAction, {});
  if (state.ok && Array.isArray(state.data?.codes)) {
    return <RecoveryCodes locale={locale} codes={state.data.codes as string[]} continueHref={`/${locale}/portal`} />;
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <ErrorBox locale={locale} state={state} />
      <Field label={t("6-stelliger Code zur Bestätigung", "6-digit code to confirm")} htmlFor="code" required>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="text-center text-lg tracking-[0.3em]" />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("2FA aktivieren", "Enable 2FA")}
      </Button>
    </form>
  );
}
