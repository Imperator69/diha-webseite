import { clsx } from "clsx";
import type { ReactNode } from "react";

export type Tone = "neutral" | "info" | "ok" | "warn" | "danger" | "signal";

const tones: Record<Tone, string> = {
  neutral: "bg-bg-subtle text-fg-muted ring-border",
  info: "bg-info/10 text-info ring-info/25",
  ok: "bg-ok/10 text-ok ring-ok/25",
  warn: "bg-warn/10 text-warn ring-warn/30",
  danger: "bg-danger/10 text-danger ring-danger/30",
  signal: "bg-signal text-white ring-signal",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>{children}</span>;
}

export const bookingStatusTone: Record<string, Tone> = {
  draft: "neutral",
  requested: "warn",
  in_review: "info",
  confirmed: "ok",
  rejected: "danger",
  cancelled: "neutral",
  completed: "ok",
  invoiced: "neutral",
};

export const invoiceStatusTone: Record<string, Tone> = {
  draft: "neutral",
  issued: "warn",
  partially_paid: "info",
  paid: "ok",
  cancelled: "neutral",
};

export const permitStatusTone: Record<string, Tone> = {
  planned: "neutral",
  preparing: "info",
  submitted: "warn",
  improvement_requested: "danger",
  granted: "ok",
  rejected: "danger",
  expired: "danger",
  withdrawn: "neutral",
};
