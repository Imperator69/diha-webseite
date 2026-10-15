"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import { formatValue } from "./use-chart";

export type HeatRow = { key: string; label: string; title: string; cells: { ratio: number | null; detail: string }[] };

/** Stufen der sequenziellen Skala (eine Farbe, hell → dunkel). */
export const heatSteps = [0, 0.05, 0.2, 0.4, 0.6, 0.8];
export function heatStep(ratio: number): number {
  let idx = 0;
  heatSteps.forEach((s, i) => {
    if (ratio >= s) idx = i;
  });
  return idx + 1;
}

/** Heatmap (Zeilen × Spalten). Zellen ohne Betriebszeit bleiben leer (–). */
export function Heatmap({ locale, columns, columnTitles, rows, ariaLabel }: { locale: Locale; columns: string[]; columnTitles: string[]; rows: HeatRow[]; ariaLabel: string }) {
  const t = translator(locale);
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div role="grid" aria-label={ariaLabel} className="grid min-w-[560px] gap-[2px]" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${columns.length}, minmax(28px, 1fr))` }}>
          <div role="row" className="contents">
            <div role="columnheader" />
            {columns.map((c, i) => (
              <div key={c + i} role="columnheader" className="pb-1 text-center text-[11px] text-fg-muted" title={columnTitles[i]}>
                {c}
              </div>
            ))}
          </div>
          {rows.map((row, r) => (
            <div key={row.key} role="row" className="contents">
              <div role="rowheader" className="truncate pr-2 text-xs leading-8" title={row.title}>
                {row.label}
              </div>
              {row.cells.map((cell, c) => {
                const step = cell.ratio === null ? null : heatStep(cell.ratio);
                const isActive = active?.r === r && active.c === c;
                return (
                  <div
                    key={c}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${row.title}, ${columnTitles[c]}: ${cell.ratio === null ? t("keine Betriebszeit", "no operating hours") : formatValue(cell.ratio, "percent", locale)}. ${cell.detail}`}
                    onPointerEnter={() => setActive({ r, c })}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive({ r, c })}
                    onBlur={() => setActive(null)}
                    className="h-8 rounded-[4px] outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-ring"
                    style={
                      step === null
                        ? { boxShadow: "inset 0 0 0 1px var(--viz-grid)" }
                        : { background: `var(--viz-seq-${step})`, boxShadow: isActive ? "inset 0 0 0 2px var(--fg)" : undefined }
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {active && (
        <div role="status" className="pointer-events-none absolute right-0 top-0 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold tabular-nums">
            {rows[active.r].cells[active.c].ratio === null ? t("keine Betriebszeit", "no operating hours") : formatValue(rows[active.r].cells[active.c].ratio!, "percent", locale)}
          </p>
          <p className="text-fg-muted">
            {rows[active.r].title} · {columnTitles[active.c]}
          </p>
          <p className="text-fg-muted">{rows[active.r].cells[active.c].detail}</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted" aria-hidden>
        <span>{t("Auslastung", "Utilisation")}</span>
        {heatSteps.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 rounded-[3px]" style={{ background: `var(--viz-seq-${i + 1})` }} />
            {i === heatSteps.length - 1 ? `≥ ${Math.round(s * 100)} %` : `${Math.round(s * 100)}–${Math.round(heatSteps[i + 1] * 100)} %`}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded-[3px]" style={{ boxShadow: "inset 0 0 0 1px var(--viz-grid)" }} />
          {t("keine Betriebszeit", "no operating hours")}
        </span>
      </div>
    </div>
  );
}
