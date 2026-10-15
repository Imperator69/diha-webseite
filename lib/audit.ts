import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";

export async function audit(userId: string | null, action: string, entity: string, entityId: string | null, data?: Record<string, unknown>) {
  await db()
    .insert(schema.auditLog)
    .values({ id: newId(), userId, action, entity, entityId, data: data ?? null });
}
