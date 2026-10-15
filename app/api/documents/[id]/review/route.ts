import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { routeViewer, sameOrigin } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";

/** Manager akzeptieren oder lehnen eine Unterlage ab. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const viewer = await routeViewer();
  if (!viewer || !can(viewer.role, "documents.manage")) return Response.json({ error: "forbidden" }, { status: 403 });
  const { status } = (await request.json()) as { status?: string };
  if (status !== "accepted" && status !== "rejected" && status !== "uploaded") return Response.json({ error: "invalid" }, { status: 400 });
  const { id } = await params;
  await db().update(schema.documents).set({ status, reviewedBy: viewer.id, reviewedAt: Date.now() }).where(eq(schema.documents.id, id));
  await audit(viewer.id, `document.${status}`, "document", id);
  return Response.json({ ok: true });
}
