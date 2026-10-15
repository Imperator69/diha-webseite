import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: "#0c0f13",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl()),
    icons: { icon: "/favicon.svg" },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale === "de" ? "de-AT" : "en"}>
      <body>{children}</body>
    </html>
  );
}
