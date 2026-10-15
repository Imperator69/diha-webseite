import { and, eq, inArray, isNotNull, lt, lte, notInArray, or } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { staffEmails } from "@/lib/bookings/data";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatMoney } from "@/lib/i18n/format";
import { docKindLabels, label } from "@/lib/i18n/labels";
import { sendMail } from "@/lib/mail/send";
import { getSetting, putSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { addDays, zonedDate } from "@/lib/time";

const DAY = 86_400_000;

type Text = { de: string; en: string };
export type DigestItem = { key: string; section: "permits" | "documents" | "bookings" | "invoices"; text: Text; path: string };

export type JobReport = {
  ranAt: number;
  digestItems: number;
  newItems: number;
  mails: number;
  permitsExpired: number;
  purged: { inquiries: number; outbox: number; sessions: number; tokens: number; rateLimits: number; notifications: number };
};

const sectionTitle: Record<DigestItem["section"], Text> = {
  permits: { de: "Genehmigungen und Fristen", en: "Permits and deadlines" },
  documents: { de: "Ablaufende Unterlagen", en: "Expiring documents" },
  bookings: { de: "Buchungen mit Handlungsbedarf", en: "Bookings needing action" },
  invoices: { de: "Überfällige Rechnungen", en: "Overdue invoices" },
};

/** Sammelt alle offenen Fristen. Schlüssel ändern sich, sobald sich die Frist ändert, damit erneut erinnert wird. */
export async function collectDigest(now: number): Promise<DigestItem[]> {
  const today = zonedDate(now);
  const items: DigestItem[] = [];
  const d = (v: string, l: Locale) => formatDate(v, l);

  const permits = await db()
    .select()
    .from(schema.permits)
    .where(notInArray(schema.permits.status, ["withdrawn", "rejected"]));
  for (const p of permits) {
    if (p.nextDeadline && p.nextDeadline <= addDays(today, 14)) {
      const overdue = p.nextDeadline < today;
      const note = p.nextDeadlineNote ? `: ${p.nextDeadlineNote}` : "";
      items.push({
        key: `permit-deadline:${p.id}:${p.nextDeadline}:${overdue ? "overdue" : "due"}`,
        section: "permits",
        text: {
          de: `${overdue ? "ÜBERFÄLLIG" : "Frist"} ${d(p.nextDeadline, "de")} · ${p.title}${note}`,
          en: `${overdue ? "OVERDUE" : "Deadline"} ${d(p.nextDeadline, "en")} · ${p.title}${note}`,
        },
        path: `/portal/genehmigungen/${p.id}`,
      });
    }
    if (p.validUntil && p.status === "granted" && p.validUntil <= addDays(today, 60)) {
      const stage = p.validUntil <= addDays(today, 14) ? "14" : "60";
      items.push({
        key: `permit-validity:${p.id}:${p.validUntil}:${stage}`,
        section: "permits",
        text: { de: `Gültig bis ${d(p.validUntil, "de")} · ${p.title} (Verlängerung einleiten)`, en: `Valid until ${d(p.validUntil, "en")} · ${p.title} (start renewal)` },
        path: `/portal/genehmigungen/${p.id}`,
      });
    }
  }

  const docs = await db()
    .select({ d: schema.documents, projectName: schema.projects.name })
    .from(schema.documents)
    .leftJoin(schema.projects, eq(schema.documents.projectId, schema.projects.id))
    .where(and(isNotNull(schema.documents.validUntil), lte(schema.documents.validUntil, addDays(today, 30)), inArray(schema.documents.scope, ["site", "zone", "permit", "project"]), eq(schema.documents.status, "accepted")));
  for (const { d: doc, projectName } of docs) {
    if (!doc.validUntil || doc.validUntil < addDays(today, -30)) continue;
    const expired = doc.validUntil < today;
    const owner = projectName ? ` · ${projectName}` : "";
    items.push({
      key: `doc-expiry:${doc.id}:${doc.validUntil}:${expired ? "expired" : "soon"}`,
      section: "documents",
      text: {
        de: `${expired ? "Abgelaufen" : "Läuft ab"} ${d(doc.validUntil, "de")} · ${label(docKindLabels, doc.kind, "de")}: ${doc.title}${owner}`,
        en: `${expired ? "Expired" : "Expires"} ${d(doc.validUntil, "en")} · ${label(docKindLabels, doc.kind, "en")}: ${doc.title}${owner}`,
      },
      path: doc.permitId ? `/portal/genehmigungen/${doc.permitId}` : doc.projectId ? `/portal/projekte/${doc.projectId}` : "/portal/dokumente",
    });
  }

  const soonBookings = await db()
    .select({ b: schema.bookings, projectName: schema.projects.name })
    .from(schema.bookings)
    .innerJoin(schema.projects, eq(schema.bookings.projectId, schema.projects.id))
    .where(
      or(
        and(inArray(schema.bookings.status, ["requested", "in_review"]), lte(schema.bookings.firstStart, now + 7 * DAY)),
        and(eq(schema.bookings.status, "confirmed"), lt(schema.bookings.lastEnd, now - DAY)),
      ),
    );
  for (const { b, projectName } of soonBookings) {
    const undecided = b.status !== "confirmed";
    items.push({
      key: `booking:${b.id}:${b.status}:${undecided ? "undecided" : "not-completed"}`,
      section: "bookings",
      text: undecided
        ? { de: `Noch nicht bestätigt, Beginn ${formatDateTime(b.firstStart, "de")} · ${b.number} ${projectName}`, en: `Not yet confirmed, starts ${formatDateTime(b.firstStart, "en")} · ${b.number} ${projectName}` }
        : { de: `Beendet, aber nicht abgeschlossen · ${b.number} ${projectName}`, en: `Ended but not completed · ${b.number} ${projectName}` },
      path: `/portal/buchungen/${b.id}`,
    });
  }
  const overdue = await db()
    .select({ i: schema.invoices, projectName: schema.projects.name })
    .from(schema.invoices)
    .innerJoin(schema.projects, eq(schema.invoices.projectId, schema.projects.id))
    .where(and(eq(schema.invoices.kind, "invoice"), inArray(schema.invoices.status, ["issued", "partially_paid"]), isNotNull(schema.invoices.dueDate), lt(schema.invoices.dueDate, today)));
  for (const { i, projectName } of overdue) {
    const open = i.grossCents - i.paidCents;
    items.push({
      key: `invoice-overdue:${i.id}:${i.dunningLevel}`,
      section: "invoices",
      text: {
        de: `${i.number} · ${projectName} · offen ${formatMoney(open, "de")}, fällig seit ${d(i.dueDate!, "de")}${i.dunningLevel ? ` (Mahnstufe ${i.dunningLevel})` : ""}`,
        en: `${i.number} · ${projectName} · open ${formatMoney(open, "en")}, due since ${d(i.dueDate!, "en")}${i.dunningLevel ? ` (reminder level ${i.dunningLevel})` : ""}`,
      },
      path: `/portal/rechnungen/${i.id}`,
    });
  }
  return items;
}

function digestText(locale: Locale, name: string, items: DigestItem[]): { subject: string; text: string } {
  const base = siteUrl();
  const parts: string[] = [];
  for (const section of ["permits", "documents", "bookings", "invoices"] as const) {
    const list = items.filter((i) => i.section === section);
    if (!list.length) continue;
    parts.push(`${sectionTitle[section][locale]}\n${list.map((i) => `- ${i.text[locale]}\n  ${base}/${locale}${i.path}`).join("\n")}`);
  }
  return locale === "en"
    ? { subject: `DIHA portal: ${items.length} open deadlines`, text: `Hello ${name},\n\nthe following items need attention:\n\n${parts.join("\n\n")}\n\nThis summary is sent when something new comes up.` }
    : { subject: `DIHA-Portal: ${items.length} offene Fristen`, text: `Hallo ${name},\n\nfolgende Punkte brauchen Aufmerksamkeit:\n\n${parts.join("\n\n")}\n\nDiese Übersicht kommt, sobald ein neuer Punkt dazukommt.` };
}

/** Projektmitglieder werden an ablaufende Projektunterlagen erinnert (30 Tage vorher). */
async function remindProjects(now: number): Promise<number> {
  const today = zonedDate(now);
  const docs = await db()
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.scope, "project"), isNotNull(schema.documents.validUntil), lte(schema.documents.validUntil, addDays(today, 30)), eq(schema.documents.status, "accepted")));
  let mails = 0;
  for (const doc of docs) {
    if (!doc.projectId || !doc.validUntil || doc.validUntil < today) continue;
    const key = `project-doc-reminder:${doc.id}:${doc.validUntil}`;
    if ((await db().select().from(schema.notificationsSent).where(eq(schema.notificationsSent.key, key)).limit(1)).length) continue;
    const members = await db()
      .select({ email: schema.users.email, name: schema.users.name, locale: schema.users.locale })
      .from(schema.projectMembers)
      .innerJoin(schema.users, eq(schema.projectMembers.userId, schema.users.id))
      .where(and(eq(schema.projectMembers.projectId, doc.projectId), eq(schema.users.status, "active")));
    for (const m of members) {
      const l = m.locale;
      const kind = label(docKindLabels, doc.kind, l);
      const link = `${siteUrl()}/${l}/portal/dokumente`;
      await sendMail({
        to: m.email,
        subject: l === "en" ? `Document expires on ${formatDate(doc.validUntil, l)}` : `Unterlage läuft am ${formatDate(doc.validUntil, l)} ab`,
        text:
          l === "en"
            ? `Hello ${m.name},\n\nyour document "${doc.title}" (${kind}) expires on ${formatDate(doc.validUntil, l)}. Please upload a current version so your bookings can be confirmed:\n\n${link}`
            : `Hallo ${m.name},\n\nIhre Unterlage „${doc.title}“ (${kind}) läuft am ${formatDate(doc.validUntil, l)} ab. Bitte laden Sie eine aktuelle Fassung hoch, damit Ihre Buchungen bestätigt werden können:\n\n${link}`,
      });
      mails++;
    }
    await db().insert(schema.notificationsSent).values({ key, sentAt: now }).onConflictDoNothing();
  }
  return mails;
}

/** Löschfristen (Art. 5 Abs. 1 lit. e DSGVO). Rechnungen und Buchungsbelege werden nie automatisch gelöscht (§ 132 BAO). */
async function purge(now: number): Promise<JobReport["purged"]> {
  const retention = await getSetting("retention");
  const inquiryCutoff = now - Math.max(1, retention.inquiryMonths) * 30 * DAY;
  const spamCutoff = now - Math.max(1, retention.spamDays) * DAY;
  const inquiries = await db()
    .delete(schema.inquiries)
    .where(or(lt(schema.inquiries.createdAt, inquiryCutoff), and(eq(schema.inquiries.status, "spam"), lt(schema.inquiries.createdAt, spamCutoff))))
    .returning({ id: schema.inquiries.id });
  const outbox = await db()
    .delete(schema.emailOutbox)
    .where(lt(schema.emailOutbox.createdAt, now - Math.max(1, retention.outboxDays) * DAY))
    .returning({ id: schema.emailOutbox.id });
  const sessions = await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, now)).returning({ id: schema.sessions.id });
  const tokens = await db()
    .delete(schema.authTokens)
    .where(or(lt(schema.authTokens.expiresAt, now - 30 * DAY), and(isNotNull(schema.authTokens.usedAt), lt(schema.authTokens.usedAt, now - 30 * DAY))))
    .returning({ id: schema.authTokens.id });
  const rateLimits = await db().delete(schema.rateLimits).where(lt(schema.rateLimits.resetAt, now)).returning({ key: schema.rateLimits.key });
  const notifications = await db().delete(schema.notificationsSent).where(lt(schema.notificationsSent.sentAt, now - 400 * DAY)).returning({ key: schema.notificationsSent.key });
  return { inquiries: inquiries.length, outbox: outbox.length, sessions: sessions.length, tokens: tokens.length, rateLimits: rateLimits.length, notifications: notifications.length };
}

/** Tägliche Aufgaben: Status abgelaufener Genehmigungen, Fristen-Übersicht, Erinnerungen, Löschfristen. */
export async function runDailyJobs(now = Date.now()): Promise<JobReport> {
  const today = zonedDate(now);
  const expired = await db()
    .update(schema.permits)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(schema.permits.status, "granted"), isNotNull(schema.permits.validUntil), lt(schema.permits.validUntil, today)))
    .returning({ id: schema.permits.id });
  for (const p of expired) await audit(null, "permit.expired", "permit", p.id, { status: { from: "granted", to: "expired" } });

  const items = await collectDigest(now);
  const known = new Set<string>();
  // D1 erlaubt höchstens 100 gebundene Parameter je Abfrage
  for (let i = 0; i < items.length; i += 90) {
    const keys = items.slice(i, i + 90).map((it) => it.key);
    for (const r of await db().select({ key: schema.notificationsSent.key }).from(schema.notificationsSent).where(inArray(schema.notificationsSent.key, keys))) known.add(r.key);
  }
  const fresh = items.filter((i) => !known.has(i.key));
  let mails = 0;
  if (fresh.length) {
    for (const s of await staffEmails()) {
      const mail = digestText(s.locale, s.name, items);
      await sendMail({ to: s.email, ...mail });
      mails++;
    }
    for (const i of fresh) await db().insert(schema.notificationsSent).values({ key: i.key, sentAt: now }).onConflictDoNothing();
  }
  mails += await remindProjects(now);
  const purged = await purge(now);
  const report: JobReport = { ranAt: now, digestItems: items.length, newItems: fresh.length, mails, permitsExpired: expired.length, purged };
  await putSetting("jobs", { lastRunAt: now, lastReport: report });
  return report;
}
