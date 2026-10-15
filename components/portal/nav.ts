import type { Role } from "@/lib/auth/rbac";

export type NavItem = { href: string; de: string; en: string; icon: string; roles: Role[]; group: "main" | "site" | "admin" };

/** Navigation je Rolle. Pfade relativ zu /{locale}/portal. */
export const navItems: NavItem[] = [
  { href: "", de: "Übersicht", en: "Overview", icon: "LayoutDashboard", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/buchungen/neu", de: "Slot buchen", en: "Book a slot", icon: "CalendarPlus", roles: ["project"], group: "main" },
  { href: "/buchungen", de: "Buchungen", en: "Bookings", icon: "ClipboardList", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/kalender", de: "Kalender", en: "Calendar", icon: "CalendarDays", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/gelaende", de: "Gelände", en: "Site", icon: "Map", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/dokumente", de: "Dokumente", en: "Documents", icon: "FileText", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/rechnungen", de: "Rechnungen", en: "Invoices", icon: "Receipt", roles: ["admin", "manager", "project"], group: "main" },
  { href: "/genehmigungen", de: "Genehmigungen", en: "Permits", icon: "Stamp", roles: ["admin", "manager"], group: "site" },
  { href: "/sperrzeiten", de: "Sperrzeiten", en: "Blackouts", icon: "Ban", roles: ["admin", "manager"], group: "site" },
  { href: "/aktivitaeten", de: "Nutzungsarten", en: "Types of use", icon: "ListChecks", roles: ["admin", "manager"], group: "site" },
  { href: "/vorkommnisse", de: "Vorkommnisse", en: "Incidents", icon: "TriangleAlert", roles: ["admin", "manager"], group: "site" },
  { href: "/projekte", de: "Projekte", en: "Projects", icon: "Building2", roles: ["admin", "manager"], group: "site" },
  { href: "/anfragen", de: "Anfragen", en: "Enquiries", icon: "Inbox", roles: ["admin", "manager"], group: "site" },
  { href: "/auswertungen", de: "Auswertungen", en: "Analytics", icon: "ChartColumn", roles: ["admin", "manager"], group: "site" },
  { href: "/benutzer", de: "Benutzer", en: "Users", icon: "Users", roles: ["admin"], group: "admin" },
  { href: "/einstellungen", de: "Einstellungen", en: "Settings", icon: "Settings", roles: ["admin"], group: "admin" },
  { href: "/audit", de: "Audit-Log", en: "Audit log", icon: "ScrollText", roles: ["admin"], group: "admin" },
  { href: "/postausgang", de: "Postausgang", en: "Outbox", icon: "Mail", roles: ["admin"], group: "admin" },
];
