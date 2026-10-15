import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Compass,
  Factory,
  GraduationCap,
  MapPin,
  Plane,
  Radar,
  ShieldAlert,
  Sprout,
  Trees,
  Waves,
  Wrench,
  Zap,
  Bot,
  BadgeCheck,
  FlaskConical,
  Presentation,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ContactForm } from "@/components/site/contact-form";
import { JsonLd } from "@/components/site/json-ld";
import { QuarryIllustration } from "@/components/site-map/quarry-illustration";
import { SiteMap } from "@/components/site-map/site-map";
import { polygonPoints } from "@/components/site-map/geometry";
import { buttonClass } from "@/components/ui/button";
import { siteContent } from "@/content/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { localizedAlternates, ogImage } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { mapBaseImageUrl, publicZones } from "@/lib/site-data/zones";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = siteContent(locale);
  return {
    title: c.meta.title,
    description: c.meta.description,
    keywords: c.meta.keywords,
    alternates: localizedAlternates(locale, { de: "/de", en: "/en" }),
    openGraph: {
      type: "website",
      siteName: "DIHA – Drone Innovation Hub Austria",
      title: c.meta.title,
      description: c.meta.description,
      url: `${siteUrl()}/${locale}`,
      locale: locale === "de" ? "de_AT" : "en_GB",
      alternateLocale: locale === "de" ? ["en_GB"] : ["de_AT"],
      images: [{ url: ogImage(locale), width: 1200, height: 630, alt: c.meta.title }],
    },
    twitter: { card: "summary_large_image", title: c.meta.title, description: c.meta.description, images: [ogImage(locale)] },
    robots: { index: true, follow: true },
  };
}

const serviceIcons = [GraduationCap, BadgeCheck, FlaskConical, Presentation];
const testIcons = [Plane, Bot, Radar, Wrench, GraduationCap, Waves];
const fieldIcons = [Sprout, Trees, ShieldAlert, Building2, Compass, Factory, Zap];

export default async function HomePage({ params }: Params) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const c = siteContent(locale);
  const [zones, baseImage] = await Promise.all([publicZones(locale), mapBaseImageUrl()]);
  const portalBooking = `/${locale}/portal/buchungen/neu`;
  const base = siteUrl();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "DIHA – Drone Innovation Hub Austria",
      alternateName: "DIHA",
      url: base,
      logo: `${base}/brand/diha-logo.svg`,
      parentOrganization: { "@type": "Organization", name: "AEEG" },
    },
    {
      "@context": "https://schema.org",
      "@type": "Place",
      "@id": `${base}/#testzentrum`,
      name: locale === "de" ? "DIHA Testzentrum Eibenstein" : "DIHA Test Centre Eibenstein",
      description: c.meta.description,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Raabs an der Thaya",
        addressRegion: locale === "de" ? "Niederösterreich" : "Lower Austria",
        addressCountry: "AT",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale === "de" ? "de-AT" : "en",
      mainEntity: c.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="bg-contours relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">{c.hero.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">{c.hero.title}</h1>
            <p className="mt-5 text-2xl font-semibold text-white/90">{c.hero.claim}</p>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">{c.hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#kontakt" className={buttonClass("primary", "lg")}>
                {c.hero.ctaPrimary}
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <a href="#gelaende" className={buttonClass("outline-light", "lg")}>
                {c.hero.ctaSecondary}
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2" aria-label={locale === "de" ? "Schwerpunkte" : "Focus areas"}>
              {c.hero.badges.map((b) => (
                <li key={b} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/75 ring-1 ring-white/15">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden lg:block" aria-hidden="true">
            <div className="absolute -inset-10 rounded-full bg-signal/10 blur-3xl" />
            <div className="relative [transform:perspective(1400px)_rotateX(22deg)_rotateZ(-8deg)] rounded-2xl shadow-2xl ring-1 ring-white/15">
              <svg viewBox="0 0 1000 700" className="block w-full overflow-hidden rounded-2xl">
                <QuarryIllustration />
                {zones.map((z) => (
                  <polygon key={z.id} points={polygonPoints(z.polygon)} fill={z.color} fillOpacity="0.28" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" />
                ))}
              </svg>
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-xl bg-ink-2/95 p-4 ring-1 ring-white/10">
              <Logo size="sm" tone="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* Kennzahlen */}
      <section aria-label={locale === "de" ? "Kennzahlen" : "Key figures"} className="border-y border-white/10 bg-ink text-white">
        <dl className="mx-auto grid max-w-7xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {c.facts.map((f) => (
            <div key={f.label} className="bg-ink px-6 py-8 sm:px-8">
              <dt className="text-sm text-white/60">{f.label}</dt>
              <dd className="mt-2 text-3xl font-bold tracking-tight">{f.value}</dd>
              {f.note && <dd className="mt-1 text-xs text-white/45">{f.note}</dd>}
            </div>
          ))}
        </dl>
      </section>

      {/* Leistungen */}
      <section id="leistungen" className="scroll-mt-24 bg-stone">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading title={c.services.title} intro={c.services.intro} />
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.services.items.map((s, i) => {
              const Icon = serviceIcons[i];
              return (
                <li key={s.title} className="group relative rounded-2xl bg-white p-7 shadow-sm ring-1 ring-stone-2 transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="text-sm font-bold tabular-nums text-signal">{String(i + 1).padStart(2, "0")}</span>
                  <Icon className="mt-6 size-7 text-navy" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-graphite">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Gelände */}
      <section id="gelaende" className="scroll-mt-24 bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading title={c.site.title} intro={c.site.intro} dark />
          <div className="mt-10">
            <SiteMap zones={zones} locale={locale} baseImageUrl={baseImage} actionHref={portalBooking} tone="dark" />
          </div>
          <p className="mt-4 text-xs text-white/50">{c.site.disclaimer}</p>
        </div>
      </section>

      {/* Testmöglichkeiten */}
      <section id="tests" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading title={c.tests.title} intro={c.tests.intro} />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.tests.items.map((item, i) => {
              const Icon = testIcons[i];
              return (
                <li key={item.title} className="flex flex-col rounded-2xl border border-stone-2 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-navy-50 text-navy">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-stone px-2.5 py-0.5 text-xs font-medium text-graphite">{c.tests.soon}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-graphite">{item.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Anwendungsfelder */}
      <section className="bg-stone">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:items-center">
            <SectionHeading title={c.fields.title} intro={c.fields.intro} />
            <ul className="flex flex-wrap gap-3">
              {c.fields.items.map((f, i) => {
                const Icon = fieldIcons[i];
                return (
                  <li key={f} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm ring-1 ring-stone-2">
                    <Icon className="size-4 text-signal" aria-hidden="true" />
                    {f}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section id="ablauf" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading title={c.process.title} intro={c.process.intro} />
          <ol className="relative mt-12 grid gap-8 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-stone-2 lg:block" aria-hidden="true" />
            {c.process.steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="relative flex size-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white ring-4 ring-white">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-graphite">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl bg-navy p-6 text-white sm:p-8">
            <ClipboardCheck className="size-8 shrink-0 text-white/80" aria-hidden="true" />
            <p className="max-w-2xl flex-1 text-sm leading-6 text-white/85">
              {locale === "de"
                ? "Bereits registriert? Im Portal wählen Sie Bereich, Nutzungsart und Termin direkt im Kalender und hinterlegen Verantwortliche und Nachweise."
                : "Already registered? In the portal you choose area, type of use and date directly in the calendar and add responsible persons and documents."}
            </p>
            <a href={`/${locale}/portal`} className={buttonClass("primary", "md")}>
              {c.nav.login}
            </a>
          </div>
        </div>
      </section>

      {/* Standort */}
      <section id="standort" className="scroll-mt-24 bg-stone">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <SectionHeading title={c.location.title} intro={c.location.text} />
            <address className="mt-8 not-italic">
              <p className="flex items-start gap-3 text-ink">
                <MapPin className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden="true" />
                <span>
                  {c.location.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
            </address>
            <ul className="mt-6 space-y-2 text-sm text-graphite">
              {c.location.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-contours relative min-h-72 overflow-hidden rounded-2xl ring-1 ring-black/5" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white">
              <span className="relative mx-auto flex size-5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal/60" />
                <span className="relative inline-flex size-5 rounded-full border-2 border-white bg-signal" />
              </span>
              <p className="mt-4 text-lg font-semibold">Eibenstein an der Thaya</p>
              <p className="text-sm text-white/60">{locale === "de" ? "Waldviertel · Niederösterreich" : "Waldviertel · Lower Austria"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Über & FAQ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8 lg:py-28">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">{c.about.title}</h2>
            {c.about.text.map((p) => (
              <p key={p} className="mt-4 leading-7 text-graphite">
                {p}
              </p>
            ))}
            <div className="mt-8">
              <Logo size="lg" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">{c.faq.title}</h2>
            <div className="mt-6 divide-y divide-stone-2 border-y border-stone-2">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-ink">
                    {item.q}
                    <span className="mt-1 text-signal transition group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-graphite">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section id="kontakt" className="bg-contours scroll-mt-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-28">
          <div>
            <SectionHeading title={c.contact.title} intro={c.contact.intro} dark />
            <p className="mt-8 text-sm text-white/60">
              {locale === "de" ? "Projekte mit Zugang buchen direkt im " : "Projects with access book directly in the "}
              <a href={`/${locale}/portal`} className="font-semibold text-white underline underline-offset-4">
                Portal
              </a>
              .
            </p>
          </div>
          <div className="relative rounded-2xl bg-ink-2/80 p-6 ring-1 ring-white/10 sm:p-8">
            <ContactForm locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ title, intro, dark }: { title: string; intro?: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-ink"}`}>
        <span className="mb-4 block h-1 w-10 bg-signal" aria-hidden="true" />
        {title}
      </h2>
      {intro && <p className={`mt-4 text-lg leading-8 ${dark ? "text-white/65" : "text-graphite"}`}>{intro}</p>}
    </div>
  );
}
