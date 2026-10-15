"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { barPath, formatValue, niceTicks, useWidth, type ValueFormat } from "./use-chart";

export type ColumnSeries = { key: string; label: string; color: string; values: number[] };

const M = { top: 12, right: 8, bottom: 26, left: 64 };

/**
 * Säulendiagramm (gestapelt oder gruppiert) als SVG. Hover und Tastaturfokus je Kategorie
 * zeigen einen Tooltip mit allen Reihen; die Werte stehen zusätzlich in der Tabellenansicht.
 */
export function ColumnChart({
  locale,
  categories,
  tooltipTitles,
  series,
  stacked,
  format,
  height = 220,
  ariaLabel,
}: {
  locale: Locale;
  categories: string[];
  tooltipTitles?: string[];
  series: ColumnSeries[];
  stacked: boolean;
  format: ValueFormat;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = categories.length;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const sums = categories.map((_, i) => series.reduce((s, se) => s + Math.max(0, se.values[i] ?? 0), 0));
  const all = series.flatMap((s) => s.values);
  const maxV = stacked ? Math.max(0, ...sums) : Math.max(0, ...all);
  const minV = stacked ? 0 : Math.min(0, ...all);
  const ticks = niceTicks(minV, maxV === 0 && minV === 0 ? 1 : maxV, 4, format === "count");
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const y = (v: number) => M.top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const band = plotW / Math.max(1, n);
  const every = band >= 44 ? 1 : band >= 22 ? 2 : 3;
  const groupW = stacked ? Math.min(24, band * 0.6) : Math.min(24 * series.length + 2 * (series.length - 1), band * 0.72);
  const barW = stacked ? groupW : Math.max(2, (groupW - 2 * (series.length - 1)) / series.length);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} shapeRendering="crispEdges" />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-fg-muted text-[11px] tabular-nums">
              {formatValue(t, format, locale, true)}
            </text>
          </g>
        ))}
        {categories.map((c, i) => {
          const cx = M.left + band * i + band / 2;
          const x0 = cx - groupW / 2;
          let acc = 0;
          const stack = series.map((s, si) => ({ s, si, v: s.values[i] ?? 0 })).filter((p) => p.v !== 0);
          return (
            <g key={c + i} opacity={active === null || active === i ? 1 : 0.55}>
              {stacked
                ? stack.map(({ s, v }, k) => {
                    const from = acc;
                    acc += v;
                    // 2px Flächenfuge zwischen gestapelten Segmenten
                    const yBottom = y(from) - (k > 0 ? 2 : 0);
                    const yTop = y(acc);
                    if (yBottom - yTop <= 0) return null;
                    return <path key={s.key} d={barPath(x0, yBottom, yTop, barW, k === stack.length - 1)} fill={s.color} />;
                  })
                : series.map((s, si) => {
                    const v = s.values[i] ?? 0;
                    if (v === 0) return null;
                    return <path key={s.key} d={barPath(x0 + si * (barW + 2), y(0), y(v), barW, true)} fill={s.color} />;
                  })}
              {i % every === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-fg-muted text-[11px]">
                  {c}
                </text>
              )}
            </g>
          );
        })}
        {categories.map((c, i) => (
          <rect
            key={`hit-${i}`}
            x={M.left + band * i}
            y={M.top}
            width={band}
            height={plotH}
            fill={active === i ? "var(--viz-grid)" : "transparent"}
            fillOpacity={active === i ? 0.5 : 0}
            tabIndex={0}
            role="button"
            aria-label={`${tooltipTitles?.[i] ?? c}: ${series.map((s) => `${s.label} ${formatValue(s.values[i] ?? 0, format, locale)}`).join(", ")}`}
            className="cursor-default outline-none focus-visible:stroke-[var(--ring)]"
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      {active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs whitespace-nowrap shadow-lg"
          style={band * active + M.left + band / 2 > width / 2 ? { right: Math.max(0, width - (M.left + band * active + band / 2) + 12) } : { left: M.left + band * active + band / 2 + 12 }}
        >
          <p className="mb-1 font-medium text-fg-muted">{tooltipTitles?.[active] ?? categories[active]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
              <span className="font-semibold tabular-nums">{formatValue(s.values[active] ?? 0, format, locale)}</span>
              <span className="text-fg-muted">{s.label}</span>
            </p>
          ))}
          {stacked && series.length > 1 && (
            <p className="mt-1 border-t border-border pt-1 text-fg-muted">
              Σ <span className="font-semibold text-fg tabular-nums">{formatValue(sums[active], format, locale)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
