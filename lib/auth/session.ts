import { cookies } from "next/headers";
import { and, eq, lt } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto";

export const SESSION_COOKIE = "diha_session";
const ABSOLUTE_TTL = 12 * 60 * 60 * 1000;
const IDLE_TTL = 2 * 60 * 60 * 1000;

export type SessionUser = typeof schema.users.$inferSelect;
export type CurrentSession = { id: string; mfaVerified: boolean; user: SessionUser };

function isSecureContext(): boolean {
  return !(process.env.NODE_ENV === "development");
}

export async function createSession(userId: string, mfaVerified: boolean): Promise<void> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const nowMs = Date.now();
  await db().insert(schema.sessions).values({ id, userId, mfaVerified, createdAt: nowMs, lastSeenAt: nowMs, expiresAt: nowMs + ABSOLUTE_TTL });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_TTL / 1000,
  });
}

export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  await db().update(schema.sessions).set({ mfaVerified: true }).where(eq(schema.sessions.id, sessionId));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, await sha256Hex(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Liest und validiert die Session einmal pro Request. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = await sha256Hex(token);
  const rows = await db()
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const nowMs = Date.now();
  if (row.session.expiresAt < nowMs || row.session.lastSeenAt + IDLE_TTL < nowMs || row.user.status !== "active") {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  if (nowMs - row.session.lastSeenAt > 5 * 60 * 1000) {
    await db().update(schema.sessions).set({ lastSeenAt: nowMs }).where(eq(schema.sessions.id, id));
  }
  return { id, mfaVerified: row.session.mfaVerified, user: row.user };
});

export async function purgeExpiredSessions(): Promise<void> {
  await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now()));
  await db().delete(schema.authTokens).where(and(lt(schema.authTokens.expiresAt, Date.now() - 7 * 86_400_000)));
}
