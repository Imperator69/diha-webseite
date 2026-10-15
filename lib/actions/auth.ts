"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/auth/current";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { requiresMfa } from "@/lib/auth/rbac";
import { createSession, destroyAllSessionsForUser, destroySession, getSession, markSessionMfaVerified } from "@/lib/auth/session";
import { createAuthToken, findValidToken, markTokenUsed } from "@/lib/auth/tokens";
import { generateRecoveryCodes, verifyTotp } from "@/lib/auth/totp";
import { decryptSecret, sha256Hex } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { sendMail } from "@/lib/mail/send";
import { resetMail } from "@/lib/mail/templates";
import { clientKey, hit } from "@/lib/rate-limit";
import { localeOf, safePortalPath, str } from "./util";

export type FormState = { error?: string; ok?: boolean; message?: string; data?: Record<string, unknown> };

const LOCK_AFTER = 10;
const LOCK_MS = 15 * 60 * 1000;

function appSecret(): string {
  const secret = appEnv().APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).");
  return secret;
}

function afterLoginPath(user: typeof schema.users.$inferSelect, next: string | null): string {
  const locale: Locale = isLocale(user.locale) ? user.locale : "de";
  if (user.totpEnabled) return `/${locale}/portal/login/2fa${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  if (requiresMfa(user.role)) return `/${locale}/portal/sicherheit/2fa-einrichten`;
  return safePortalPath(next?.replace(/^\/(de|en)/, `/${locale}`), locale);
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = str(fd, "next") || null;
  if (!email || !password) return { error: "invalid" };

  const ipKey = await clientKey("login", await headers());
  const mailKey = `login-mail:${(await sha256Hex(email)).slice(0, 24)}`;
  if (!(await hit(ipKey, 30, LOCK_MS)) || !(await hit(mailKey, 15, LOCK_MS))) return { error: "rate" };

  const user = (await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (!user || user.status !== "active" || !user.passwordHash) {
    // gleiche Rechenzeit wie bei einem echten Vergleich, damit Konten nicht erratbar sind
    await verifyPassword(password, "scrypt$16384$8$5$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    return { error: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil > Date.now()) return { error: "locked" };

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db()
      .update(schema.users)
      .set({ failedLogins: failed >= LOCK_AFTER ? 0 : failed, lockedUntil: failed >= LOCK_AFTER ? Date.now() + LOCK_MS : null })
      .where(eq(schema.users.id, user.id));
    if (failed >= LOCK_AFTER) await audit(user.id, "auth.locked", "user", user.id);
    return { error: failed >= LOCK_AFTER ? "locked" : "invalid" };
  }

  await db().update(schema.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: Date.now() }).where(eq(schema.users.id, user.id));
  await createSession(user.id, false);
  await audit(user.id, "auth.login", "user", user.id);
  redirect(afterLoginPath(user, next));
}

export async function verifySecondFactorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect(`/${localeOf(fd)}/portal/login`);
  const user = session.user;
  const code = str(fd, "code").replace(/\s/g, "").toLowerCase();
  const next = str(fd, "next") || null;
  if (!(await hit(`mfa:${user.id}`, 10, LOCK_MS))) return { error: "rate" };
  if (!user.totpSecret || !user.totpEnabled) return { error: "invalid" };

  let ok = false;
  if (/^\d{6}$/.test(code)) {
    const secret = await decryptSecret(user.totpSecret, appSecret());
    const step = await verifyTotp(secret, code, user.totpLastStep ?? null);
    if (step !== null) {
      ok = true;
      await db().update(schema.users).set({ totpLastStep: step }).where(eq(schema.users.id, user.id));
    }
  } else if (/^[a-z2-7]{5}-[a-z2-7]{5}$/.test(code) && user.recoveryCodes) {
    const hashes: string[] = JSON.parse(user.recoveryCodes);
    const h = await sha256Hex(code);
    if (hashes.includes(h)) {
      ok = true;
      await db()
        .update(schema.users)
        .set({ recoveryCodes: JSON.stringify(hashes.filter((x) => x !== h)) })
        .where(eq(schema.users.id, user.id));
      await audit(user.id, "auth.recovery_code_used", "user", user.id);
    }
  }
  if (!ok) return { error: "invalid" };
  await markSessionMfaVerified(session.id);
  const locale: Locale = isLocale(user.locale) ? user.locale : "de";
  redirect(safePortalPath(next, locale));
}

export async function confirmTotpSetupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect(`/${localeOf(fd)}/portal/login`);
  const user = session.user;
  if (!user.totpSecret) return { error: "invalid" };
  const secret = await decryptSecret(user.totpSecret, appSecret());
  const step = await verifyTotp(secret, str(fd, "code"), null);
  if (step === null) return { error: "invalid" };
  const codes = generateRecoveryCodes();
  const hashes = await Promise.all(codes.map((c) => sha256Hex(c)));
  await db()
    .update(schema.users)
    .set({ totpEnabled: true, totpLastStep: step, recoveryCodes: JSON.stringify(hashes), updatedAt: Date.now() })
    .where(eq(schema.users.id, user.id));
  await markSessionMfaVerified(session.id);
  await audit(user.id, "auth.totp_enabled", "user", user.id);
  return { ok: true, data: { codes } };
}

export async function acceptInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const found = await findValidToken(token, "invite");
  if (!found) return { error: "token" };
  if (password !== confirm) return { error: "mismatch" };
  const problems = passwordProblems(password);
  if (problems.length) return { error: problems[0] };
  const user = found.user;
  await db()
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(password),
      status: "active",
      name: str(fd, "name") || user.name,
      locale: localeOf(fd),
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(schema.users.id, user.id));
  await markTokenUsed(token);
  await audit(user.id, "auth.invite_accepted", "user", user.id);
  await createSession(user.id, false);
  const refreshed = { ...user, locale: localeOf(fd), status: "active" as const };
  redirect(afterLoginPath(refreshed, null));
}

export async function requestResetAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const locale = localeOf(fd);
  const key = await clientKey("reset", await headers());
  if (!(await hit(key, 5, 60 * 60 * 1000))) return { error: "rate" };
  const user = email ? (await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0] : undefined;
  if (user && user.status === "active") {
    const token = await createAuthToken(user.id, "reset");
    await sendMail({ to: user.email, ...resetMail(locale, user.name, token) });
    await audit(user.id, "auth.reset_requested", "user", user.id);
  }
  // immer gleiche Antwort, damit nicht erkennbar ist, ob ein Konto existiert
  return { ok: true };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const found = await findValidToken(token, "reset");
  if (!found) return { error: "token" };
  if (password !== confirm) return { error: "mismatch" };
  const problems = passwordProblems(password);
  if (problems.length) return { error: problems[0] };
  await db()
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null, updatedAt: Date.now() })
    .where(eq(schema.users.id, found.user.id));
  await markTokenUsed(token);
  await destroyAllSessionsForUser(found.user.id);
  await audit(found.user.id, "auth.password_reset", "user", found.user.id);
  return { ok: true };
}

export async function logoutAction(fd: FormData): Promise<void> {
  const current = await getViewer();
  await destroySession();
  if (current) await audit(current.viewer.id, "auth.logout", "user", current.viewer.id);
  redirect(`/${localeOf(fd)}/portal/login?logged_out=1`);
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const current = await getViewer();
  if (!current) return { error: "auth" };
  const user = current.viewer;
  const oldPw = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("confirm") ?? "")) return { error: "mismatch" };
  const problems = passwordProblems(password);
  if (problems.length) return { error: problems[0] };
  if (!(await verifyPassword(oldPw, user.passwordHash))) return { error: "current" };
  await db().update(schema.users).set({ passwordHash: await hashPassword(password), updatedAt: Date.now() }).where(eq(schema.users.id, user.id));
  await audit(user.id, "auth.password_changed", "user", user.id);
  return { ok: true };
}

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const current = await getViewer();
  if (!current) return { error: "auth" };
  const name = str(fd, "name");
  if (name.length < 2) return { error: "invalid" };
  const locale = isLocale(str(fd, "preferred_locale")) ? (str(fd, "preferred_locale") as Locale) : current.viewer.locale;
  await db()
    .update(schema.users)
    .set({ name, phone: str(fd, "phone") || null, locale, updatedAt: Date.now() })
    .where(eq(schema.users.id, current.viewer.id));
  await audit(current.viewer.id, "user.profile_updated", "user", current.viewer.id);
  return { ok: true };
}

export async function regenerateRecoveryCodesAction(_prev: FormState): Promise<FormState> {
  const current = await getViewer();
  if (!current || !current.viewer.totpEnabled || !current.session.mfaVerified) return { error: "auth" };
  const codes = generateRecoveryCodes();
  const hashes = await Promise.all(codes.map((c) => sha256Hex(c)));
  await db().update(schema.users).set({ recoveryCodes: JSON.stringify(hashes) }).where(eq(schema.users.id, current.viewer.id));
  await audit(current.viewer.id, "auth.recovery_codes_regenerated", "user", current.viewer.id);
  return { ok: true, data: { codes } };
}
