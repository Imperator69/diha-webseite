"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { permitStatuses } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { authorityLabels, permitKindLabels, severityLabels } from "@/lib/i18n/labels";
import { permitTemplates } from "@/lib/permit-templates";
import { isValidDate, zonedToUtc } from "@/lib/time";
import type { FormState } from "./auth";
import { bool, localeOf, optStr, str } from "./util";

const dateOrNull = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v && isValidDate(v) ? v : null;
};

export async function savePermitAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("permits.manage");
  const title = str(fd, "title");
  const authority = str(fd, "authority");
  const kind = str(fd, "kind");
  const status = str(fd, "status");
  if (title.length < 3 || !(authority in authorityLabels) || !(kind in permitKindLabels) || !(permitStatuses as readonly string[]).includes(status)) return { error: "invalid" };
  const values = {
    title,
    authority,
    kind: kind as "permit",
    status: status as (typeof permitStatuses)[number],
    referenceNo: optStr(fd, "reference_no"),
    submittedAt: dateOrNull(fd, "submitted_at"),
    decidedAt: dateOrNull(fd, "decided_at"),
    validFrom: dateOrNull(fd, "valid_from"),
    validUntil: dateOrNull(fd, "valid_until"),
    nextDeadline: dateOrNull(fd, "next_deadline"),
    nextDeadlineNote: optStr(fd, "next_deadline_note"),
    responsibleUserId: optStr(fd, "responsible_user_id"),
    zoneId: optStr(fd, "zone_id"),
    notes: optStr(fd, "notes"),
    updatedAt: Date.now(),
  };
  const id = str(fd, "id");
  if (id) {
    const before = (await db().select().from(schema.permits).where(eq(schema.permits.id, id)).limit(1))[0];
    await db().update(schema.permits).set(values).where(eq(schema.permits.id, id));
    await audit(viewer.id, "permit.update", "permit", id, { status: { from: before?.status, to: status }, validUntil: values.validUntil, nextDeadline: values.nextDeadline });
    revalidatePath(`/${localeOf(fd)}/portal/genehmigungen/${id}`);
    return { ok: true };
  }
  const newPermitId = newId();
  await db().insert(schema.permits).values({ id: newPermitId, ...values });
  await audit(viewer.id, "permit.create", "permit", newPermitId, { title, authority });
  redirect(`/${localeOf(fd)}/portal/genehmigungen/${newPermitId}?saved=1`);
}

export async function deletePermitAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("permits.manage");
  const id = str(fd, "id");
  await db().delete(schema.permits).where(eq(schema.permits.id, id));
  await audit(viewer.id, "permit.delete", "permit", id);
  redirect(`/${localeOf(fd)}/portal/genehmigungen?saved=deleted`);
}

export async function loadPermitTemplatesAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("permits.manage");
  const locale = localeOf(fd);
  // nur in ein leeres Register übernehmen (kein Duplikat bei Doppelklick)
  if ((await db().select({ id: schema.permits.id }).from(schema.permits).limit(1)).length) redirect(`/${locale}/portal/genehmigungen`);
  for (const tpl of permitTemplates) {
    await db().insert(schema.permits).values({ id: newId(), title: locale === "en" ? tpl.titleEn : tpl.title, authority: tpl.authority, kind: tpl.kind, status: "planned" });
  }
  await audit(viewer.id, "permit.templates_loaded", "permit", null, { count: permitTemplates.length });
  redirect(`/${locale}/portal/genehmigungen?saved=templates`);
}

export async function saveIncidentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("site.manage");
  const date = str(fd, "date");
  const time = str(fd, "time") || "12:00";
  const severity = str(fd, "severity");
  if (!isValidDate(date) || !(severity in severityLabels) || str(fd, "title").length < 3 || str(fd, "description").length < 3) return { error: "invalid" };
  const values = {
    occurredAt: zonedToUtc(date, time),
    severity: severity as "info",
    title: str(fd, "title"),
    description: str(fd, "description"),
    actions: optStr(fd, "actions"),
    zoneId: optStr(fd, "zone_id"),
    bookingId: optStr(fd, "booking_id"),
    reportedToAuthority: bool(fd, "reported"),
    authorityReference: optStr(fd, "authority_reference"),
    status: (str(fd, "status") === "closed" ? "closed" : "open") as "open" | "closed",
  };
  const id = str(fd, "id");
  if (id) {
    await db().update(schema.incidents).set(values).where(eq(schema.incidents.id, id));
    await audit(viewer.id, "incident.update", "incident", id, { status: values.status });
  } else {
    const newIncidentId = newId();
    await db().insert(schema.incidents).values({ id: newIncidentId, ...values, createdBy: viewer.id });
    await audit(viewer.id, "incident.create", "incident", newIncidentId, { severity });
  }
  revalidatePath(`/${localeOf(fd)}/portal/vorkommnisse`);
  return { ok: true };
}
