import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Zeitpunkte als Unix-Millisekunden (UTC), Kalendertage als "YYYY-MM-DD".
const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["admin", "manager", "project"] }).notNull(),
    status: text("status", { enum: ["invited", "active", "disabled"] }).notNull().default("invited"),
    passwordHash: text("password_hash"),
    locale: text("locale", { enum: ["de", "en"] }).notNull().default("de"),
    phone: text("phone"),
    totpSecret: text("totp_secret"),
    totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
    totpLastStep: integer("totp_last_step"),
    recoveryCodes: text("recovery_codes"),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: integer("locked_until"),
    lastLoginAt: integer("last_login_at"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mfaVerified: integer("mfa_verified", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = sqliteTable("auth_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["invite", "reset"] }).notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull().default(now),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  street: text("street"),
  postalCode: text("postal_code"),
  city: text("city"),
  country: text("country").notNull().default("AT"),
  vatId: text("vat_id"),
  companyRegister: text("company_register"),
  invoiceLocale: text("invoice_locale", { enum: ["de", "en"] }).notNull().default("de"),
  admissionStatus: text("admission_status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  admissionChecks: text("admission_checks", { mode: "json" }).$type<Record<string, boolean>>(),
  notes: text("notes"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export type Point = [number, number];

export const zones = sqliteTable(
  "zones",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    nameDe: text("name_de").notNull(),
    nameEn: text("name_en").notNull(),
    descDe: text("desc_de").notNull().default(""),
    descEn: text("desc_en").notNull().default(""),
    kind: text("kind", {
      enum: ["base", "flight", "robotics", "energetics", "water", "workshop", "buffer"],
    }).notNull(),
    color: text("color").notNull().default("#1f3864"),
    polygon: text("polygon", { mode: "json" }).$type<Point[]>().notNull(),
    bookable: integer("bookable", { mode: "boolean" }).notNull().default(true),
    publicVisible: integer("public_visible", { mode: "boolean" }).notNull().default(true),
    capacity: integer("capacity").notNull().default(1),
    areaHa: real("area_ha"),
    safetyNotes: text("safety_notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("zones_code_idx").on(t.code)],
);

export const slotTemplates = sqliteTable("slot_templates", {
  id: text("id").primaryKey(),
  zoneId: text("zone_id").references(() => zones.id, { onDelete: "cascade" }),
  nameDe: text("name_de").notNull(),
  nameEn: text("name_en").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  // ISO-Wochentage 1 (Mo) bis 7 (So)
  weekdays: text("weekdays", { mode: "json" }).$type<number[]>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const siteBlocks = sqliteTable(
  "site_blocks",
  {
    id: text("id").primaryKey(),
    zoneId: text("zone_id").references(() => zones.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    reason: text("reason", { enum: ["quarry_blasting", "quarry_operation", "maintenance", "authority", "weather", "other"] }).notNull(),
    note: text("note"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("site_blocks_time_idx").on(t.startsAt, t.endsAt)],
);

export type DetailField = {
  key: string;
  type: "text" | "textarea" | "number" | "select" | "boolean";
  de: string;
  en: string;
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; de: string; en: string }[];
};

export type ConditionalRequirement = { field: string; equals: string | number | boolean; doc?: string; role?: string };

export type ChecklistItem = { key: string; de: string; en: string };

export const activityTypes = sqliteTable(
  "activity_types",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    nameDe: text("name_de").notNull(),
    nameEn: text("name_en").notNull(),
    descDe: text("desc_de").notNull().default(""),
    descEn: text("desc_en").notNull().default(""),
    category: text("category", {
      enum: ["workshop", "flight", "ground", "energetics", "sensor", "training", "event", "water"],
    }).notNull(),
    allowedZoneKinds: text("allowed_zone_kinds", { mode: "json" }).$type<string[]>().notNull(),
    requiredRoles: text("required_roles", { mode: "json" }).$type<string[]>().notNull(),
    requiredDocs: text("required_docs", { mode: "json" }).$type<string[]>().notNull(),
    conditional: text("conditional", { mode: "json" }).$type<ConditionalRequirement[]>().notNull(),
    conflictsWith: text("conflicts_with", { mode: "json" }).$type<string[]>().notNull(),
    detailFields: text("detail_fields", { mode: "json" }).$type<DetailField[]>().notNull(),
    checklist: text("checklist", { mode: "json" }).$type<ChecklistItem[]>().notNull(),
    leadDays: integer("lead_days").notNull().default(0),
    requiresSiteClearance: integer("requires_site_clearance", { mode: "boolean" }).notNull().default(false),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("activity_types_code_idx").on(t.code)],
);

export const bookingStatuses = [
  "draft",
  "requested",
  "in_review",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "invoiced",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    status: text("status", { enum: bookingStatuses }).notNull().default("draft"),
    title: text("title").notNull(),
    participantsCount: integer("participants_count").notNull().default(1),
    guestsCount: integer("guests_count").notNull().default(0),
    details: text("details", { mode: "json" }).$type<Record<string, Record<string, unknown>>>().notNull(),
    notesProject: text("notes_project"),
    notesInternal: text("notes_internal"),
    priceEstimateCents: integer("price_estimate_cents"),
    termsAcceptedAt: integer("terms_accepted_at"),
    leadTimeOverride: integer("lead_time_override", { mode: "boolean" }).notNull().default(false),
    submittedAt: integer("submitted_at"),
    decidedAt: integer("decided_at"),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
    completedAt: integer("completed_at"),
    siteClearedAt: integer("site_cleared_at"),
    siteClearedBy: text("site_cleared_by"),
    firstStart: integer("first_start"),
    lastEnd: integer("last_end"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("bookings_number_idx").on(t.number),
    index("bookings_project_idx").on(t.projectId),
    index("bookings_time_idx").on(t.firstStart, t.lastEnd),
  ],
);

export const bookingPeriods = sqliteTable(
  "booking_periods",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
  },
  (t) => [index("booking_periods_time_idx").on(t.startsAt, t.endsAt), index("booking_periods_booking_idx").on(t.bookingId)],
);

export const bookingZones = sqliteTable(
  "booking_zones",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.zoneId] })],
);

export const bookingActivities = sqliteTable(
  "booking_activities",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    activityCode: text("activity_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.activityCode] })],
);

export const bookingPersons = sqliteTable("booking_persons", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  qualification: text("qualification"),
  onSite: integer("on_site", { mode: "boolean" }).notNull().default(true),
  verifiedAt: integer("verified_at"),
  verifiedBy: text("verified_by"),
});

export const bookingParticipants = sqliteTable("booking_participants", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  organization: text("organization"),
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
});

export const bookingChecks = sqliteTable(
  "booking_checks",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    doneAt: integer("done_at"),
    doneBy: text("done_by"),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.key] })],
);

export const bookingEvents = sqliteTable(
  "booking_events",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type", { enum: ["status", "comment"] }).notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    message: text("message"),
    visibleToProject: integer("visible_to_project", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId)],
);

export const rangeLogs = sqliteTable("range_logs", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  actualStart: integer("actual_start"),
  actualEnd: integer("actual_end"),
  weather: text("weather"),
  windKmh: real("wind_kmh"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: integer("created_at").notNull().default(now),
});

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),
  occurredAt: integer("occurred_at").notNull(),
  severity: text("severity", { enum: ["info", "minor", "major", "serious"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actions: text("actions"),
  reportedToAuthority: integer("reported_to_authority", { mode: "boolean" }).notNull().default(false),
  authorityReference: text("authority_reference"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  createdBy: text("created_by"),
  createdAt: integer("created_at").notNull().default(now),
});

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    scope: text("scope", { enum: ["site", "project", "booking", "permit", "zone", "invoice"] }).notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    permitId: text("permit_id").references(() => permits.id, { onDelete: "cascade" }),
    zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    validUntil: text("valid_until"),
    status: text("status", { enum: ["uploaded", "accepted", "rejected"] }).notNull().default("uploaded"),
    uploadedBy: text("uploaded_by"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: integer("reviewed_at"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [
    index("documents_project_idx").on(t.projectId),
    index("documents_booking_idx").on(t.bookingId),
    index("documents_permit_idx").on(t.permitId),
  ],
);

export const permitStatuses = [
  "planned",
  "preparing",
  "submitted",
  "improvement_requested",
  "granted",
  "rejected",
  "expired",
  "withdrawn",
] as const;

export const permits = sqliteTable("permits", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  authority: text("authority").notNull(),
  kind: text("kind", { enum: ["permit", "submission", "notification", "insurance", "contract", "other"] }).notNull(),
  status: text("status", { enum: permitStatuses }).notNull().default("planned"),
  referenceNo: text("reference_no"),
  submittedAt: text("submitted_at"),
  decidedAt: text("decided_at"),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  nextDeadline: text("next_deadline"),
  nextDeadlineNote: text("next_deadline_note"),
  responsibleUserId: text("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const rates = sqliteTable("rates", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  nameDe: text("name_de").notNull(),
  nameEn: text("name_en").notNull(),
  unit: text("unit", { enum: ["hour", "half_day", "day", "month", "flat", "person_day"] }).notNull(),
  // Bezug: je Buchung, je gewählter Zone oder je teilnehmender Person
  basis: text("basis", { enum: ["booking", "zone", "person"] }).notNull().default("booking"),
  priceCents: integer("price_cents").notNull().default(0),
  taxRateBp: integer("tax_rate_bp").notNull().default(2000),
  zoneId: text("zone_id").references(() => zones.id, { onDelete: "cascade" }),
  activityCode: text("activity_code"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type PartySnapshot = {
  name: string;
  lines: string[];
  vatId?: string | null;
  companyRegister?: string | null;
  email?: string | null;
};

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    number: text("number"),
    kind: text("kind", { enum: ["invoice", "credit_note"] }).notNull().default("invoice"),
    refInvoiceId: text("ref_invoice_id"),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    status: text("status", { enum: ["draft", "issued", "partially_paid", "paid", "cancelled"] })
      .notNull()
      .default("draft"),
    locale: text("locale", { enum: ["de", "en"] }).notNull().default("de"),
    issueDate: text("issue_date"),
    serviceFrom: text("service_from"),
    serviceTo: text("service_to"),
    dueDate: text("due_date"),
    recipient: text("recipient", { mode: "json" }).$type<PartySnapshot>(),
    issuer: text("issuer", { mode: "json" }).$type<PartySnapshot>(),
    reverseCharge: integer("reverse_charge", { mode: "boolean" }).notNull().default(false),
    netCents: integer("net_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    grossCents: integer("gross_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    notes: text("notes"),
    paymentTerms: text("payment_terms"),
    dunningLevel: integer("dunning_level").notNull().default(0),
    lastDunningAt: text("last_dunning_at"),
    pdfKey: text("pdf_key"),
    createdBy: text("created_by"),
    issuedBy: text("issued_by"),
    issuedAt: integer("issued_at"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("invoices_number_idx").on(t.number), index("invoices_project_idx").on(t.projectId)],
);

export const invoiceLines = sqliteTable(
  "invoice_lines",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    // Menge in Tausendstel, damit 0,5 Tage exakt rechnen
    quantityMilli: integer("quantity_milli").notNull(),
    unit: text("unit").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    taxRateBp: integer("tax_rate_bp").notNull(),
    netCents: integer("net_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
  },
  (t) => [index("invoice_lines_invoice_idx").on(t.invoiceId)],
);

export const invoiceCounters = sqliteTable("invoice_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const bookingCounters = sqliteTable("booking_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    receivedOn: text("received_on").notNull(),
    amountCents: integer("amount_cents").notNull(),
    method: text("method", { enum: ["transfer", "cash", "card", "other"] }).notNull().default("transfer"),
    reference: text("reference"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("payments_invoice_idx").on(t.invoiceId)],
);

export const inquiries = sqliteTable("inquiries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization"),
  phone: text("phone"),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  locale: text("locale").notNull(),
  status: text("status", { enum: ["new", "in_progress", "done", "spam"] }).notNull().default("new"),
  handledBy: text("handled_by"),
  createdAt: integer("created_at").notNull().default(now),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_time_idx").on(t.createdAt)],
);

export const emailOutbox = sqliteTable("email_outbox", {
  id: text("id").primaryKey(),
  to: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status", { enum: ["sent", "not_configured", "failed"] }).notNull(),
  error: text("error"),
  createdAt: integer("created_at").notNull().default(now),
});

export const notificationsSent = sqliteTable("notifications_sent", {
  key: text("key").primaryKey(),
  sentAt: integer("sent_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at").notNull().default(now),
});
