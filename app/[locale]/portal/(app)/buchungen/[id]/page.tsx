import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";
import { DocList } from "@/components/booking/doc-list";
import { DocUploader } from "@/components/booking/doc-uploader";
import { Badge, bookingStatusTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form";
import {
  addRangeLogAction,
  cancelOwnBookingAction,
  commentAction,
  leadTimeOverrideAction,
  reviewStatusAction,
  siteClearanceAction,
  toggleCheckAction,
  verifyPersonAction,
} from "@/lib/actions/bookings";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { canSeeBooking, loadAvailableDocs, loadBooking, loadCatalog, loadOccupancy } from "@/lib/bookings/data";
import { db, schema } from "@/lib/db";
import { formatDateTime, formatMoney, formatTime } from "@/lib/i18n/format";
import { bookingStatusLabels, docKindLabels, label, personRoleLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { localeParam, sp, type PageProps } from "@/lib/portal/params";
import { evaluateBooking } from "@/lib/rules/engine";
import { issueText } from "@/lib/rules/messages";
import { nowMs, zonedDate } from "@/lib/time";
import { inArray } from "drizzle-orm";

const statusActions: Record<string, { to: string; de: string; en: string; variant: "primary" | "secondary" | "danger"; needsMessage?: boolean }[]> = {
  requested: [
    { to: "in_review", de: "Prüfung starten", en: "Start review", variant: "secondary" },
    { to: "confirmed", de: "Bestätigen", en: "Confirm", variant: "primary" },
    { to: "rejected", de: "Ablehnen", en: "Reject", variant: "danger", needsMessage: true },
  ],
  in_review: [
    { to: "confirmed", de: "Bestätigen", en: "Confirm", variant: "primary" },
    { to: "requested", de: "Zurück an Projekt", en: "Back to project", variant: "secondary" },
    { to: "rejected", de: "Ablehnen", en: "Reject", variant: "danger", needsMessage: true },
  ],
  confirmed: [
    { to: "completed", de: "Als durchgeführt abschließen", en: "Mark as completed", variant: "primary" },
    { to: "cancelled", de: "Stornieren", en: "Cancel", variant: "danger", needsMessage: true },
  ],
};

const errorTexts: Record<string, { de: string; en: string }> = {
  transition: { de: "Dieser Statuswechsel ist nicht möglich.", en: "This status change is not possible." },
  reason: { de: "Bitte eine Begründung angeben.", en: "Please give a reason." },
  rules: { de: "Die Buchung erfüllt noch nicht alle Regeln (siehe Prüfung).", en: "The booking does not yet meet all rules (see review)." },
  checklist: { de: "Bitte zuerst alle Prüfpunkte abhaken.", en: "Please tick all review items first." },
  not_started: { de: "Der Termin hat noch nicht begonnen.", en: "The booking has not started yet." },
  clearance: { de: "Vor dem Abschluss ist die Schlussfreigabe des Geländes zu dokumentieren.", en: "Document the site clearance before completing." },
};

export default async function BookingDetailPage({ params, searchParams }: PageProps<{ id: string }>) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const { id } = await params;
  const full = await loadBooking(id);
  if (!full || !canSeeBooking(viewer, full.booking.projectId)) notFound();
  const t = translator(locale);
  const q = await searchParams;
  const staff = isStaff(viewer.role);
  const { booking } = full;

  const catalog = await loadCatalog();
  const occupancy = await loadOccupancy(booking.firstStart ?? 0, booking.lastEnd ?? 0, booking.id);
  const allDocs = await loadAvailableDocs(booking.projectId, booking.id);
  const evaluation = evaluateBooking(
    { activityCodes: full.activityCodes, zoneIds: full.zoneIds, periods: full.periods, persons: full.persons, docs: allDocs, details: booking.details, participantsCount: booking.participantsCount, guestsCount: booking.guestsCount },
    { activities: catalog.activities, zones: catalog.zones, ...occupancy, nowMs: nowMs(), enforceLeadTime: !staff && !booking.leadTimeOverride },
  );
  const docRows = allDocs.length
    ? await db()
        .select()
        .from(schema.documents)
        .where(inArray(schema.documents.id, allDocs.map((d) => d.id)))
    : [];
  const activities = catalog.activities.filter((a) => full.activityCodes.includes(a.code));
  const zones = catalog.zones.filter((z) => full.zoneIds.includes(z.id));
  const done = new Map(full.checks.filter((c) => c.doneAt).map((c) => [c.key, c]));
  const editable = staff ? ["draft", "requested", "in_review"].includes(booking.status) : ["draft", "requested"].includes(booking.status);
  const projectCanCancel = !staff && ["draft", "requested", "in_review", "confirmed"].includes(booking.status) && (booking.firstStart ?? Infinity) > nowMs();
  const events = full.events.filter((e) => staff || e.event.visibleToProject);
  const error = sp(q.error);

  return (
    <>
      <PageHeader
        eyebrow={`${booking.number} · ${full.project?.name ?? ""}`}
        title={booking.title}
        actions={
          <>
            <Badge tone={bookingStatusTone[booking.status]} className="text-sm">
              {label(bookingStatusLabels, booking.status, locale)}
            </Badge>
            {editable && (
              <ButtonLink href={`/${locale}/portal/buchungen/${booking.id}/bearbeiten`} variant="secondary" size="sm">
                <Pencil className="size-3.5" />
                {t("Bearbeiten", "Edit")}
              </ButtonLink>
            )}
            {booking.status === "draft" && !staff && (
              <ButtonLink href={`/${locale}/portal/buchungen/${booking.id}/bearbeiten?step=review`} size="sm">
                {t("Prüfen & senden", "Review & send")}
              </ButtonLink>
            )}
          </>
        }
      />
      {sp(q.saved) === "submitted" && <Alert tone="ok" className="mb-4">{t("Anfrage gesendet. DIHA prüft die Angaben und meldet sich.", "Request sent. DIHA will review the details and get back to you.")}</Alert>}
      {sp(q.saved) && sp(q.saved) !== "submitted" && <Alert tone="ok" className="mb-4">{t("Gespeichert.", "Saved.")}</Alert>}
      {error && <Alert tone="danger" className="mb-4">{errorTexts[error]?.[locale] ?? error}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={t("Termine und Bereiche", "Dates and areas")} />
            <CardBody className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Termine", "Dates")}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {full.periods.map((p) => (
                    <li key={p.id} className="tabular-nums">
                      {formatDateTime(p.startsAt, locale)} – {zonedDate(p.endsAt) === zonedDate(p.startsAt) ? formatTime(p.endsAt, locale) : formatDateTime(p.endsAt, locale)}
                    </li>
                  ))}
                  {full.periods.length === 0 && <li className="text-fg-muted">–</li>}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Bereiche", "Areas")}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {zones.map((z) => (
                    <li key={z.id} className="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 py-1 text-xs">
                      <span className="size-2.5 rounded-sm" style={{ background: z.color }} />
                      {z.code} {locale === "en" ? z.nameEn : z.nameDe}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-fg-muted">
                  {t("Personen", "People")}: {booking.participantsCount} · {t("Gäste", "Guests")}: {booking.guestsCount}
                  {booking.priceEstimateCents ? ` · ${t("Schätzung netto", "Estimate net")} ${formatMoney(booking.priceEstimateCents, locale)}` : ""}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("Nutzung und Angaben", "Use and details")} />
            <CardBody className="space-y-5">
              {activities.map((a) => (
                <div key={a.code}>
                  <h3 className="font-semibold">{locale === "en" ? a.nameEn : a.nameDe}</h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    {a.detailFields.map((f) => {
                      const v = booking.details[a.code]?.[f.key];
                      return (
                        <div key={f.key} className="flex justify-between gap-3 border-b border-border/60 py-1">
                          <dt className="text-fg-muted">{locale === "en" ? f.en : f.de}</dt>
                          <dd className="text-right font-medium">
                            {f.type === "boolean" ? (v ? t("ja", "yes") : t("nein", "no")) : v === undefined || v === "" ? "–" : `${f.options?.find((o) => o.value === v)?.[locale] ?? String(v)}${f.unit ? ` ${f.unit}` : ""}`}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
              {booking.notesProject && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Hinweise des Projekts", "Notes from the project")}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{booking.notesProject}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <div id="personen" className="scroll-mt-24" />
            <CardHeader title={t("Verantwortliche Personen", "Responsible persons")} />
            <CardBody className="space-y-3">
              {evaluation.requirements.roles.map((role) => {
                const person = full.persons.find((p) => p.role === role);
                return (
                  <div key={role} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label(personRoleLabels, role, locale)}</p>
                      {person ? (
                        <>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-fg-muted">
                            {[person.phone, person.email].filter(Boolean).join(" · ")}
                            {person.qualification && <span className="block">{person.qualification}</span>}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-danger">{t("nicht benannt", "not named")}</p>
                      )}
                    </div>
                    {person &&
                      (staff ? (
                        <form action={verifyPersonAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={booking.id} />
                          <input type="hidden" name="person_id" value={person.id} />
                          <Button type="submit" size="sm" variant={person.verifiedAt ? "secondary" : "primary"}>
                            {person.verifiedAt ? (
                              <>
                                <ShieldCheck className="size-3.5" /> {t("geprüft", "verified")}
                              </>
                            ) : (
                              t("Als geprüft markieren", "Mark as verified")
                            )}
                          </Button>
                        </form>
                      ) : (
                        person.verifiedAt && <Badge tone="ok">{t("geprüft", "verified")}</Badge>
                      ))}
                  </div>
                );
              })}
              {full.participants.length > 0 && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("Zutrittsliste", "Access list")} ({full.participants.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {full.participants.map((p) => (
                      <li key={p.id}>
                        {p.name} {p.organization && <span className="text-fg-muted">· {p.organization}</span>} {p.isGuest && <Badge tone="warn">{t("Gast", "guest")}</Badge>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t("Unterlagen", "Documents")}
              description={evaluation.requirements.docs.length ? evaluation.requirements.docs.map((d) => label(docKindLabels, d, locale)).join(" · ") : undefined}
            />
            <CardBody className="space-y-4">
              <DocList
                locale={locale}
                canReview={staff}
                docs={docRows.map((d) => ({ id: d.id, kind: d.kind, title: d.title, fileName: d.fileName, validUntil: d.validUntil, status: d.status, scope: d.scope, canDelete: staff || (d.uploadedBy === viewer.id && d.status !== "accepted") }))}
              />
              {["draft", "requested", "in_review", "confirmed"].includes(booking.status) && (
                <DocUploader locale={locale} scope="booking" bookingId={booking.id} projectId={booking.projectId} kinds={[...evaluation.requirements.docs, "other"]} offerProjectScope={!staff} />
              )}
            </CardBody>
          </Card>

          {(staff || full.rangeLogs.length > 0) && ["confirmed", "completed", "invoiced"].includes(booking.status) && (
            <Card>
              <div id="betrieb" className="scroll-mt-24" />
              <CardHeader title={t("Betriebsprotokoll", "Operations log")} description={t("Ist-Zeiten, Wetter und Vorkommnisse am Testtag", "Actual times, weather and events on the test day")} />
              <CardBody className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {full.rangeLogs.map((r) => (
                    <li key={r.id} className="rounded-lg bg-bg-subtle p-3">
                      <p className="font-medium">
                        {formatDateTime(r.actualStart, locale)} – {formatDateTime(r.actualEnd, locale)}
                      </p>
                      <p className="text-fg-muted">
                        {[r.weather, r.windKmh !== null ? `${r.windKmh} km/h Wind` : null].filter(Boolean).join(" · ")}
                      </p>
                      {r.notes && <p className="mt-1 whitespace-pre-wrap">{r.notes}</p>}
                      <p className="mt-1 text-xs text-fg-muted">{r.createdBy}</p>
                    </li>
                  ))}
                </ul>
                {staff && (
                  <form action={addRangeLogAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={booking.id} />
                    <label className="text-xs font-medium">
                      {t("Beginn (Ist)", "Start (actual)")}
                      <Input type="datetime-local" name="actual_start" className="mt-1" />
                    </label>
                    <label className="text-xs font-medium">
                      {t("Ende (Ist)", "End (actual)")}
                      <Input type="datetime-local" name="actual_end" className="mt-1" />
                    </label>
                    <label className="text-xs font-medium">
                      {t("Wetter", "Weather")}
                      <Input name="weather" className="mt-1" />
                    </label>
                    <label className="text-xs font-medium">
                      {t("Wind (km/h)", "Wind (km/h)")}
                      <Input name="wind_kmh" inputMode="decimal" className="mt-1" />
                    </label>
                    <label className="text-xs font-medium sm:col-span-2">
                      {t("Notizen", "Notes")}
                      <Textarea name="notes" rows={2} className="mt-1" />
                    </label>
                    <div>
                      <Button type="submit" size="sm" variant="secondary">
                        {t("Eintrag speichern", "Save entry")}
                      </Button>
                    </div>
                  </form>
                )}
                {evaluation.requirements.requiresSiteClearance && (
                  <div className="rounded-lg border border-signal/40 bg-signal/5 p-3 text-sm">
                    {booking.siteClearedAt ? (
                      <p className="flex items-center gap-2 font-medium text-ok">
                        <CheckCircle2 className="size-4" />
                        {t("Schlussfreigabe erteilt", "Site cleared")}: {formatDateTime(booking.siteClearedAt, locale)} · {booking.siteClearedBy}
                      </p>
                    ) : staff ? (
                      <form action={siteClearanceAction} className="space-y-2">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={booking.id} />
                        <p className="font-medium">{t("Nach Wirkmitteleinsatz: Blindgänger- und Räumkontrolle, dann Schlussfreigabe.", "After energetics: dud and clearance check, then site clearance.")}</p>
                        <Input name="message" placeholder={t("Bemerkung (optional)", "Remark (optional)")} />
                        <Button type="submit" size="sm">
                          {t("Schlussfreigabe erteilen", "Grant site clearance")}
                        </Button>
                      </form>
                    ) : (
                      <p>{t("Schlussfreigabe des Geländes ausstehend.", "Site clearance pending.")}</p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <div id="verlauf" className="scroll-mt-24" />
            <CardHeader title={t("Verlauf und Nachrichten", "History and messages")} />
            <CardBody className="space-y-4">
              <ol className="space-y-3">
                {events.map(({ event, userName }) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${event.type === "status" ? "bg-navy" : "bg-signal"}`} />
                    <div>
                      <p>
                        <span className="font-medium">{userName ?? t("System", "System")}</span>{" "}
                        <span className="text-fg-muted">· {formatDateTime(event.createdAt, locale)}</span>
                        {!event.visibleToProject && <Badge className="ml-2">{t("intern", "internal")}</Badge>}
                      </p>
                      {event.type === "status" && (
                        <p className="text-fg-muted">
                          {t("Status", "Status")}: {event.fromStatus ? `${label(bookingStatusLabels, event.fromStatus, locale)} → ` : ""}
                          {label(bookingStatusLabels, event.toStatus, locale)}
                        </p>
                      )}
                      {event.message && <p className="whitespace-pre-wrap">{event.message}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <form action={commentAction} className="space-y-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={booking.id} />
                <Textarea name="message" rows={3} placeholder={t("Nachricht schreiben …", "Write a message …")} required />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {staff ? (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="internal" className="accent-signal" />
                      {t("Interne Notiz (für Projekt nicht sichtbar)", "Internal note (hidden from project)")}
                    </label>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" size="sm" variant="secondary">
                    {t("Senden", "Send")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div id="pruefung" className="scroll-mt-24" />
            <CardHeader title={staff ? t("Prüfung", "Review") : t("Status der Angaben", "Status of details")} />
            <CardBody className="space-y-4">
              {evaluation.issues.length === 0 ? (
                <p className="flex items-center gap-2 text-sm font-medium text-ok">
                  <CheckCircle2 className="size-4" />
                  {t("Alle Regeln erfüllt.", "All rules met.")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {evaluation.issues.map((i, n) => (
                    <li key={`${i.code}-${n}`} className={`flex items-start gap-2 text-sm ${i.severity === "error" ? "text-danger" : "text-warn"}`}>
                      {i.severity === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
                      {issueText(i, locale, catalog.activities)}
                    </li>
                  ))}
                </ul>
              )}
              {staff && (
                <>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t("Checkliste", "Checklist")}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {evaluation.requirements.checklist
                        .filter((c) => c.key !== "site_clearance")
                        .map((c) => {
                          const d = done.get(c.key);
                          return (
                            <li key={c.key}>
                              <form action={toggleCheckAction} className="flex items-start gap-2">
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="id" value={booking.id} />
                                <input type="hidden" name="key" value={c.key} />
                                <button
                                  type="submit"
                                  aria-pressed={Boolean(d)}
                                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${d ? "border-ok bg-ok text-white" : "border-border bg-card"}`}
                                  aria-label={locale === "en" ? c.en : c.de}
                                >
                                  {d && <CheckCircle2 className="size-3" />}
                                </button>
                                <span className="text-sm">
                                  {locale === "en" ? c.en : c.de}
                                  {d?.doneAt && <span className="block text-xs text-fg-muted">{formatDateTime(d.doneAt, locale)}</span>}
                                </span>
                              </form>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                  {(statusActions[booking.status] ?? []).length > 0 && (
                    <form action={reviewStatusAction} className="space-y-3 border-t border-border pt-4">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={booking.id} />
                      <Textarea name="message" rows={2} placeholder={t("Nachricht an das Projekt (bei Ablehnung/Storno Pflicht)", "Message to the project (required for rejection/cancellation)")} />
                      <div className="flex flex-wrap gap-2">
                        {statusActions[booking.status].map((a) => (
                          <Button key={a.to} type="submit" name="status" value={a.to} size="sm" variant={a.variant}>
                            {locale === "en" ? a.en : a.de}
                          </Button>
                        ))}
                      </div>
                    </form>
                  )}
                  {["requested", "in_review"].includes(booking.status) && (
                    <form action={leadTimeOverrideAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={booking.id} />
                      <button type="submit" className="text-xs text-fg-muted underline-offset-2 hover:underline">
                        {booking.leadTimeOverride ? t("Vorlauf-Ausnahme aufheben", "Revoke lead-time exception") : t("Ausnahme von der Vorlaufzeit erlauben", "Allow lead-time exception")}
                      </button>
                    </form>
                  )}
                </>
              )}
              {projectCanCancel && (
                <form action={cancelOwnBookingAction} className="space-y-2 border-t border-border pt-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={booking.id} />
                  {booking.status !== "draft" && <Input name="message" placeholder={t("Grund (optional)", "Reason (optional)")} />}
                  <Button type="submit" size="sm" variant="danger">
                    {booking.status === "draft" ? t("Entwurf löschen", "Delete draft") : t("Buchung stornieren", "Cancel booking")}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
          {staff && full.project && (
            <Card>
              <CardHeader title={t("Projekt", "Project")} />
              <CardBody className="space-y-1 text-sm">
                <p className="font-medium">{full.project.name}</p>
                <p className="text-fg-muted">{full.project.organization}</p>
                <p>{[full.project.contactName, full.project.contactPhone, full.project.contactEmail].filter(Boolean).join(" · ")}</p>
                <a href={`/${locale}/portal/projekte/${full.project.id}`} className="text-xs font-semibold text-signal">
                  {t("Projekt öffnen", "Open project")}
                </a>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
