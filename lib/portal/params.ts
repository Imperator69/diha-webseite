import { isLocale, type Locale } from "@/lib/i18n/config";

export type PageProps<P = object> = { params: Promise<{ locale: string } & P>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function localeParam(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : "de";
}

export function sp(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
