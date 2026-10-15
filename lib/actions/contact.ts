"use server";

import { headers } from "next/headers";
import { inArray, and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { clientKey, hit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail/send";
import { siteUrl } from "@/lib/site";
import { isLocale } from "@/lib/i18n/config";
import { inquiryTopicLabels } from "@/lib/i18n/labels";

export type ContactState = { ok: boolean; error?: "invalid" | "rate" | "server"; fields?: Record<string, string> };

const schemaContact = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  organization: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
  topic: z.enum(Object.keys(inquiryTopicLabels) as [string, ...string[]]),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal("on"),
  locale: z.string(),
});

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: von Menschen unsichtbar, Bots füllen es aus
  if (String(formData.get("website") ?? "").length > 0) return { ok: true };

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schemaContact.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = "invalid";
    return { ok: false, error: "invalid", fields };
  }
  const data = parsed.data;
  const locale = isLocale(data.locale) ? data.locale : "de";

  const key = await clientKey("contact", await headers());
  if (!(await hit(key, 5, 60 * 60 * 1000))) return { ok: false, error: "rate" };

  try {
    const id = newId();
    await db().insert(schema.inquiries).values({
      id,
      name: data.name,
      email: data.email,
      organization: data.organization || null,
      phone: data.phone || null,
      topic: data.topic,
      message: data.message,
      locale,
    });
    const staff = await db()
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(and(inArray(schema.users.role, ["admin", "manager"]), eq(schema.users.status, "active")));
    const topic = inquiryTopicLabels[data.topic]?.de ?? data.topic;
    for (const s of staff) {
      await sendMail({
        to: s.email,
        subject: `Neue Anfrage über die Website: ${topic}`,
        text: `Neue Anfrage von ${data.name}${data.organization ? ` (${data.organization})` : ""}.\n\nThema: ${topic}\n\nDetails im Portal:\n${siteUrl()}/de/portal/anfragen/${id}`,
      });
    }
    return { ok: true };
  } catch (error) {
    console.error("contact", error);
    return { ok: false, error: "server" };
  }
}
