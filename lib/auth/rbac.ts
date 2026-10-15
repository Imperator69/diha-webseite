export type Role = "admin" | "manager" | "project";

export type Permission =
  | "users.manage"
  | "settings.manage"
  | "audit.view"
  | "projects.manage"
  | "site.manage"
  | "bookings.review"
  | "bookings.create"
  | "documents.manage"
  | "permits.manage"
  | "invoices.manage"
  | "reports.view"
  | "inquiries.manage";

const matrix: Record<Role, Permission[]> = {
  admin: [
    "users.manage",
    "settings.manage",
    "audit.view",
    "projects.manage",
    "site.manage",
    "bookings.review",
    "bookings.create",
    "documents.manage",
    "permits.manage",
    "invoices.manage",
    "reports.view",
    "inquiries.manage",
  ],
  manager: [
    "projects.manage",
    "site.manage",
    "bookings.review",
    "bookings.create",
    "documents.manage",
    "permits.manage",
    "invoices.manage",
    "reports.view",
    "inquiries.manage",
  ],
  project: ["bookings.create"],
};

export function can(role: Role, permission: Permission): boolean {
  return matrix[role].includes(permission);
}

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "manager";
}

/** Admins und Manager müssen 2FA nutzen. */
export function requiresMfa(role: Role): boolean {
  return isStaff(role);
}
