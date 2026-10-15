import { eq, inArray, or } from "drizzle-orm";
import { getViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import { db, schema } from "@/lib/db";

/** Auskunft nach Art. 15 DSGVO: alle zu einer Person gespeicherten Daten als JSON. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getViewer();
  if (!current || !current.session.mfaVerified || !can(current.viewer.role, "users.manage")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const user = (await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0];
  if (!user) return new Response("Not found", { status: 404 });
  const memberships = await db().select().from(schema.projectMembers).where(eq(schema.projectMembers.userId, id));
  const bookings = await db().select().from(schema.bookings).where(eq(schema.bookings.createdBy, id));
  const persons = await db()
    .select()
    .from(schema.bookingPersons)
    .where(or(eq(schema.bookingPersons.email, user.email), bookings.length ? inArray(schema.bookingPersons.bookingId, bookings.map((b) => b.id)) : undefined));
  const documents = await db().select().from(schema.documents).where(eq(schema.documents.uploadedBy, id));
  const log = await db().select().from(schema.auditLog).where(eq(schema.auditLog.userId, id));
  const { passwordHash: _p, totpSecret: _s, recoveryCodes: _r, ...profile } = user;
  await audit(current.viewer.id, "user.export", "user", id);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: { ...profile, hasPassword: Boolean(user.passwordHash), totpEnabled: user.totpEnabled },
      projectMemberships: memberships,
      bookingsCreated: bookings,
      namedAsResponsiblePerson: persons,
      documentsUploaded: documents.map(({ fileKey: _k, ...d }) => d),
      activityLog: log,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datenauskunft-${id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
