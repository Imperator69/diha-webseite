import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { LogOut, Menu, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PortalLangSwitch, SidebarNav } from "@/components/portal/sidebar";
import { logoutAction } from "@/lib/actions/auth";
import { requireViewer } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/rbac";
import { db, schema } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { label, roleLabels } from "@/lib/i18n/labels";

export const metadata = { robots: { index: false, follow: false } };

async function badgeCounts(staff: boolean): Promise<Record<string, number>> {
  if (!staff) return {};
  const [pending] = await db()
    .select({ value: count() })
    .from(schema.bookings)
    .where(inArray(schema.bookings.status, ["requested", "in_review"]));
  const [inquiries] = await db().select({ value: count() }).from(schema.inquiries).where(and(eq(schema.inquiries.status, "new")));
  return { "/buchungen": pending.value, "/anfragen": inquiries.value };
}

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const viewer = await requireViewer(locale);
  const counts = await badgeCounts(isStaff(viewer.role));
  const sidebar = (
    <>
      <Link href={`/${locale}/portal`} className="block px-3" aria-label="DIHA Portal">
        <Logo size="sm" tone="dark" />
      </Link>
      <div className="mt-8">
        <SidebarNav locale={locale} role={viewer.role} counts={counts} />
      </div>
    </>
  );
  return (
    <div data-area="portal" className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-ink px-3 py-6 lg:block">{sidebar}</aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <details className="relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg ring-1 ring-border" aria-label="Menü">
              <Menu className="size-5" />
            </summary>
            <div className="absolute left-0 mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-xl bg-ink p-3 shadow-xl">{sidebar}</div>
          </details>
          <p className="hidden text-sm text-fg-muted sm:block">
            {locale === "de" ? "Testzentrum Eibenstein" : "Eibenstein Test Centre"}
          </p>
          <div className="ml-auto flex items-center gap-3">
            <PortalLangSwitch locale={locale} />
            <Link href={`/${locale}/portal/konto`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg-subtle">
              <UserRound className="size-4 text-fg-muted" aria-hidden="true" />
              <span className="hidden max-w-40 truncate sm:inline">{viewer.name}</span>
              <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg-muted">{label(roleLabels, viewer.role, locale)}</span>
            </Link>
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="flex size-9 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg" aria-label={locale === "de" ? "Abmelden" : "Sign out"} title={locale === "de" ? "Abmelden" : "Sign out"}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
