import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Einfaches Fenster-Rate-Limit in D1. Liefert true, wenn die Aktion erlaubt ist.
 * Schlüssel enthalten keine Klartext-IP (siehe hashKey).
 */
export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const nowMs = Date.now();
  const row = (await db().select().from(schema.rateLimits).where(eq(schema.rateLimits.key, key)).limit(1))[0];
  if (!row || row.resetAt < nowMs) {
    await db()
      .insert(schema.rateLimits)
      .values({ key, count: 1, resetAt: nowMs + windowMs })
      .onConflictDoUpdate({ target: schema.rateLimits.key, set: { count: 1, resetAt: nowMs + windowMs } });
    return true;
  }
  if (row.count >= limit) return false;
  await db().update(schema.rateLimits).set({ count: row.count + 1 }).where(eq(schema.rateLimits.key, key));
  return true;
}

export async function clientKey(prefix: string, headers: Headers): Promise<string> {
  const ip = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${prefix}:${ip}:${day}`));
  return `${prefix}:${Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
