import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto";

export const INVITE_TTL = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL = 2 * 60 * 60 * 1000;

/** Erzeugt einen Einmal-Token; in der DB liegt nur dessen Hash. */
export async function createAuthToken(userId: string, type: "invite" | "reset"): Promise<string> {
  const token = randomToken(32);
  // ältere offene Tokens desselben Typs entwerten
  await db()
    .update(schema.authTokens)
    .set({ usedAt: Date.now() })
    .where(and(eq(schema.authTokens.userId, userId), eq(schema.authTokens.type, type), isNull(schema.authTokens.usedAt)));
  await db()
    .insert(schema.authTokens)
    .values({ id: await sha256Hex(token), userId, type, expiresAt: Date.now() + (type === "invite" ? INVITE_TTL : RESET_TTL) });
  return token;
}

export async function findValidToken(token: string, type: "invite" | "reset") {
  if (!token || token.length < 20) return null;
  const rows = await db()
    .select({ token: schema.authTokens, user: schema.users })
    .from(schema.authTokens)
    .innerJoin(schema.users, eq(schema.authTokens.userId, schema.users.id))
    .where(and(eq(schema.authTokens.id, await sha256Hex(token)), eq(schema.authTokens.type, type)))
    .limit(1);
  const row = rows[0];
  if (!row || row.token.usedAt || row.token.expiresAt < Date.now() || row.user.status === "disabled") return null;
  return row;
}

export async function markTokenUsed(token: string): Promise<void> {
  await db()
    .update(schema.authTokens)
    .set({ usedAt: Date.now() })
    .where(eq(schema.authTokens.id, await sha256Hex(token)));
}
