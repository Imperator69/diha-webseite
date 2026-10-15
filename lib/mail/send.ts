import { db, schema } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { newId } from "@/lib/ids";

export type Mail = { to: string; subject: string; text: string; attachments?: { filename: string; content: Uint8Array }[] };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function toHtml(text: string): string {
  const linked = escapeHtml(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#12161c;max-width:600px">
<div style="border-left:4px solid #c8102e;padding-left:10px;margin-bottom:18px"><strong style="font-size:20px">DIH<span style="color:#c8102e">A</span></strong><br><span style="color:#595959;font-size:12px">Drone Innovation Hub Austria</span></div>
${linked.replace(/\n/g, "<br>")}
</div>`;
}

/**
 * Versendet über die Resend-API (EU-Region). Ohne API-Key wird die Nachricht
 * nur im Postausgang abgelegt, damit Admins Links manuell weitergeben können.
 */
export async function sendMail(mail: Mail): Promise<"sent" | "not_configured" | "failed"> {
  const env = appEnv();
  let status: "sent" | "not_configured" | "failed" = "not_configured";
  let error: string | null = null;
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: [mail.to],
          subject: mail.subject,
          text: mail.text,
          html: toHtml(mail.text),
          ...(mail.attachments?.length ? { attachments: mail.attachments.map((a) => ({ filename: a.filename, content: toBase64(a.content) })) } : {}),
        }),
      });
      status = res.ok ? "sent" : "failed";
      if (!res.ok) error = `${res.status} ${(await res.text()).slice(0, 300)}`;
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }
  await db()
    .insert(schema.emailOutbox)
    .values({
      id: newId(),
      to: mail.to,
      subject: mail.subject,
      body: status === "sent" ? null : `${mail.text}${mail.attachments?.length ? `\n\n[Anhang: ${mail.attachments.map((a) => a.filename).join(", ")}]` : ""}`,
      status,
      error,
    });
  return status;
}
