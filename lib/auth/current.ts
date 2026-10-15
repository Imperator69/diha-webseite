import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { getSession, type CurrentSession } from "./session";
import { can, isStaff, requiresMfa, type Permission } from "./rbac";

export type Viewer = CurrentSession["user"] & { projectIds: string[] };

/** Angemeldeter Benutzer inkl. 2FA-Status, oder null. */
export const getViewer = cache(async (): Promise<{ viewer: Viewer; session: CurrentSession } | null> => {
  const session = await getSession();
  if (!session) return null;
  const memberships = await db()
    .select({ projectId: schema.projectMembers.projectId })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.userId, session.user.id));
  return { viewer: { ...session.user, projectIds: memberships.map((m) => m.projectId) }, session };
});

/**
 * Erzwingt Anmeldung (und 2FA für Admin/Manager). Optional mit Berechtigung.
 * Leitet sonst auf Login bzw. 2FA-Einrichtung um.
 */
export async function requireViewer(locale: Locale, permission?: Permission): Promise<Viewer> {
  const current = await getViewer();
  if (!current) redirect(`/${locale}/portal/login`);
  const { viewer, session } = current;
  if (viewer.totpEnabled && !session.mfaVerified) redirect(`/${locale}/portal/login/2fa`);
  if (requiresMfa(viewer.role) && !viewer.totpEnabled) redirect(`/${locale}/portal/sicherheit/2fa-einrichten`);
  if (permission && !can(viewer.role, permission)) redirect(`/${locale}/portal?denied=1`);
  return viewer;
}

/** Für Server Actions: wirft statt umzuleiten. */
export async function assertViewer(permission?: Permission): Promise<Viewer> {
  const current = await getViewer();
  if (!current) throw new Error("UNAUTHENTICATED");
  const { viewer, session } = current;
  if (viewer.totpEnabled && !session.mfaVerified) throw new Error("MFA_REQUIRED");
  if (requiresMfa(viewer.role) && !viewer.totpEnabled) throw new Error("MFA_SETUP_REQUIRED");
  if (permission && !can(viewer.role, permission)) throw new Error("FORBIDDEN");
  return viewer;
}

/** Projekt-User dürfen nur Daten ihrer eigenen Projekte sehen. */
export function canAccessProject(viewer: Viewer, projectId: string): boolean {
  return isStaff(viewer.role) || viewer.projectIds.includes(projectId);
}

/** Für Route Handler: angemeldeter Benutzer mit erfüllter 2FA-Pflicht, sonst null. */
export async function routeViewer(): Promise<Viewer | null> {
  const current = await getViewer();
  if (!current) return null;
  const { viewer, session } = current;
  if (viewer.totpEnabled && !session.mfaVerified) return null;
  if (requiresMfa(viewer.role) && !viewer.totpEnabled) return null;
  return viewer;
}

/** Same-Origin-Prüfung für zustandsändernde Route Handler (CSRF-Schutz zusätzlich zu SameSite-Cookies). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
