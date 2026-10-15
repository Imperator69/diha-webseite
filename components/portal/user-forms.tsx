"use client";

import { useActionState } from "react";
import { createUserAction, resendInviteAction, updateUserAction } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/auth";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { roleLabels, userStatusLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { CopyField, FormStatus } from "./form-status";

type ProjectOption = { id: string; name: string; organization: string };

function ProjectPicker({ locale, projects, selected }: { locale: Locale; projects: ProjectOption[]; selected: string[] }) {
  const t = translator(locale);
  if (projects.length === 0) return <p className="text-sm text-fg-muted">{t("Noch keine Projekte angelegt.", "No projects yet.")}</p>;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("Projekte (nur Rolle Projekt)", "Projects (project role only)")}</legend>
      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
        {projects.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="projects" value={p.id} defaultChecked={selected.includes(p.id)} className="size-4 accent-signal" />
            <span className="font-medium">{p.name}</span>
            <span className="text-fg-muted">· {p.organization}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InviteResult({ locale, data }: { locale: Locale; data: Record<string, unknown> }) {
  const t = translator(locale);
  return (
    <div className="space-y-3">
      <Alert tone={data.delivered ? "ok" : "warn"}>
        {data.delivered
          ? t("Einladung per E-Mail versendet.", "Invitation sent by email.")
          : t(
              "E-Mail-Versand ist nicht konfiguriert. Bitte den Link sicher an die Person weitergeben (7 Tage gültig).",
              "Email sending is not configured. Please pass the link on securely (valid for 7 days).",
            )}
      </Alert>
      {!data.delivered && typeof data.link === "string" && <CopyField value={data.link} label={t("Einladungslink", "Invitation link")} />}
    </div>
  );
}

export function UserCreateForm({ locale, projects }: { locale: Locale; projects: ProjectOption[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, {});
  if (state.ok && state.data) {
    return (
      <div className="space-y-4">
        <InviteResult locale={locale} data={state.data} />
        <a href={`/${locale}/portal/benutzer/${String(state.data.id)}`} className="text-sm font-semibold text-signal">
          {t("Zum Benutzer", "Open user")}
        </a>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <div className="sm:col-span-2">
        <FormStatus state={state} locale={locale} />
      </div>
      <Field label={t("Name", "Name")} htmlFor="name" required>
        <Input id="name" name="name" required />
      </Field>
      <Field label={t("E-Mail", "Email")} htmlFor="email" required>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label={t("Rolle", "Role")} htmlFor="role" required>
        <Select id="role" name="role" defaultValue="project">
          {Object.entries(roleLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v[locale]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("Sprache", "Language")} htmlFor="preferred_locale">
        <Select id="preferred_locale" name="preferred_locale" defaultValue={locale}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Field label={t("Telefon", "Phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" />
      </Field>
      <div className="sm:col-span-2">
        <ProjectPicker locale={locale} projects={projects} selected={[]} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {t("Anlegen und einladen", "Create and invite")}
        </Button>
      </div>
    </form>
  );
}

type EditableUser = { id: string; name: string; email: string; role: string; status: string; locale: string; phone: string | null };

export function UserEditForm({ locale, user, projects, selected }: { locale: Locale; user: EditableUser; projects: ProjectOption[]; selected: string[] }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(updateUserAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={user.id} />
      <div className="sm:col-span-2">
        <FormStatus state={state} locale={locale} okText={t("Gespeichert.", "Saved.")} />
      </div>
      <Field label={t("Name", "Name")} htmlFor="name" required>
        <Input id="name" name="name" defaultValue={user.name} required />
      </Field>
      <Field label={t("E-Mail", "Email")}>
        <Input value={user.email} readOnly disabled />
      </Field>
      <Field label={t("Rolle", "Role")} htmlFor="role">
        <Select id="role" name="role" defaultValue={user.role}>
          {Object.entries(roleLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v[locale]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("Status", "Status")} htmlFor="status">
        <Select id="status" name="status" defaultValue={user.status}>
          {Object.entries(userStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v[locale]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("Sprache", "Language")} htmlFor="preferred_locale">
        <Select id="preferred_locale" name="preferred_locale" defaultValue={user.locale}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Field label={t("Telefon", "Phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <ProjectPicker locale={locale} projects={projects} selected={selected} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {t("Speichern", "Save")}
        </Button>
      </div>
    </form>
  );
}

export function ResendInviteForm({ locale, userId, active }: { locale: Locale; userId: string; active: boolean }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(resendInviteAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={userId} />
      {state.ok && state.data?.kind === "invite" && <InviteResult locale={locale} data={state.data} />}
      {state.ok && state.data?.kind === "reset" && (
        <Alert tone={state.data.delivered ? "ok" : "warn"}>
          {state.data.delivered
            ? t("Link zum Zurücksetzen versendet.", "Reset link sent.")
            : t("E-Mail-Versand nicht konfiguriert: Link liegt im Postausgang.", "Email not configured: the link is in the outbox.")}
        </Alert>
      )}
      <FormStatus state={state} locale={locale} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {active ? t("Passwort-Reset senden", "Send password reset") : t("Einladung erneut senden", "Resend invitation")}
      </Button>
    </form>
  );
}
