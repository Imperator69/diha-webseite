"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatValue, type ValueFormat } from "./use-chart";

export type BarItem = { key: string; label: string; value: number; detail?: string };

/** Horizontale Balken, eine Farbe, Wert am Balkenende. */
export function BarList({ locale, items, format, ariaLabel, color = "var(--viz-1)" }: { locale: Locale; items: BarItem[]; format: ValueFormat; ariaLabel: string; color?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul aria-label={ariaLabel} className="space-y-2">
      {items.map((item) => {
        const pct = (Math.abs(item.value) / max) * 100;
        return (
          <li
            key={item.key}
            tabIndex={0}
            aria-label={`${item.label}: ${formatValue(item.value, format, locale)}${item.detail ? `, ${item.detail}` : ""}`}
            onPointerEnter={() => setActive(item.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(item.key)}
            onBlur={() => setActive(null)}
            className="grid grid-cols-[minmax(96px,38%)_1fr] items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate text-xs" title={item.label}>
              {item.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 min-w-[2px] rounded-r-[4px] transition-opacity" style={{ width: `calc(${pct}% - 72px * ${pct / 100})`, background: color, opacity: active === null || active === item.key ? 1 : 0.55 }} />
              <span className="whitespace-nowrap text-xs font-medium tabular-nums">{formatValue(item.value, format, locale)}</span>
              {active === item.key && item.detail && <span className="truncate text-[11px] text-fg-muted">{item.detail}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
