import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { newId } from "@/lib/ids";
import { sendMail } from "@/lib/mail/send";
import { inviteMail } from "@/lib/mail/templates";
import { audit } from "@/lib/audit";
import { createAuthToken } from "./tokens";

/**
 * Legt beim allerersten Aufruf die Admins aus INITIAL_ADMINS an und lädt sie ein.
 * Ohne konfigurierten E-Mail-Versand: Einladungslink per `pnpm admin:invite` erzeugen.
 */
export async function ensureInitialAdmins(): Promise<void> {
  const emails = (appEnv().INITIAL_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /.+@.+\..+/.test(e));
  if (emails.length === 0) return;
  const [{ value }] = await db().select({ value: count() }).from(schema.users);
  if (value > 0) return;
  for (const email of emails) {
    const id = newId();
    const name = email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase());
    await db().insert(schema.users).values({ id, email, name, role: "admin", status: "invited", locale: "de" }).onConflictDoNothing();
    const token = await createAuthToken(id, "invite");
    const mail = inviteMail("de", name, token);
    await sendMail({ to: email, ...mail });
    await audit(null, "user.bootstrap", "user", id, { email });
  }
}
