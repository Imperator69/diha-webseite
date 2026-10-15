"use client";

import { clsx } from "clsx";
import { useActionState, useRef, useState } from "react";
import { PenLine, RotateCcw, Check } from "lucide-react";
import { FormStatus } from "@/components/portal/form-status";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { saveZoneAction } from "@/lib/actions/site";
import type { FormState } from "@/lib/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import { zoneKindLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";
import { MAP_H, MAP_W, polygonPoints, type Pt } from "./geometry";
import { QuarryIllustration } from "./quarry-illustration";

export type EditableZone = {
  id?: string;
  code: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  kind: string;
  color: string;
  polygon: Pt[];
  bookable: boolean;
  publicVisible: boolean;
  capacity: number;
  areaHa: number | null;
  safetyNotes: string | null;
  sortOrder: number;
  active: boolean;
};

type Props = { locale: Locale; zone: EditableZone; otherZones: { id: string; code: string; color: string; polygon: Pt[] }[]; baseImageUrl: string | null };

const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max) * 2) / 2;

export function ZoneEditor({ locale, zone, otherZones, baseImageUrl }: Props) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveZoneAction, {});
  const [points, setPoints] = useState<Pt[]>(zone.polygon);
  const [mode, setMode] = useState<"edit" | "draw">(zone.polygon.length >= 3 ? "edit" : "draw");
  const [color, setColor] = useState(zone.color);
  const dragIndex = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toSvg = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [clamp(p.x, MAP_W), clamp(p.y, MAP_H)];
  };

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== "draw") return;
    setPoints((prev) => [...prev, toSvg(e.clientX, e.clientY)]);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex.current === null) return;
    const p = toSvg(e.clientX, e.clientY);
    setPoints((prev) => prev.map((q, i) => (i === dragIndex.current ? p : q)));
  };

  const insertAt = (i: number) => {
    setPoints((prev) => {
      const a = prev[i];
      const b = prev[(i + 1) % prev.length];
      const mid: Pt = [Math.round(((a[0] + b[0]) / 2) * 2) / 2, Math.round(((a[1] + b[1]) / 2) * 2) / 2];
      return [...prev.slice(0, i + 1), mid, ...prev.slice(i + 1)];
    });
  };

  const removeAt = (i: number) => setPoints((prev) => (prev.length > 3 ? prev.filter((_, j) => j !== i) : prev));

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <input type="hidden" name="locale" value={locale} />
      {zone.id && <input type="hidden" name="id" value={zone.id} />}
      <input type="hidden" name="polygon" value={JSON.stringify(points)} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={mode === "draw" ? "primary" : "secondary"} onClick={() => { setPoints([]); setMode("draw"); }}>
            <PenLine className="size-4" />
            {t("Neu zeichnen", "Redraw")}
          </Button>
          {mode === "draw" && (
            <Button type="button" size="sm" variant="secondary" disabled={points.length < 3} onClick={() => setMode("edit")}>
              <Check className="size-4" />
              {t("Fläche schließen", "Close shape")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => { setPoints(zone.polygon); setMode(zone.polygon.length >= 3 ? "edit" : "draw"); }}>
            <RotateCcw className="size-4" />
            {t("Zurücksetzen", "Reset")}
          </Button>
          <span className="text-xs text-fg-muted">
            {mode === "draw"
              ? t("In die Karte klicken, um Eckpunkte zu setzen.", "Click on the map to place corner points.")
              : t("Punkte ziehen · Doppelklick entfernt · Kreis auf Kante fügt Punkt ein.", "Drag points · double-click removes · edge circle adds a point.")}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl ring-1 ring-border">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className={clsx("block w-full touch-none select-none", mode === "draw" && "cursor-crosshair")}
            onClick={onSvgClick}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragIndex.current = null)}
            onPointerLeave={() => (dragIndex.current = null)}
            role="img"
            aria-label={t("Zonen-Editor", "Zone editor")}
          >
            {baseImageUrl ? <image href={baseImageUrl} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" /> : <QuarryIllustration />}
            {otherZones.map((z) => (
              <polygon key={z.id} points={polygonPoints(z.polygon)} fill={z.color} fillOpacity="0.15" stroke={z.color} strokeOpacity="0.6" strokeDasharray="4 3" />
            ))}
            {points.length >= 2 && (
              <polygon points={polygonPoints(points)} fill={color} fillOpacity={mode === "edit" ? 0.45 : 0.25} stroke="#fff" strokeWidth="2" />
            )}
            {mode === "edit" &&
              points.map((p, i) => {
                const n = points[(i + 1) % points.length];
                return (
                  <circle
                    key={`m${i}`}
                    cx={(p[0] + n[0]) / 2}
                    cy={(p[1] + n[1]) / 2}
                    r="5"
                    fill="#ffffff"
                    fillOpacity="0.6"
                    stroke="#0c0f13"
                    className="cursor-copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      insertAt(i);
                    }}
                  />
                );
              })}
            {points.map((p, i) => (
              <circle
                key={`p${i}`}
                cx={p[0]}
                cy={p[1]}
                r="8"
                fill={i === 0 ? "#c8102e" : "#ffffff"}
                stroke="#0c0f13"
                strokeWidth="2"
                className={mode === "edit" ? "cursor-grab" : undefined}
                onPointerDown={(e) => {
                  if (mode !== "edit") return;
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  dragIndex.current = i;
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
              />
            ))}
          </svg>
        </div>
        <p className="text-xs text-fg-muted">
          {t("Koordinaten im Kartensystem 1000 × 700. Eckpunkte:", "Coordinates in the 1000 × 700 map system. Corner points:")} {points.length}
        </p>
      </div>

      <div className="space-y-4">
        <FormStatus state={state} locale={locale} okText={t("Zone gespeichert.", "Zone saved.")} />
        {state.message === "polygon" && <p className="text-sm text-danger">{t("Die Fläche braucht mindestens 3 Eckpunkte.", "The shape needs at least 3 corner points.")}</p>}
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label={t("Code", "Code")} htmlFor="code" required>
            <Input id="code" name="code" defaultValue={zone.code} required />
          </Field>
          <Field label={t("Typ", "Type")} htmlFor="kind">
            <Select id="kind" name="kind" defaultValue={zone.kind}>
              {Object.entries(zoneKindLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[locale]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("Name (Deutsch)", "Name (German)")} htmlFor="name_de" required>
          <Input id="name_de" name="name_de" defaultValue={zone.nameDe} required />
        </Field>
        <Field label={t("Name (Englisch)", "Name (English)")} htmlFor="name_en" required>
          <Input id="name_en" name="name_en" defaultValue={zone.nameEn} required />
        </Field>
        <Field label={t("Beschreibung (Deutsch)", "Description (German)")} htmlFor="desc_de">
          <Textarea id="desc_de" name="desc_de" defaultValue={zone.descDe} rows={3} />
        </Field>
        <Field label={t("Beschreibung (Englisch)", "Description (English)")} htmlFor="desc_en">
          <Textarea id="desc_en" name="desc_en" defaultValue={zone.descEn} rows={3} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Farbe", "Colour")} htmlFor="color">
            <Input id="color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" />
          </Field>
          <Field label={t("Kapazität", "Capacity")} htmlFor="capacity" hint={t("parallele Buchungen", "parallel bookings")}>
            <Input id="capacity" name="capacity" type="number" min={0} max={50} defaultValue={zone.capacity} />
          </Field>
          <Field label={t("Fläche (ha)", "Area (ha)")} htmlFor="area_ha">
            <Input id="area_ha" name="area_ha" type="number" step="0.01" min={0} defaultValue={zone.areaHa ?? ""} />
          </Field>
        </div>
        <Field label={t("Sicherheitshinweise (intern)", "Safety notes (internal)")} htmlFor="safety_notes" hint={t("z. B. Sicherheitsabstände, Sperrbereiche, Zugang", "e.g. safety distances, exclusion areas, access")}>
          <Textarea id="safety_notes" name="safety_notes" defaultValue={zone.safetyNotes ?? ""} rows={3} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox name="bookable" defaultChecked={zone.bookable} label={t("Buchbar", "Bookable")} />
          <Checkbox name="public_visible" defaultChecked={zone.publicVisible} label={t("Auf Landingpage zeigen", "Show on landing page")} />
          <Checkbox name="active" defaultChecked={zone.active} label={t("Aktiv", "Active")} />
        </div>
        <Field label={t("Reihenfolge", "Order")} htmlFor="sort_order">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={zone.sortOrder} className="max-w-28" />
        </Field>
        <Button type="submit" disabled={pending || points.length < 3}>
          {t("Zone speichern", "Save zone")}
        </Button>
      </div>
    </form>
  );
}
