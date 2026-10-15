import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type CompanySettings = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  companyRegister: string;
  court: string;
  email: string;
  phone: string;
  iban: string;
  bic: string;
  bank: string;
};

export type InvoiceSettings = { paymentDays: number; prefix: string; footerDe: string; footerEn: string; defaultTaxRateBp: number };
export type RetentionSettings = { inquiryMonths: number; spamDays: number; outboxDays: number };
export type BookingSettings = { guestThreshold: number };
export type JobsSettings = { lastRunAt: number | null; lastReport: Record<string, unknown> | null };

type SettingsMap = {
  company: CompanySettings;
  invoice: InvoiceSettings;
  retention: RetentionSettings;
  booking: BookingSettings;
  jobs: JobsSettings;
};

export const settingDefaults: SettingsMap = {
  company: { name: "DIHA GmbH (in Gründung)", street: "", postalCode: "", city: "", country: "Österreich", vatId: "", companyRegister: "", court: "", email: "", phone: "", iban: "", bic: "", bank: "" },
  invoice: { paymentDays: 14, prefix: "DIHA", footerDe: "", footerEn: "", defaultTaxRateBp: 2000 },
  retention: { inquiryMonths: 12, spamDays: 30, outboxDays: 30 },
  booking: { guestThreshold: 10 },
  jobs: { lastRunAt: null, lastReport: null },
};

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> {
  const row = (await db().select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1))[0];
  const stored = row?.value && typeof row.value === "object" ? (row.value as Partial<SettingsMap[K]>) : {};
  return { ...settingDefaults[key], ...stored };
}

export async function putSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): Promise<void> {
  await db()
    .insert(schema.settings)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: Date.now() } });
}
