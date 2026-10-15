import { eq } from "drizzle-orm";
import { getViewer } from "@/lib/auth/current";
import { db, schema } from "@/lib/db";
import { isLocale, localeCookie } from "@/lib/i18n/config";

/** Sprachwechsel im Portal: merkt die Wahl im Profil und im funktionalen Cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  const next = url.searchParams.get("next") ?? "/";
  if (!isLocale(to)) return new Response("Bad Request", { status: 400 });
  const safeNext = /^\/(de|en)(\/[\w\-/.%]*)?$/.test(next) && !next.includes("//") ? next : `/${to}`;
  const current = await getViewer();
  if (current && current.viewer.locale !== to) {
    await db().update(schema.users).set({ locale: to }).where(eq(schema.users.id, current.viewer.id));
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: safeNext,
      "Set-Cookie": `${localeCookie}=${to}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
    },
  });
}
