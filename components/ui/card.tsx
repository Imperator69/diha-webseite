import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={clsx("rounded-xl border border-border bg-card", className)}>{children}</Tag>;
}

export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4", className)}>
      <div>
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-signal">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium text-fg">{title}</p>
      {children && <div className="mt-2 text-sm text-fg-muted">{children}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "ok" | "warn" | "danger"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-info/30 bg-info/5 text-fg",
    ok: "border-ok/30 bg-ok/10 text-fg",
    warn: "border-warn/40 bg-warn/10 text-fg",
    danger: "border-danger/40 bg-danger/10 text-fg",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={clsx("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
