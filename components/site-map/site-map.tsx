"use client";

import { clsx } from "clsx";
import { Check, Maximize2, MousePointerClick, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import { centroid, easeInOutCubic, focusBox, FULL_VIEW, interpolateBox, MAP_H, MAP_W, polygonPoints, type Box, type Pt } from "./geometry";
import { QuarryIllustration } from "./quarry-illustration";

export type MapZone = {
  id: string;
  code: string;
  name: string;
  description: string;
  kindLabel: string;
  color: string;
  polygon: Pt[];
  bookable: boolean;
  note?: string;
};

type Props = {
  zones: MapZone[];
  locale: Locale;
  baseImageUrl?: string | null;
  /** Mehrfachauswahl, z. B. im Buchungsassistenten */
  selectable?: boolean;
  selectedIds?: string[];
  disabledIds?: string[];
  onToggle?: (zoneId: string) => void;
  /** Link-Ziel für „Slot anfragen“ (Zone wird als ?zone= angehängt) */
  actionHref?: string;
  actionLabel?: string;
  tone?: "dark" | "light";
  className?: string;
};

function viewBoxString(b: Box) {
  return `${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.w.toFixed(2)} ${b.h.toFixed(2)}`;
}

export function SiteMap({ zones, locale, baseImageUrl, selectable, selectedIds = [], disabledIds = [], onToggle, actionHref, actionLabel, tone = "dark", className }: Props) {
  const t = translator(locale);
  const [view, setView] = useState<Box>(FULL_VIEW);
  const [activeId, setActiveId] = useState<string | null>(null);
  const viewRef = useRef<Box>(FULL_VIEW);
  const frame = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const animateTo = useCallback((target: Box) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = viewRef.current;
    if (reduced) {
      viewRef.current = target;
      setView(target);
      return;
    }
    const start = performance.now();
    const duration = 650;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const next = interpolateBox(from, target, easeInOutCubic(p));
      viewRef.current = next;
      setView(next);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  const focusZone = useCallback(
    (zone: MapZone) => {
      setActiveId(zone.id);
      animateTo(focusBox(zone.polygon));
    },
    [animateTo],
  );

  const reset = useCallback(() => {
    setActiveId(null);
    animateTo(FULL_VIEW);
  }, [animateTo]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, reset]);

  const active = zones.find((z) => z.id === activeId) ?? null;
  const zoom = MAP_W / view.w;
  const labelSize = 15 / zoom;
  const centers = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, centroid(z.polygon)])), [zones]);
  const dark = tone === "dark";

  return (
    <div className={clsx("grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className={clsx("relative overflow-hidden rounded-2xl ring-1", dark ? "ring-white/10" : "ring-border")}>
        <svg
          ref={svgRef}
          viewBox={viewBoxString(view)}
          className="block h-auto w-full touch-manipulation"
          role="group"
          aria-label={t("Interaktiver Geländeplan des Steinbruchs Eibenstein", "Interactive site plan of the Eibenstein quarry")}
          style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
        >
          {baseImageUrl ? (
            <image href={baseImageUrl} x="0" y="0" width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />
          ) : (
            <QuarryIllustration />
          )}
          {zones.map((zone) => {
            const isActive = zone.id === activeId;
            const isSelected = selectedIds.includes(zone.id);
            const isDisabled = disabledIds.includes(zone.id);
            const [cx, cy] = centers[zone.id];
            return (
              <g key={zone.id}>
                <polygon
                  points={polygonPoints(zone.polygon)}
                  fill={zone.color}
                  fillOpacity={isActive || isSelected ? 0.55 : isDisabled ? 0.12 : 0.32}
                  stroke={isSelected ? "#ffffff" : zone.color}
                  strokeWidth={(isActive || isSelected ? 3 : 1.6) / zoom}
                  strokeDasharray={zone.bookable ? undefined : `${6 / zoom} ${4 / zoom}`}
                  className={clsx("cursor-pointer outline-none transition-[fill-opacity] duration-200 hover:fill-opacity-60 focus-visible:fill-opacity-60", isDisabled && "cursor-not-allowed")}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectable ? isSelected : undefined}
                  aria-label={`${zone.code} ${zone.name}`}
                  onClick={() => focusZone(zone)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      focusZone(zone);
                    }
                  }}
                />
                <g pointerEvents="none" transform={`translate(${cx} ${cy})`}>
                  <rect x={-labelSize * 1.6} y={-labelSize * 0.85} width={labelSize * 3.2} height={labelSize * 1.5} rx={labelSize * 0.35} fill="#0c0f13" fillOpacity="0.78" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={labelSize} fontWeight="700" fill="#ffffff" y={-labelSize * 0.1}>
                    {zone.code}
                  </text>
                  {isSelected && (
                    <circle cx={labelSize * 1.9} cy={-labelSize * 0.6} r={labelSize * 0.55} fill="#c8102e" stroke="#fff" strokeWidth={labelSize * 0.12} />
                  )}
                </g>
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1 text-xs text-white backdrop-blur">
            <MousePointerClick className="size-3.5" aria-hidden="true" />
            {t("Zone anklicken zum Heranzoomen", "Click a zone to zoom in")}
          </span>
          {activeId && (
            <button
              type="button"
              onClick={reset}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink shadow hover:bg-stone"
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
              {t("Gesamtansicht", "Full view")}
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {active ? `${active.code} ${active.name}` : ""}
        </p>
      </div>

      <aside className={clsx("rounded-2xl p-5", dark ? "bg-ink-2 text-white ring-1 ring-white/10" : "bg-card text-fg ring-1 ring-border")}>
        {active ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: active.color === "#1f3864" && dark ? "#8fa6d6" : active.color }}>
                  <span className="inline-block size-2.5 rounded-sm" style={{ background: active.color }} />
                  {active.code} · {active.kindLabel}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{active.name}</h3>
              </div>
              <button type="button" onClick={reset} className={clsx("rounded-md p-1", dark ? "hover:bg-white/10" : "hover:bg-bg-subtle")} aria-label={t("Schließen", "Close")}>
                <X className="size-4" />
              </button>
            </div>
            <p className={clsx("mt-3 text-sm leading-6", dark ? "text-stone-2" : "text-fg-muted")}>{active.description}</p>
            {active.note && <p className={clsx("mt-3 text-sm", dark ? "text-stone-2" : "text-fg-muted")}>{active.note}</p>}
            <p className="mt-4">
              <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", active.bookable ? "bg-emerald-500/15 text-emerald-600" : "bg-graphite/20", active.bookable && dark && "text-emerald-300")}>
                {active.bookable ? t("Buchbar", "Bookable") : t("Nicht buchbar", "Not bookable")}
              </span>
            </p>
            <div className="mt-auto pt-6">
              {selectable && active.bookable && (
                <button
                  type="button"
                  disabled={disabledIds.includes(active.id)}
                  onClick={() => onToggle?.(active.id)}
                  className={clsx(
                    "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40",
                    selectedIds.includes(active.id) ? "bg-white text-ink ring-1 ring-border" : "bg-signal text-white hover:bg-signal-600",
                  )}
                >
                  {selectedIds.includes(active.id) && <Check className="size-4" />}
                  {selectedIds.includes(active.id) ? t("Ausgewählt, entfernen", "Selected, remove") : t("Zone auswählen", "Select zone")}
                </button>
              )}
              {!selectable && actionHref && active.bookable && (
                <a href={`${actionHref}${actionHref.includes("?") ? "&" : "?"}zone=${encodeURIComponent(active.id)}`} className="inline-flex w-full items-center justify-center rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-white hover:bg-signal-600">
                  {actionLabel ?? t("Slot anfragen", "Request a slot")}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70">{t("Bereiche", "Areas")}</h3>
            <ul className="mt-3 space-y-1.5">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => focusZone(zone)}
                    className={clsx("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm", dark ? "hover:bg-white/5" : "hover:bg-bg-subtle")}
                  >
                    <span className="inline-block size-3 shrink-0 rounded-sm" style={{ background: zone.color }} />
                    <span className="whitespace-nowrap font-semibold tabular-nums">{zone.code}</span>
                    <span className="truncate">{zone.name}</span>
                    {selectedIds.includes(zone.id) && <Check className="ml-auto size-4 text-signal" aria-label={t("ausgewählt", "selected")} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
