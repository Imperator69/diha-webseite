import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: { de: string; en: string; priority: number }[] = [
    { de: "/de", en: "/en", priority: 1 },
    { de: "/de/impressum", en: "/en/imprint", priority: 0.2 },
    { de: "/de/datenschutz", en: "/en/privacy", priority: 0.2 },
  ];
  return pages.flatMap((p) =>
    (["de", "en"] as const).map((locale) => ({
      url: `${base}${p[locale]}`,
      changeFrequency: "monthly" as const,
      priority: p.priority,
      alternates: { languages: { "de-AT": `${base}${p.de}`, en: `${base}${p.en}`, "x-default": `${base}${p.de}` } },
    })),
  );
}
