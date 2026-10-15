import { appEnv } from "@/lib/env";
import { sha256Hex, timingSafeEqualStrings } from "@/lib/crypto";
import { runDailyJobs } from "@/lib/jobs";

/** Externer Auslöser für die Tagesjobs (zusätzlich zum Cron-Trigger des Workers). */
export async function POST(request: Request) {
  const secret = appEnv().CRON_SECRET;
  if (!secret) return Response.json({ error: "not_configured" }, { status: 404 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given || !timingSafeEqualStrings(await sha256Hex(given), await sha256Hex(secret))) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(await runDailyJobs());
}
