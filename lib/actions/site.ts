"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ChecklistItem, ConditionalRequirement, DetailField, Point } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { activityCategoryLabels, blockReasonLabels, docKindLabels, personRoleLabels, zoneKindLabels } from "@/lib/i18n/labels";
import { deleteFile, imageMimeTypes, storeFile, validateUpload } from "@/lib/storage";
import { isValidDate, isValidTime, zonedToUtc } from "@/lib/time";
import type { FormState } from "./auth";
import { all, bool, localeOf, num, optStr, str } from "./util";

const zoneKinds = Object.keys(zoneKindLabels) as [string, ...string[]];

const pointSchema = z.tuple([z.number().min(0).max(1000), z.number().min(0).max(700)]);
const polygonSchema = z.array(pointSchema).min(3).max(64);

export async function saveZoneAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("site.manage");
  let polygon: Point[];
  try {
    polygon = polygonSchema.parse(JSON.parse(str(fd, "polygon")).map((p: number[]) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])) as Point[];
  } catch {
    return { error: "invalid", message: "polygon" };
  }
  const values = {
    code: str(fd, "code").toUpperCase(),
    nameDe: str(fd, "name_de"),
    nameEn: str(fd, "name_en"),
    descDe: str(fd, "desc_de"),
    descEn: str(fd, "desc_en"),
    kind: str(fd, "kind") as (typeof schema.zones.$inferInsert)["kind"],
    color: /^#[0-9a-fA-F]{6}$/.test(str(fd, "color")) ? str(fd, "color") : "#1f3864",
    polygon,
    bookable: bool(fd, "bookable"),
    publicVisible: bool(fd, "public_visible"),
    capacity: Math.max(0, Math.min(50, Math.round(num(fd, "capacity") ?? 1))),
    areaHa: num(fd, "area_ha"),
    safetyNotes: optStr(fd, "safety_notes"),
    sortOrder: Math.round(num(fd, "sort_order") ?? 0),
    active: bool(fd, "active"),
    updatedAt: Date.now(),
  };
  if (!values.code || values.nameDe.length < 2 || values.nameEn.length < 2 || !zoneKinds.includes(values.kind)) return { error: "invalid" };
  const id = str(fd, "id");
  const duplicate = (await db().select({ id: schema.zones.id }).from(schema.zones).where(eq(schema.zones.code, values.code)).limit(1))[0];
  if (duplicate && duplicate.id !== id) return { error: "exists" };
  if (id) {
    await db().update(schema.zones).set(values).where(eq(schema.zones.id, id));
    await audit(viewer.id, "zone.update", "zone", id, { code: values.code });
  } else {
    const newZoneId = newId();
    await db().insert(schema.zones).values({ id: newZoneId, ...values });
    await audit(viewer.id, "zone.create", "zone", newZoneId, { code: values.code });
    redirect(`/${localeOf(fd)}/portal/gelaende/zonen/${newZoneId}?saved=1`);
  }
  revalidatePath(`/${localeOf(fd)}/portal/gelaende`);
  return { ok: true };
}

export async function uploadMapImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("site.manage");
  const upload = validateUpload(fd.get("image"), imageMimeTypes, 8 * 1024 * 1024);
  if (!upload) return { error: "file" };
  const key = await storeFile("map", upload.file, upload.ext);
  const current = (await db().select().from(schema.settings).where(eq(schema.settings.key, "map")).limit(1))[0];
  const previous = current?.value as { baseImageKey?: string; version?: number } | undefined;
  const value = { baseImageKey: key, version: (previous?.version ?? 0) + 1 };
  await db()
    .insert(schema.settings)
    .values({ key: "map", value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: Date.now() } });
  if (previous?.baseImageKey) await deleteFile(previous.baseImageKey);
  await audit(viewer.id, "map.base_image", "settings", "map", { key });
  revalidatePath(`/${localeOf(fd)}/portal/gelaende`);
  return { ok: true };
}

export async function removeMapImageAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("site.manage");
  const current = (await db().select().from(schema.settings).where(eq(schema.settings.key, "map")).limit(1))[0];
  const previous = current?.value as { baseImageKey?: string; version?: number } | undefined;
  if (previous?.baseImageKey) {
    await deleteFile(previous.baseImageKey);
    await db()
      .update(schema.settings)
      .set({ value: { baseImageKey: null, version: (previous.version ?? 0) + 1 }, updatedAt: Date.now() })
      .where(eq(schema.settings.key, "map"));
    await audit(viewer.id, "map.base_image_removed", "settings", "map");
  }
  redirect(`/${localeOf(fd)}/portal/gelaende?saved=1`);
}

export async function saveSlotTemplateAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("site.manage");
  const locale = localeOf(fd);
  const startTime = str(fd, "start_time");
  const endTime = str(fd, "end_time");
  const weekdays = all(fd, "weekdays")
    .map(Number)
    .filter((d) => d >= 1 && d <= 7)
    .sort();
  if (!isValidTime(startTime) || !isValidTime(endTime) || endTime <= startTime || weekdays.length === 0 || !str(fd, "name_de")) {
    redirect(`/${locale}/portal/gelaende/slots?error=invalid`);
  }
  const values = {
    nameDe: str(fd, "name_de"),
    nameEn: str(fd, "name_en") || str(fd, "name_de"),
    startTime,
    endTime,
    weekdays,
    zoneId: optStr(fd, "zone_id"),
    active: bool(fd, "active"),
    sortOrder: Math.round(num(fd, "sort_order") ?? 0),
  };
  const id = str(fd, "id");
  if (id) await db().update(schema.slotTemplates).set(values).where(eq(schema.slotTemplates.id, id));
  else await db().insert(schema.slotTemplates).values({ id: newId(), ...values });
  await audit(viewer.id, id ? "slot.update" : "slot.create", "slot_template", id || null, values);
  redirect(`/${locale}/portal/gelaende/slots?saved=1`);
}

export async function deleteSlotTemplateAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("site.manage");
  const id = str(fd, "id");
  await db().delete(schema.slotTemplates).where(eq(schema.slotTemplates.id, id));
  await audit(viewer.id, "slot.delete", "slot_template", id);
  redirect(`/${localeOf(fd)}/portal/gelaende/slots?saved=1`);
}

export async function createBlockAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("site.manage");
  const fromDate = str(fd, "from_date");
  const toDate = str(fd, "to_date") || fromDate;
  const fromTime = str(fd, "from_time") || "00:00";
  const toTime = str(fd, "to_time") || "23:59";
  const reason = str(fd, "reason");
  if (!isValidDate(fromDate) || !isValidDate(toDate) || !isValidTime(fromTime) || !isValidTime(toTime) || !(reason in blockReasonLabels)) return { error: "invalid" };
  const startsAt = zonedToUtc(fromDate, fromTime);
  const endsAt = zonedToUtc(toDate, toTime);
  if (endsAt <= startsAt) return { error: "invalid" };
  const id = newId();
  await db()
    .insert(schema.siteBlocks)
    .values({ id, zoneId: optStr(fd, "zone_id"), startsAt, endsAt, reason: reason as "other", note: optStr(fd, "note"), createdBy: viewer.id });
  await audit(viewer.id, "block.create", "site_block", id, { reason, startsAt, endsAt });
  revalidatePath(`/${localeOf(fd)}/portal/sperrzeiten`);
  return { ok: true };
}

export async function deleteBlockAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("site.manage");
  const id = str(fd, "id");
  await db().delete(schema.siteBlocks).where(eq(schema.siteBlocks.id, id));
  await audit(viewer.id, "block.delete", "site_block", id);
  redirect(`/${localeOf(fd)}/portal/sperrzeiten?saved=deleted`);
}

const detailFieldSchema = z.array(
  z.object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/),
    type: z.enum(["text", "textarea", "number", "select", "boolean"]),
    de: z.string().min(1),
    en: z.string().min(1),
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional(),
    options: z.array(z.object({ value: z.string(), de: z.string(), en: z.string() })).optional(),
  }),
);
const checklistSchema = z.array(z.object({ key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/), de: z.string().min(1), en: z.string().min(1) }));
const conditionalSchema = z.array(
  z.object({ field: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]), doc: z.string().optional(), role: z.string().optional() }),
);

export async function saveActivityAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("site.manage");
  let detailFields: DetailField[];
  let checklist: ChecklistItem[];
  let conditional: ConditionalRequirement[];
  try {
    detailFields = detailFieldSchema.parse(JSON.parse(str(fd, "detail_fields") || "[]"));
    checklist = checklistSchema.parse(JSON.parse(str(fd, "checklist") || "[]"));
    conditional = conditionalSchema.parse(JSON.parse(str(fd, "conditional") || "[]"));
  } catch {
    return { error: "invalid", message: "json" };
  }
  const code = str(fd, "code");
  const category = str(fd, "category");
  if (!/^[a-z][a-z0-9_]{2,40}$/.test(code) || !(category in activityCategoryLabels) || str(fd, "name_de").length < 2) return { error: "invalid" };
  const values = {
    code,
    nameDe: str(fd, "name_de"),
    nameEn: str(fd, "name_en") || str(fd, "name_de"),
    descDe: str(fd, "desc_de"),
    descEn: str(fd, "desc_en"),
    category: category as (typeof schema.activityTypes.$inferInsert)["category"],
    allowedZoneKinds: all(fd, "zone_kinds").filter((k) => k in zoneKindLabels),
    requiredRoles: all(fd, "roles").filter((k) => k in personRoleLabels),
    requiredDocs: all(fd, "docs").filter((k) => k in docKindLabels),
    conflictsWith: all(fd, "conflicts"),
    detailFields,
    checklist,
    conditional,
    leadDays: Math.max(0, Math.min(365, Math.round(num(fd, "lead_days") ?? 0))),
    requiresSiteClearance: bool(fd, "requires_site_clearance"),
    active: bool(fd, "active"),
    sortOrder: Math.round(num(fd, "sort_order") ?? 0),
    updatedAt: Date.now(),
  };
  const id = str(fd, "id");
  const duplicate = (await db().select({ id: schema.activityTypes.id }).from(schema.activityTypes).where(eq(schema.activityTypes.code, code)).limit(1))[0];
  if (duplicate && duplicate.id !== id) return { error: "exists" };
  if (id) {
    await db().update(schema.activityTypes).set(values).where(eq(schema.activityTypes.id, id));
    await audit(viewer.id, "activity.update", "activity_type", id, { code });
    revalidatePath(`/${localeOf(fd)}/portal/aktivitaeten`);
    return { ok: true };
  }
  const newActivityId = newId();
  await db().insert(schema.activityTypes).values({ id: newActivityId, ...values });
  await audit(viewer.id, "activity.create", "activity_type", newActivityId, { code });
  redirect(`/${localeOf(fd)}/portal/aktivitaeten/${newActivityId}?saved=1`);
}
