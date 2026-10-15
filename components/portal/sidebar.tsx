"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ban,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Map,
  Receipt,
  ScrollText,
  Settings,
  Stamp,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/auth/rbac";
import type { Locale } from "@/lib/i18n/config";
import { navItems } from "./nav";

const icons = { Ban, Building2, CalendarDays, CalendarPlus, ChartColumn, ClipboardList, FileText, Inbox, LayoutDashboard, ListChecks, Mail, Map, Receipt, ScrollText, Settings, Stamp, TriangleAlert, Users };

export function SidebarNav({ locale, role, counts }: { locale: Locale; role: Role; counts?: Record<string, number> }) {
  const pathname = usePathname() ?? "";
  const base = `/${locale}/portal`;
  const items = navItems.filter((i) => i.roles.includes(role));
  const groups: { key: string; label?: string }[] = [
    { key: "main" },
    { key: "site", label: locale === "de" ? "Betrieb" : "Operations" },
    { key: "admin", label: "Admin" },
  ];
  const isActive = (href: string) => {
    const full = `${base}${href}`;
    if (href === "") return pathname === base;
    if (href === "/buchungen") return pathname.startsWith(full) && !pathname.startsWith(`${base}/buchungen/neu`);
    return pathname.startsWith(full);
  };
  return (
    <nav aria-label={locale === "de" ? "Portal-Navigation" : "Portal navigation"} className="space-y-6">
      {groups.map((g) => {
        const list = items.filter((i) => i.group === g.key);
        if (list.length === 0) return null;
        return (
          <div key={g.key}>
            {g.label && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.label}</p>}
            <ul className="space-y-0.5">
              {list.map((item) => {
                const Icon = icons[item.icon as keyof typeof icons];
                const active = isActive(item.href);
                const count = counts?.[item.href];
                return (
                  <li key={item.href}>
                    <Link
                      href={`${base}${item.href}`}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-white/10 font-semibold text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={clsx("size-4 shrink-0", active && "text-signal")} aria-hidden="true" />
                      <span className="truncate">{locale === "de" ? item.de : item.en}</span>
                      {count ? <span className="ml-auto rounded-full bg-signal px-1.5 text-[11px] font-bold leading-5 text-white">{count}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function PortalLangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}/portal`;
  return (
    <div className="inline-flex rounded-lg p-0.5 text-xs font-semibold ring-1 ring-border" role="group" aria-label="Sprache / Language">
      {(["de", "en"] as const).map((l) => (
        <a
          key={l}
          href={`/api/locale?to=${l}&next=${encodeURIComponent(pathname.replace(/^\/(de|en)/, `/${l}`))}`}
          aria-current={l === locale ? "true" : undefined}
          lang={l}
          className={clsx("rounded-md px-2.5 py-1 uppercase", l === locale ? "bg-ink text-white" : "text-fg-muted hover:text-fg")}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
