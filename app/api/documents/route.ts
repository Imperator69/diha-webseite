import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { routeViewer, sameOrigin } from "@/lib/auth/current";
import { can, isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { docKindLabels } from "@/lib/i18n/labels";
import { documentMimeTypes, storeFile, validateUpload } from "@/lib/storage";
import { isValidDate } from "@/lib/time";

const scopes = ["site", "project", "booking", "permit", "zone"] as const;
type Scope = (typeof scopes)[number];

/** Upload einer Unterlage (multipart/form-data). Projekte nur für eigene Projekte/Buchungen. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const viewer = await routeViewer();
  if (!viewer) return Response.json({ error: "auth" }, { status: 401 });
  const fd = await request.formData();
  const scope = String(fd.get("scope") ?? "") as Scope;
  const kind = String(fd.get("kind") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const validUntil = String(fd.get("valid_until") ?? "").trim();
  if (!scopes.includes(scope) || !(kind in docKindLabels) || (validUntil && !isValidDate(validUntil))) return Response.json({ error: "invalid" }, { status: 400 });
  const upload = validateUpload(fd.get("file"), documentMimeTypes);
  if (!upload) return Response.json({ error: "file" }, { status: 400 });

  let projectId: string | null = String(fd.get("project_id") ?? "") || null;
  const bookingId = String(fd.get("booking_id") ?? "") || null;
  const permitId = String(fd.get("permit_id") ?? "") || null;
  const zoneId = String(fd.get("zone_id") ?? "") || null;

  if (scope === "booking") {
    const booking = bookingId ? (await db().select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1))[0] : undefined;
    if (!booking) return Response.json({ error: "not_found" }, { status: 404 });
    projectId = booking.projectId;
    if (!isStaff(viewer.role) && (!viewer.projectIds.includes(projectId) || !["draft", "requested", "in_review", "confirmed"].includes(booking.status)))
      return Response.json({ error: "forbidden" }, { status: 403 });
  } else if (scope === "project") {
    if (!projectId || (!isStaff(viewer.role) && !viewer.projectIds.includes(projectId))) return Response.json({ error: "forbidden" }, { status: 403 });
  } else if (!can(viewer.role, "documents.manage")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const key = await storeFile(`docs/${scope}`, upload.file, upload.ext);
  const id = newId();
  await db()
    .insert(schema.documents)
    .values({
      id,
      scope,
      projectId,
      bookingId: scope === "booking" ? bookingId : null,
      permitId: scope === "permit" ? permitId : null,
      zoneId,
      kind,
      title: title || upload.file.name,
      fileKey: key,
      fileName: upload.file.name.slice(0, 200),
      mime: upload.file.type,
      size: upload.file.size,
      validUntil: validUntil || null,
      status: isStaff(viewer.role) ? "accepted" : "uploaded",
      uploadedBy: viewer.id,
      reviewedBy: isStaff(viewer.role) ? viewer.id : null,
      reviewedAt: isStaff(viewer.role) ? Date.now() : null,
    });
  await audit(viewer.id, "document.upload", "document", id, { scope, kind, projectId, bookingId, permitId });
  return Response.json({ ok: true, id });
}
