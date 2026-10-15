import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { readFile } from "@/lib/storage";

/** Liefert das hochgeladene Basisbild der Geländekarte (öffentlich, wie die Landingpage-Karte). */
export async function GET() {
  const row = (await db().select().from(schema.settings).where(eq(schema.settings.key, "map")).limit(1))[0];
  const key = (row?.value as { baseImageKey?: string } | undefined)?.baseImageKey;
  if (!key) return new Response("Not found", { status: 404 });
  const object = await readFile(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/png",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
