import type { Viewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import type { schema } from "@/lib/db";

type Doc = typeof schema.documents.$inferSelect;

/** Projekte sehen nur Unterlagen ihrer eigenen Projekte und Buchungen. */
export function canReadDocument(viewer: Viewer, doc: Doc): boolean {
  if (isStaff(viewer.role)) return true;
  return Boolean(doc.projectId && viewer.projectIds.includes(doc.projectId) && (doc.scope === "project" || doc.scope === "booking" || doc.scope === "invoice"));
}
