import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={clsx("border-b border-border bg-bg-subtle/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted", className)}>{children}</th>;
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={clsx("border-b border-border px-4 py-3 align-top text-fg", className)}>
      {children}
    </td>
  );
}
