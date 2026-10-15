"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

export type ValueFormat = "count" | "money" | "hours" | "percent";

/** Breite des Containers messen (SSR-Startwert, danach ResizeObserver). */
export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const intlLocale = (l: Locale) => (l === "en" ? "en-GB" : "de-AT");

export function formatValue(v: number, format: ValueFormat, locale: Locale, compact = false): string {
  if (format === "money")
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR", maximumFractionDigits: compact ? 0 : 2, minimumFractionDigits: compact ? 0 : 2, notation: compact && Math.abs(v) >= 100_000_00 ? "compact" : "standard" }).format(v / 100);
  if (format === "hours") return `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: compact ? 0 : 1 }).format(v)} h`;
  if (format === "percent") return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(v);
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0, notation: compact && Math.abs(v) >= 10_000 ? "compact" : "standard" }).format(v);
}

/** Runde Achsenteilung (1, 2, 2,5, 5 × 10^n). */
export function niceTicks(min: number, max: number, count = 4, integer = false): number[] {
  if (max === min) max = min + 1;
  const raw = (max - min) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  // Zählwerte: nur ganze Schritte
  if (integer) step = Math.max(1, Math.ceil(step));
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Säule mit 4px gerundetem Datenende, eckig an der Basislinie. */
export function barPath(x: number, y0: number, y1: number, w: number, roundEnd: boolean): string {
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const h = bottom - top;
  if (h <= 0) return "";
  const r = roundEnd ? Math.min(4, h, w / 2) : 0;
  if (y1 <= y0) {
    // nach oben: Rundung oben
    return `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${bottom}Z`;
  }
  // nach unten (negative Werte): Rundung unten
  return `M${x},${top}V${bottom - r}Q${x},${bottom} ${x + r},${bottom}H${x + w - r}Q${x + w},${bottom} ${x + w},${bottom - r}V${top}Z`;
}
