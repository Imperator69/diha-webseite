"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, CheckCircle2, CircleAlert, FileCheck2, Info } from "lucide-react";
import { SiteMap } from "@/components/site-map/site-map";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { saveBookingAction } from "@/lib/actions/bookings";
import type { Locale } from "@/lib/i18n/config";
import { errorText } from "@/lib/i18n/errors";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { docKindLabels, label, personRoleLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { estimateLines } from "@/lib/pricing";
import { evaluateBooking, requirementsFor, type Issue } from "@/lib/rules/engine";
import { issueText } from "@/lib/rules/messages";
import { DocUploader } from "./doc-uploader";
import type { WizardData, WizardPerson, WizardState } from "./types";
import { WeekPicker } from "./week-picker";

type StepKey = "use" | "area" | "time" | "details" | "persons" | "docs" | "review";

const steps: { key: StepKey; de: string; en: string }[] = [
  { key: "use", de: "Nutzung", en: "Use" },
  { key: "area", de: "Bereich", en: "Area" },
  { key: "time", de: "Termin", en: "Date" },
  { key: "details", de: "Details", en: "Details" },
  { key: "persons", de: "Verantwortliche", en: "Responsible persons" },
  { key: "docs", de: "Unterlagen", en: "Documents" },
  { key: "review", de: "Prüfen & senden", en: "Review & send" },
];

// welche Regelverstöße zu welchem Schritt gehören
const issueStep: Record<string, StepKey> = {
  no_activity: "use",
  inactive_activity: "use",
  no_zone: "area",
  zone_not_bookable: "area",
  activity_zone_mismatch: "area",
  zone_unused: "area",
  no_period: "time",
  period_invalid: "time",
  period_past: "time",
  lead_time: "time",
  blocked: "time",
  capacity: "time",
  conflict: "time",
  missing_field: "details",
  field_range: "details",
  missing_role: "persons",
  role_incomplete: "persons",
  missing_doc: "docs",
  doc_expired: "docs",
};

export function BookingWizard({ locale, data, initial, initialStep }: { locale: Locale; data: WizardData; initial: WizardState; initialStep?: StepKey }) {
  const t = translator(locale);
  const router = useRouter();
  const [state, setState] = useState<WizardState>(initial);
  const [step, setStep] = useState<StepKey>(initialStep ?? "use");
  const [terms, setTerms] = useState(false);
  const [serverIssues, setServerIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => setState((s) => ({ ...s, [key]: value }));
  const selectedActivities = data.activities.filter((a) => state.activityCodes.includes(a.code));
  const requirements = useMemo(() => requirementsFor(state, data.activities, data.guestThreshold), [state, data.activities, data.guestThreshold]);
  const docs = useMemo(() => [...(data.docsByProject[state.projectId] ?? []), ...data.bookingDocs], [data.docsByProject, data.bookingDocs, state.projectId]);

  const evaluation = useMemo(
    () =>
      evaluateBooking(
        { ...state, docs },
        {
          activities: data.activities,
          zones: data.zones,
          others: data.others.filter((o) => o.id !== state.id),
          blocks: data.blocks,
          nowMs: data.nowMs,
          enforceLeadTime: !data.staff && !data.leadTimeOverride,
          guestThreshold: data.guestThreshold,
        },
      ),
    [state, docs, data],
  );
  const issuesFor = (key: StepKey) => evaluation.issues.filter((i) => issueStep[i.code] === key);

  const zoneCodes = Object.fromEntries(data.zones.map((z) => [z.id, z.code]));
  const estimate = estimateLines({ rates: data.rates, periods: state.periods, zoneIds: state.zoneIds, zoneCodes, activityCodes: state.activityCodes, participants: state.participantsCount, locale });
  const estimateTotal = estimate.reduce((s, l) => s + l.netCents, 0);

  const compatibleZoneIds = data.zones
    .filter((z) => z.bookable && (selectedActivities.length === 0 || selectedActivities.some((a) => a.allowedZoneKinds.includes(z.kind))))
    .map((z) => z.id);

  const stepIndex = steps.findIndex((s) => s.key === step);
  const go = (delta: number) => setStep(steps[Math.min(Math.max(stepIndex + delta, 0), steps.length - 1)].key);

  function payload(mode: "draft" | "submit") {
    return {
      id: state.id,
      projectId: state.projectId,
      title: state.title || selectedActivities.map((a) => (locale === "en" ? a.nameEn : a.nameDe)).join(", ") || t("Buchung", "Booking"),
      activityCodes: state.activityCodes,
      zoneIds: state.zoneIds,
      periods: state.periods,
      details: state.details,
      persons: state.persons,
      participants: state.participants,
      participantsCount: Math.max(1, state.participantsCount),
      guestsCount: Math.max(0, state.guestsCount),
      notesProject: state.notesProject,
      termsAccepted: terms,
      mode,
      locale,
    };
  }

  function saveDraft(goToDocs: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveBookingAction(payload("draft"));
      if (!res.ok || !res.id) {
        setError(res.error ?? "server");
        return;
      }
      setState((s) => ({ ...s, id: res.id }));
      if (goToDocs || !state.id) router.replace(`/${locale}/portal/buchungen/${res.id}/bearbeiten?step=${goToDocs ? "docs" : step}`);
      else router.refresh();
    });
  }

  function submit() {
    setError(null);
    setServerIssues(null);
    startTransition(async () => {
      const res = await saveBookingAction(payload("submit"));
      if (res.ok && res.id) {
        router.push(`/${locale}/portal/buchungen/${res.id}?saved=submitted`);
        return;
      }
      if (res.id && !state.id) setState((s) => ({ ...s, id: res.id }));
      if (res.issues) setServerIssues(res.issues);
      setError(res.error ?? "server");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <ol className="flex flex-wrap gap-2" aria-label={t("Schritte", "Steps")}>
          {steps.map((s, i) => {
            const hasErrors = issuesFor(s.key).some((x) => x.severity === "error");
            const active = s.key === step;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setStep(s.key)}
                  aria-current={active ? "step" : undefined}
                  className={clsx(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
                    active ? "bg-ink text-white ring-ink" : "bg-card ring-border hover:bg-bg-subtle",
                  )}
                >
                  <span className={clsx("flex size-5 items-center justify-center rounded-full text-[10px]", active ? "bg-signal" : hasErrors && i < stepIndex ? "bg-danger/15 text-danger" : "bg-bg-subtle")}>
                    {i + 1}
                  </span>
                  {locale === "en" ? s.en : s.de}
                </button>
              </li>
            );
          })}
        </ol>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          {step === "use" && (
            <div className="space-y-5">
              <Header title={t("Was möchten Sie tun?", "What would you like to do?")} text={t("Mehrfachauswahl möglich. Die Pflichtangaben ergeben sich aus der Auswahl.", "Multiple selection possible. Requirements follow from your choice.")} />
              {data.projects.length > 1 && (
                <Field label={t("Projekt", "Project")} htmlFor="project">
                  <Select id="project" value={state.projectId} onChange={(e) => set("projectId", e.target.value)} disabled={Boolean(state.id)}>
                    {data.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {data.activities
                  .filter((a) => a.active)
                  .map((a) => {
                    const on = state.activityCodes.includes(a.code);
                    return (
                      <label
                        key={a.code}
                        className={clsx("flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors", on ? "border-signal bg-signal/5" : "border-border hover:bg-bg-subtle")}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-signal"
                          checked={on}
                          onChange={() => set("activityCodes", on ? state.activityCodes.filter((c) => c !== a.code) : [...state.activityCodes, a.code])}
                        />
                        <span>
                          <span className="block font-semibold">{locale === "en" ? a.nameEn : a.nameDe}</span>
                          <span className="mt-1 block text-sm text-fg-muted">{locale === "en" ? a.descEn : a.descDe}</span>
                          <span className="mt-2 block text-xs text-fg-muted">
                            {t("Vorlauf", "Lead time")}: {a.leadDays} {t("Tage", "days")} · {a.requiredRoles.map((r) => label(personRoleLabels, r, locale)).join(", ")}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {step === "area" && (
            <div className="space-y-5">
              <Header title={t("Wo soll es stattfinden?", "Where will it take place?")} text={t("Zone anklicken, heranzoomen und auswählen. Nur passende Bereiche sind wählbar.", "Click a zone, zoom in and select it. Only suitable areas can be selected.")} />
              <SiteMap
                zones={data.zones}
                locale={locale}
                baseImageUrl={data.baseImageUrl}
                tone="light"
                selectable
                selectedIds={state.zoneIds}
                disabledIds={data.zones.filter((z) => !compatibleZoneIds.includes(z.id)).map((z) => z.id)}
                onToggle={(id) => set("zoneIds", state.zoneIds.includes(id) ? state.zoneIds.filter((z) => z !== id) : [...state.zoneIds, id])}
              />
              <IssueList locale={locale} activities={data.activities} issues={issuesFor("area")} />
            </div>
          )}

          {step === "time" && (
            <div className="space-y-5">
              <Header
                title={t("Wann?", "When?")}
                text={t("Freie Zeitfenster für die gewählten Bereiche. Belegung anderer Projekte wird nur als „belegt“ angezeigt.", "Free time slots for the selected areas. Other projects’ bookings are only shown as “booked”.")}
              />
              {state.zoneIds.length === 0 && <Alert tone="warn">{t("Bitte zuerst einen Bereich wählen.", "Please choose an area first.")}</Alert>}
              <WeekPicker locale={locale} data={data} zoneIds={state.zoneIds} activityCodes={state.activityCodes} leadDays={requirements.leadDays} periods={state.periods} onChange={(p) => set("periods", p)} />
              <IssueList locale={locale} activities={data.activities} issues={issuesFor("time")} />
            </div>
          )}

          {step === "details" && (
            <div className="space-y-6">
              <Header title={t("Angaben zum Vorhaben", "Details of the activity")} />
              <div className="grid gap-4 md:grid-cols-[1fr_140px_140px]">
                <Field label={t("Titel der Buchung", "Booking title")} htmlFor="title" hint={t("z. B. „Flugtest Prototyp X8“", "e.g. “Flight test prototype X8”")}>
                  <Input id="title" value={state.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
                </Field>
                <Field label={t("Personen gesamt", "People in total")} htmlFor="pc">
                  <Input id="pc" type="number" min={1} value={state.participantsCount} onChange={(e) => set("participantsCount", Number(e.target.value))} />
                </Field>
                <Field label={t("davon Gäste", "of which guests")} htmlFor="gc">
                  <Input id="gc" type="number" min={0} value={state.guestsCount} onChange={(e) => set("guestsCount", Number(e.target.value))} />
                </Field>
              </div>
              {selectedActivities.map((a) => (
                <fieldset key={a.code} className="rounded-xl border border-border p-4">
                  <legend className="px-1 text-sm font-semibold">{locale === "en" ? a.nameEn : a.nameDe}</legend>
                  <div className="grid gap-4 md:grid-cols-2">
                    {a.detailFields.map((f) => {
                      const value = state.details[a.code]?.[f.key];
                      const update = (v: unknown) => set("details", { ...state.details, [a.code]: { ...(state.details[a.code] ?? {}), [f.key]: v } });
                      const id = `${a.code}-${f.key}`;
                      const labelText = `${locale === "en" ? f.en : f.de}${f.unit ? ` (${f.unit})` : ""}`;
                      if (f.type === "boolean")
                        return <Checkbox key={f.key} id={id} checked={Boolean(value)} onChange={(e) => update(e.target.checked)} label={labelText} className="md:col-span-2" />;
                      return (
                        <Field key={f.key} label={labelText} htmlFor={id} required={f.required} className={f.type === "textarea" ? "md:col-span-2" : undefined}>
                          {f.type === "textarea" ? (
                            <Textarea id={id} value={String(value ?? "")} onChange={(e) => update(e.target.value)} />
                          ) : f.type === "select" ? (
                            <Select id={id} value={String(value ?? "")} onChange={(e) => update(e.target.value)}>
                              <option value="">–</option>
                              {f.options?.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {locale === "en" ? o.en : o.de}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Input
                              id={id}
                              type={f.type === "number" ? "number" : "text"}
                              step="any"
                              min={f.min}
                              max={f.max}
                              value={value === undefined || value === null ? "" : String(value)}
                              onChange={(e) => update(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                            />
                          )}
                        </Field>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <Field label={t("Hinweise für DIHA", "Notes for DIHA")} htmlFor="notes">
                <Textarea id="notes" value={state.notesProject} onChange={(e) => set("notesProject", e.target.value)} />
              </Field>
              <IssueList locale={locale} activities={data.activities} issues={issuesFor("details")} />
            </div>
          )}

          {step === "persons" && (
            <div className="space-y-6">
              <Header
                title={t("Verantwortliche Personen", "Responsible persons")}
                text={t("Pflichtrollen ergeben sich aus den Nutzungsarten. Bei jeder Sprengung muss eine sprengbefugte Person vor Ort sein.", "Required roles follow from the types of use. Every detonation requires a licensed blaster on site.")}
              />
              <div className="space-y-4">
                {requirements.roles.map((role) => (
                  <PersonEditor
                    key={role}
                    locale={locale}
                    role={role}
                    person={state.persons.find((p) => p.role === role)}
                    onChange={(p) => set("persons", [...state.persons.filter((x) => x.role !== role), p])}
                  />
                ))}
                {requirements.roles.length === 0 && <p className="text-sm text-fg-muted">{t("Bitte zuerst Nutzungsarten wählen.", "Please choose types of use first.")}</p>}
              </div>
              <ParticipantsEditor locale={locale} state={state} threshold={data.guestThreshold} onChange={(participants) => set("participants", participants)} />
              <IssueList locale={locale} activities={data.activities} issues={issuesFor("persons")} />
            </div>
          )}

          {step === "docs" && (
            <div className="space-y-6">
              <Header
                title={t("Unterlagen", "Documents")}
                text={t("Nachweise je Nutzungsart. Bereits im Projekt hinterlegte, gültige Unterlagen werden automatisch berücksichtigt.", "Documents per type of use. Valid documents already stored for the project are used automatically.")}
              />
              {!state.id ? (
                <div className="space-y-3">
                  <Alert tone="info">{t("Zum Hochladen wird die Buchung als Entwurf gespeichert.", "To upload, the booking is saved as a draft.")}</Alert>
                  <Button type="button" onClick={() => saveDraft(true)} disabled={pending}>
                    {t("Entwurf speichern und Unterlagen hochladen", "Save draft and upload documents")}
                  </Button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {requirements.docs.map((kind) => {
                    const have = docs.filter((d) => d.kind === kind && d.status !== "rejected");
                    return (
                      <li key={kind} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-2 font-medium">
                            {have.length ? <FileCheck2 className="size-4 text-ok" /> : <CircleAlert className="size-4 text-danger" />}
                            {label(docKindLabels, kind, locale)}
                          </p>
                          {have.map((d) => (
                            <span key={d.id} className="text-xs text-fg-muted">
                              {d.title} {d.validUntil ? `· ${t("gültig bis", "valid until")} ${formatDate(d.validUntil, locale)}` : ""} {d.scope === "project" ? `· ${t("Projekt", "project")}` : ""}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3">
                          <DocUploader locale={locale} scope="booking" kind={kind} bookingId={state.id} projectId={state.projectId} offerProjectScope />
                        </div>
                      </li>
                    );
                  })}
                  {requirements.docs.length === 0 && <p className="text-sm text-fg-muted">{t("Für die gewählten Nutzungsarten sind keine Unterlagen vorgeschrieben.", "No documents are required for the selected types of use.")}</p>}
                </ul>
              )}
              <IssueList locale={locale} activities={data.activities} issues={issuesFor("docs")} />
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <Header title={t("Prüfen und senden", "Review and send")} />
              {evaluation.ok ? (
                <Alert tone="ok">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    {t("Alle Angaben vollständig. DIHA prüft die Anfrage und bestätigt den Termin.", "All details complete. DIHA will review the request and confirm the date.")}
                  </span>
                </Alert>
              ) : (
                <Alert tone="warn">{t("Noch offen:", "Still open:")}</Alert>
              )}
              <IssueList locale={locale} activities={data.activities} issues={serverIssues ?? evaluation.issues} />
              <div className="rounded-xl bg-bg-subtle p-4 text-sm">
                <p className="font-semibold">{t("Kostenschätzung (netto)", "Cost estimate (net)")}</p>
                {estimateTotal > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {estimate
                      .filter((l) => l.netCents > 0)
                      .map((l, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>
                            {l.description} · {l.quantityMilli / 1000}
                          </span>
                          <span className="tabular-nums">{formatMoney(l.netCents, locale)}</span>
                        </li>
                      ))}
                    <li className="flex justify-between border-t border-border pt-1 font-semibold">
                      <span>{t("Summe netto", "Total net")}</span>
                      <span className="tabular-nums">{formatMoney(estimateTotal, locale)}</span>
                    </li>
                  </ul>
                ) : (
                  <p className="mt-1 text-fg-muted">{t("Preis auf Anfrage. Sie erhalten ein Angebot mit der Bestätigung.", "Price on request. You will receive an offer with the confirmation.")}</p>
                )}
              </div>
              <Checkbox
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label={t(
                  "Ich bestätige die Richtigkeit der Angaben und die Nutzungsbedingungen des Testgeländes, insbesondere Briefing, Zutrittsregeln und Weisungen der Range Safety vor Ort.",
                  "I confirm that the details are correct and accept the site terms of use, in particular the briefing, access rules and on-site range safety instructions.",
                )}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={submit} disabled={pending || !terms}>
                  {pending ? t("Wird gesendet …", "Sending …") : t("Anfrage senden", "Send request")}
                </Button>
              </div>
            </div>
          )}

          {error && error !== "rules" && <p className="mt-4 text-sm font-medium text-danger">{error === "terms" ? t("Bitte die Nutzungsbedingungen bestätigen.", "Please accept the terms of use.") : errorText(locale, error)}</p>}

          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => go(-1)} disabled={stepIndex === 0}>
              {t("Zurück", "Back")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => saveDraft(false)} disabled={pending}>
                {t("Entwurf speichern", "Save draft")}
              </Button>
              {step !== "review" && (
                <Button type="button" onClick={() => go(1)}>
                  {t("Weiter", "Next")}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 xl:sticky xl:top-24">
        <h2 className="font-semibold">{t("Zusammenfassung", "Summary")}</h2>
        <SummaryRow label={t("Nutzung", "Use")} value={selectedActivities.map((a) => (locale === "en" ? a.nameEn : a.nameDe)).join(", ")} />
        <SummaryRow label={t("Bereiche", "Areas")} value={state.zoneIds.map((z) => zoneCodes[z]).join(", ")} />
        <SummaryRow label={t("Termine", "Dates")} value={state.periods.length ? `${state.periods.length} · ${t("ab", "from")} ${formatDate(state.periods[0].startsAt, locale)}` : ""} />
        <SummaryRow label={t("Vorlauf", "Lead time")} value={requirements.leadDays ? `${requirements.leadDays} ${t("Tage", "days")}` : ""} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Pflichtpersonen", "Required persons")}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {requirements.roles.map((r) => {
              const ok = state.persons.some((p) => p.role === r && p.name && p.phone);
              return (
                <li key={r} className="flex items-center gap-2">
                  {ok ? <Check className="size-3.5 text-ok" /> : <span className="size-3.5 rounded-full border border-fg-muted/50" />}
                  {label(personRoleLabels, r, locale)}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Unterlagen", "Documents")}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {requirements.docs.map((d) => {
              const ok = docs.some((x) => x.kind === d && x.status !== "rejected");
              return (
                <li key={d} className="flex items-center gap-2">
                  {ok ? <Check className="size-3.5 text-ok" /> : <span className="size-3.5 shrink-0 rounded-full border border-fg-muted/50" />}
                  <span className="truncate">{label(docKindLabels, d, locale)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", evaluation.ok ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn")}>
          {evaluation.ok ? <CheckCircle2 className="size-4" /> : <Info className="size-4" />}
          {evaluation.ok ? t("Bereit zum Senden", "Ready to send") : `${evaluation.issues.filter((i) => i.severity === "error").length} ${t("offene Punkte", "open items")}`}
        </p>
      </aside>
    </div>
  );
}

function IssueList({ issues, locale, activities }: { issues: Issue[]; locale: Locale; activities: WizardData["activities"] }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1.5">
      {issues.map((i, n) => (
        <li key={`${i.code}-${n}`} className={clsx("flex items-start gap-2 text-sm", i.severity === "error" ? "text-danger" : "text-warn")}>
          {i.severity === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          {issueText(i, locale, activities)}
        </li>
      ))}
    </ul>
  );
}

function Header({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="mt-1 text-sm text-fg-muted">{text}</p>}
    </div>
  );
}

function SummaryRow({ label: l, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{l}</p>
      <p className="text-sm">{value || "–"}</p>
    </div>
  );
}

function PersonEditor({ locale, role, person, onChange }: { locale: Locale; role: string; person?: WizardPerson; onChange: (p: WizardPerson) => void }) {
  const t = translator(locale);
  const p: WizardPerson = person ?? { role, name: "", email: "", phone: "", qualification: "" };
  const update = (k: keyof WizardPerson, v: string) => onChange({ ...p, [k]: v });
  const isBlaster = role === "blaster";
  return (
    <fieldset className={clsx("rounded-xl border p-4", isBlaster ? "border-signal/50 bg-signal/5" : "border-border")}>
      <legend className="px-1 text-sm font-semibold">
        {label(personRoleLabels, role, locale)} <span className="text-signal">*</span>
      </legend>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={t("Name", "Name")} htmlFor={`${role}-name`} required>
          <Input id={`${role}-name`} value={p.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label={t("Telefon (vor Ort erreichbar)", "Phone (reachable on site)")} htmlFor={`${role}-phone`} required>
          <Input id={`${role}-phone`} type="tel" value={p.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>
        <Field label={t("E-Mail", "Email")} htmlFor={`${role}-email`}>
          <Input id={`${role}-email`} type="email" value={p.email} onChange={(e) => update("email", e.target.value)} />
        </Field>
        <Field
          label={isBlaster ? t("Nachweis der Sprengbefugnis (Aussteller, Nummer, gültig bis)", "Blasting licence (issuer, number, valid until)") : t("Qualifikation / Nachweis", "Qualification / certificate")}
          htmlFor={`${role}-qual`}
          required={isBlaster}
          className="md:col-span-3"
        >
          <Input id={`${role}-qual`} value={p.qualification} onChange={(e) => update("qualification", e.target.value)} />
        </Field>
      </div>
    </fieldset>
  );
}

function ParticipantsEditor({ locale, state, threshold, onChange }: { locale: Locale; state: WizardState; threshold: number; onChange: (p: WizardState["participants"]) => void }) {
  const t = translator(locale);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [guest, setGuest] = useState(false);
  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{t("Teilnehmende für die Zutrittsliste", "Participants for the access list")}</legend>
      <p className="text-xs text-fg-muted">
        {t(`Namentliche Registrierung aller Personen am Gelände. Ab ${threshold} Gästen ist eine Teilnehmerliste Pflicht.`, `All persons on site are registered by name. A participant list is mandatory from ${threshold} guests.`)}
      </p>
      <div className="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Input placeholder={t("Name", "Name")} value={name} onChange={(e) => setName(e.target.value)} aria-label={t("Name", "Name")} />
        <Input placeholder={t("Organisation", "Organisation")} value={org} onChange={(e) => setOrg(e.target.value)} aria-label={t("Organisation", "Organisation")} />
        <Checkbox checked={guest} onChange={(e) => setGuest(e.target.checked)} label={t("Gast", "Guest")} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!name.trim()) return;
            onChange([...state.participants, { name: name.trim(), organization: org.trim(), isGuest: guest }]);
            setName("");
          }}
        >
          {t("Hinzufügen", "Add")}
        </Button>
      </div>
      {state.participants.length > 0 && (
        <ul className="mt-3 divide-y divide-border text-sm">
          {state.participants.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center justify-between py-1.5">
              <span>
                {p.name} {p.organization && <span className="text-fg-muted">· {p.organization}</span>} {p.isGuest && <span className="text-xs text-warn">({t("Gast", "guest")})</span>}
              </span>
              <button type="button" className="text-xs text-danger hover:underline" onClick={() => onChange(state.participants.filter((_, j) => j !== i))}>
                {t("Entfernen", "Remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
