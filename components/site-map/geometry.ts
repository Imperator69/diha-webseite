export type Pt = [number, number];
export type Box = { x: number; y: number; w: number; h: number };

export const MAP_W = 1000;
export const MAP_H = 700;
export const FULL_VIEW: Box = { x: 0, y: 0, w: MAP_W, h: MAP_H };

export function centroid(points: Pt[]): Pt {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const f = x0 * y1 - x1 * y0;
    area += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (Math.abs(area) < 1e-6) {
    const sx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const sy = points.reduce((s, p) => s + p[1], 0) / points.length;
    return [sx, sy];
  }
  area *= 0.5;
  return [cx / (6 * area), cy / (6 * area)];
}

export function bbox(points: Pt[]): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Ausschnitt um ein Polygon mit Rand, im Seitenverhältnis der Karte. */
export function focusBox(points: Pt[], padding = 0.35): Box {
  const b = bbox(points);
  const ratio = MAP_W / MAP_H;
  let w = b.w * (1 + padding * 2);
  let h = b.h * (1 + padding * 2);
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  w = Math.max(w, 260);
  h = w / ratio;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), MAP_W - w);
  const y = Math.min(Math.max(cy - h / 2, 0), MAP_H - h);
  return { x, y, w, h };
}

export function polygonPoints(points: Pt[]): string {
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

/** Geschlossener, geglätteter Pfad (Catmull-Rom → Bézier). */
export function smoothClosedPath(points: Pt[], tension = 0.5): string {
  const n = points.length;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d + "Z";
}

export function smoothOpenPath(points: Pt[]): string {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function interpolateBox(a: Box, b: Box, t: number): Box {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
