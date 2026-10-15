"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertViewer } from "@/lib/auth/current";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { createAuthToken } from "@/lib/auth/tokens";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { admissionCheckLabels } from "@/lib/i18n/labels";
import { sendMail } from "@/lib/mail/send";
import { inviteLink, inviteMail, resetMail } from "@/lib/mail/templates";
import type { FormState } from "./auth";
import { all, bool, localeOf, optStr, str } from "./util";

const roles = ["admin", "manager", "project"] as const;

async function activeAdminCountExcluding(userId: string): Promise<number> {
  const [row] = await db()
    .select({ value: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "admin"), eq(schema.users.status, "active"), ne(schema.users.id, userId)));
  return row.value;
}

async function invite(userId: string, email: string, name: string, locale: Locale): Promise<{ delivered: boolean; link: string }> {
  const token = await createAuthToken(userId, "invite");
  const status = await sendMail({ to: email, ...inviteMail(locale, name, token) });
  return { delivered: status === "sent", link: inviteLink(locale, token) };
}

const userSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(120),
  role: z.enum(roles),
  preferred_locale: z.enum(["de", "en"]),
});

export async function createUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("users.manage");
  const parsed = userSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "invalid" };
  const { email, name, role, preferred_locale } = parsed.data;
  const exists = (await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (exists) return { error: "exists" };
  const id = newId();
  await db().insert(schema.users).values({ id, email, name, role, locale: preferred_locale, status: "invited", phone: optStr(fd, "phone") });
  const projectIds = role === "project" ? all(fd, "projects") : [];
  if (projectIds.length) await db().insert(schema.projectMembers).values(projectIds.map((projectId) => ({ projectId, userId: id })));
  const result = await invite(id, email, name, preferred_locale);
  await audit(viewer.id, "user.create", "user", id, { email, role, projects: projectIds });
  revalidatePath(`/${localeOf(fd)}/portal/benutzer`);
  return { ok: true, data: { id, ...result } };
}

export async function updateUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("users.manage");
  const id = str(fd, "id");
  const user = (await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0];
  if (!user) return { error: "not_found" };
  const role = str(fd, "role") as (typeof roles)[number];
  const status = str(fd, "status") as "invited" | "active" | "disabled";
  const name = str(fd, "name");
  const locale = str(fd, "preferred_locale");
  if (!roles.includes(role) || !["invited", "active", "disabled"].includes(status) || name.length < 2 || !isLocale(locale)) return { error: "invalid" };
  const losesAdmin = user.role === "admin" && user.status === "active" && (role !== "admin" || status !== "active");
  if (losesAdmin && (await activeAdminCountExcluding(user.id)) === 0) return { error: "last_admin" };

  await db()
    .update(schema.users)
    .set({ name, role, status, locale, phone: optStr(fd, "phone"), updatedAt: Date.now() })
    .where(eq(schema.users.id, id));
  const projectIds = role === "project" ? all(fd, "projects") : [];
  await db().delete(schema.projectMembers).where(eq(schema.projectMembers.userId, id));
  if (projectIds.length) await db().insert(schema.projectMembers).values(projectIds.map((projectId) => ({ projectId, userId: id })));
  if (status === "disabled" || role !== user.role) await destroyAllSessionsForUser(id);
  await audit(viewer.id, "user.update", "user", id, {
    from: { role: user.role, status: user.status },
    to: { role, status },
    projects: projectIds,
  });
  revalidatePath(`/${localeOf(fd)}/portal/benutzer/${id}`);
  return { ok: true };
}

export async function resendInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("users.manage");
  const user = (await db().select().from(schema.users).where(eq(schema.users.id, str(fd, "id"))).limit(1))[0];
  if (!user || user.status === "disabled") return { error: "not_found" };
  if (user.status === "active") {
    const token = await createAuthToken(user.id, "reset");
    const status = await sendMail({ to: user.email, ...resetMail(user.locale, user.name, token) });
    await audit(viewer.id, "user.reset_sent", "user", user.id);
    return { ok: true, data: { delivered: status === "sent", kind: "reset" } };
  }
  const result = await invite(user.id, user.email, user.name, user.locale);
  await audit(viewer.id, "user.invite_resent", "user", user.id);
  return { ok: true, data: { ...result, kind: "invite" } };
}

export async function resetUserTotpAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("users.manage");
  const id = str(fd, "id");
  await db()
    .update(schema.users)
    .set({ totpEnabled: false, totpSecret: null, totpLastStep: null, recoveryCodes: null, updatedAt: Date.now() })
    .where(eq(schema.users.id, id));
  await destroyAllSessionsForUser(id);
  await audit(viewer.id, "user.totp_reset", "user", id);
  redirect(`/${localeOf(fd)}/portal/benutzer/${id}?saved=totp`);
}

/**
 * DSGVO-Löschung: personenbezogene Daten entfernen, Datensatz anonymisiert behalten,
 * weil Buchungen, Rechnungen und Audit-Log aufbewahrungspflichtig darauf verweisen.
 */
export async function anonymizeUserAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("users.manage");
  const id = str(fd, "id");
  if (id === viewer.id) redirect(`/${localeOf(fd)}/portal/benutzer/${id}?error=self`);
  const user = (await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0];
  if (!user) redirect(`/${localeOf(fd)}/portal/benutzer`);
  if (user.role === "admin" && (await activeAdminCountExcluding(id)) === 0) redirect(`/${localeOf(fd)}/portal/benutzer/${id}?error=last_admin`);
  await destroyAllSessionsForUser(id);
  await db().delete(schema.projectMembers).where(eq(schema.projectMembers.userId, id));
  await db().delete(schema.authTokens).where(eq(schema.authTokens.userId, id));
  await db()
    .update(schema.users)
    .set({
      email: `geloescht-${id.slice(0, 8)}@anonymisiert.invalid`,
      name: "Gelöschter Benutzer",
      phone: null,
      passwordHash: null,
      status: "disabled",
      totpEnabled: false,
      totpSecret: null,
      recoveryCodes: null,
      updatedAt: Date.now(),
    })
    .where(eq(schema.users.id, id));
  await audit(viewer.id, "user.anonymized", "user", id);
  redirect(`/${localeOf(fd)}/portal/benutzer?saved=anonymized`);
}

const projectSchema = z.object({
  name: z.string().trim().min(2).max(160),
  organization: z.string().trim().min(2).max(200),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z.union([z.literal(""), z.string().trim().toLowerCase().email()]).optional(),
  contact_phone: z.string().trim().max(60).optional(),
  street: z.string().trim().max(200).optional(),
  postal_code: z.string().trim().max(20).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).toUpperCase(),
  vat_id: z.string().trim().max(30).optional(),
  company_register: z.string().trim().max(60).optional(),
  invoice_locale: z.enum(["de", "en"]),
});

function projectValues(data: z.infer<typeof projectSchema>, fd: FormData) {
  const checks: Record<string, boolean> = {};
  for (const key of Object.keys(admissionCheckLabels)) checks[key] = bool(fd, `check_${key}`);
  return {
    name: data.name,
    organization: data.organization,
    contactName: data.contact_name || null,
    contactEmail: data.contact_email || null,
    contactPhone: data.contact_phone || null,
    street: data.street || null,
    postalCode: data.postal_code || null,
    city: data.city || null,
    country: data.country,
    vatId: data.vat_id || null,
    companyRegister: data.company_register || null,
    invoiceLocale: data.invoice_locale,
    admissionChecks: checks,
    notes: optStr(fd, "notes"),
  };
}

export async function saveProjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("projects.manage");
  const parsed = projectSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "invalid" };
  const values = projectValues(parsed.data, fd);
  const admission = str(fd, "admission_status");
  const admissionStatus = (["pending", "approved", "rejected"] as const).includes(admission as "pending") ? (admission as "pending" | "approved" | "rejected") : "pending";
  const status = str(fd, "status") === "archived" ? "archived" : "active";
  const id = str(fd, "id");
  if (id) {
    await db()
      .update(schema.projects)
      .set({ ...values, admissionStatus, status, updatedAt: Date.now() })
      .where(eq(schema.projects.id, id));
    await audit(viewer.id, "project.update", "project", id, { admissionStatus, status });
    revalidatePath(`/${localeOf(fd)}/portal/projekte/${id}`);
    return { ok: true };
  }
  const newProjectId = newId();
  await db().insert(schema.projects).values({ id: newProjectId, ...values, admissionStatus, status });
  await audit(viewer.id, "project.create", "project", newProjectId, { name: values.name });
  redirect(`/${localeOf(fd)}/portal/projekte/${newProjectId}?saved=1`);
}

export async function setInquiryStatusAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("inquiries.manage");
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!["new", "in_progress", "done", "spam"].includes(status)) return;
  await db()
    .update(schema.inquiries)
    .set({ status: status as "new", handledBy: viewer.id })
    .where(eq(schema.inquiries.id, id));
  await audit(viewer.id, "inquiry.status", "inquiry", id, { status });
  redirect(`/${localeOf(fd)}/portal/anfragen/${id}?saved=1`);
}

export async function deleteInquiryAction(fd: FormData): Promise<void> {
  const viewer = await assertViewer("inquiries.manage");
  const id = str(fd, "id");
  await db().delete(schema.inquiries).where(eq(schema.inquiries.id, id));
  await audit(viewer.id, "inquiry.delete", "inquiry", id);
  redirect(`/${localeOf(fd)}/portal/anfragen?saved=deleted`);
}
