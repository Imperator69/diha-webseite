import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { routeViewer, sameOrigin } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { canReadDocument } from "@/lib/documents";
import { db, schema } from "@/lib/db";
import { contentDisposition, deleteFile, readFile } from "@/lib/storage";

async function find(id: string) {
  return (await db().select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1))[0];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await routeViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const doc = await find((await params).id);
  if (!doc || !canReadDocument(viewer, doc)) return new Response("Not found", { status: 404 });
  const object = await readFile(doc.fileKey);
  if (!object) return new Response("Not found", { status: 404 });
  const inline = doc.mime === "application/pdf" || doc.mime.startsWith("image/");
  return new Response(object.body, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": contentDisposition(doc.fileName, inline),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const viewer = await routeViewer();
  if (!viewer) return Response.json({ error: "auth" }, { status: 401 });
  const doc = await find((await params).id);
  if (!doc) return Response.json({ error: "not_found" }, { status: 404 });
  const own = doc.uploadedBy === viewer.id && doc.status !== "accepted";
  if (!own && !can(viewer.role, "documents.manage")) return Response.json({ error: "forbidden" }, { status: 403 });
  await db().delete(schema.documents).where(eq(schema.documents.id, doc.id));
  await deleteFile(doc.fileKey);
  await audit(viewer.id, "document.delete", "document", doc.id, { kind: doc.kind, scope: doc.scope });
  return Response.json({ ok: true });
}
