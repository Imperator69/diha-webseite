import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { legalContent } from "@/content/legal";
import { isLocale, legalPath, type Locale } from "@/lib/i18n/config";
import { localizedAlternates } from "@/lib/seo";

type Page = "imprint" | "privacy";

export async function legalMetadata(params: Promise<{ locale: string }>, page: Page): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = legalContent(locale, page);
  return {
    title: `${c.title} · DIHA`,
    description: c.description,
    alternates: localizedAlternates(locale, { de: legalPath("de", page), en: legalPath("en", page) }),
  };
}

/** Rendert eine Rechtsseite; falscher Sprach-Slug leitet auf den richtigen um. */
export async function LegalPageView({ params, page, slugLocale }: { params: Promise<{ locale: string }>; page: Page; slugLocale: Locale }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== slugLocale) redirect(legalPath(locale, page));
  const c = legalContent(locale, page);
  return (
    <article className="bg-stone">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <span className="mb-4 block h-1 w-10 bg-signal" aria-hidden="true" />
        <h1 className="text-4xl font-bold tracking-tight text-ink">{c.title}</h1>
        <p className="mt-3 text-graphite">{c.description}</p>
        <p className="mt-1 text-sm text-graphite-2">{c.updated}</p>
        <div className="mt-10 space-y-10">
          {c.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold text-ink">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-3 leading-7 text-ink/80">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-ink/80">
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
