"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { assertViewer } from "@/lib/auth/current";
import { runDailyJobs } from "@/lib/jobs";
import { getSetting, putSetting } from "@/lib/settings";
import { isValidIban } from "@/lib/validation";
import type { FormState } from "./auth";
import { localeOf, num, str } from "./util";

const intIn = (fd: FormData, key: string, min: number, max: number) => {
  const n = num(fd, key);
  return n !== null && Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function saveCompanyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("settings.manage");
  const iban = str(fd, "iban").replace(/\s+/g, "").toUpperCase();
  const bic = str(fd, "bic").replace(/\s+/g, "").toUpperCase();
  const vatId = str(fd, "vat_id").replace(/\s+/g, "").toUpperCase();
  if (str(fd, "name").length < 2) return { error: "invalid", message: "name" };
  if (iban && !isValidIban(iban)) return { error: "iban" };
  if (bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) return { error: "bic" };
  if (vatId && !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(vatId)) return { error: "vat_id" };
  const value = {
    name: str(fd, "name").slice(0, 200),
    street: str(fd, "street").slice(0, 200),
    postalCode: str(fd, "postal_code").slice(0, 20),
    city: str(fd, "city").slice(0, 100),
    country: str(fd, "country").slice(0, 100),
    vatId,
    companyRegister: str(fd, "company_register").slice(0, 50),
    court: str(fd, "court").slice(0, 100),
    email: str(fd, "email").slice(0, 200),
    phone: str(fd, "phone").slice(0, 50),
    iban,
    bic,
    bank: str(fd, "bank").slice(0, 100),
  };
  await putSetting("company", value);
  await audit(viewer.id, "settings.company", "settings", "company");
  revalidatePath(`/${localeOf(fd)}/portal/einstellungen`);
  return { ok: true };
}

export async function saveInvoiceSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("settings.manage");
  const paymentDays = intIn(fd, "payment_days", 0, 120);
  const prefix = str(fd, "prefix").toUpperCase();
  const defaultTaxRateBp = intIn(fd, "default_tax_rate_bp", 0, 2000);
  if (paymentDays === null || defaultTaxRateBp === null || !/^[A-Z0-9-]{1,12}$/.test(prefix)) return { error: "invalid" };
  await putSetting("invoice", { paymentDays, prefix, defaultTaxRateBp, footerDe: str(fd, "footer_de").slice(0, 1000), footerEn: str(fd, "footer_en").slice(0, 1000) });
  await audit(viewer.id, "settings.invoice", "settings", "invoice", { paymentDays, prefix, defaultTaxRateBp });
  revalidatePath(`/${localeOf(fd)}/portal/einstellungen`);
  return { ok: true };
}

export async function saveOperationsSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("settings.manage");
  const inquiryMonths = intIn(fd, "inquiry_months", 1, 60);
  const spamDays = intIn(fd, "spam_days", 1, 365);
  const outboxDays = intIn(fd, "outbox_days", 1, 365);
  const guestThreshold = intIn(fd, "guest_threshold", 1, 1000);
  if (inquiryMonths === null || spamDays === null || outboxDays === null || guestThreshold === null) return { error: "invalid" };
  await putSetting("retention", { inquiryMonths, spamDays, outboxDays });
  await putSetting("booking", { ...(await getSetting("booking")), guestThreshold });
  await audit(viewer.id, "settings.operations", "settings", "retention", { inquiryMonths, spamDays, outboxDays, guestThreshold });
  revalidatePath(`/${localeOf(fd)}/portal/einstellungen`);
  return { ok: true };
}

export async function runJobsNowAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await assertViewer("settings.manage");
  const report = await runDailyJobs();
  await audit(viewer.id, "jobs.run", "settings", "jobs", { digestItems: report.digestItems, mails: report.mails });
  revalidatePath(`/${localeOf(fd)}/portal/einstellungen`);
  return { ok: true, data: report };
}
