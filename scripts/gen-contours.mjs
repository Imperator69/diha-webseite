// Erzeugt das Höhenlinien-Muster (public/brand/contours.svg) deterministisch.
import { writeFileSync } from "node:fs";

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const W = 1400;
const H = 900;
const centers = [
  { x: 980, y: 380, rings: 16, base: 30, step: 26 },
  { x: 260, y: 640, rings: 11, base: 24, step: 30 },
  { x: 620, y: 80, rings: 8, base: 40, step: 34 },
];

function ring(cx, cy, r, phase) {
  const pts = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.12 * Math.sin(3 * a + phase) + 0.07 * Math.sin(5 * a + phase * 1.7) + 0.04 * Math.sin(9 * a + phase * 0.6);
    pts.push([cx + Math.cos(a) * r * 1.35 * wobble, cy + Math.sin(a) * r * wobble]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    d += `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  }
  return d + "Z";
}

let paths = "";
for (const c of centers) {
  const phase = rand() * 6;
  for (let k = 0; k < c.rings; k++) {
    const r = c.base + k * c.step;
    const opacity = k % 5 === 4 ? 0.11 : 0.055;
    paths += `<path d="${ring(c.x, c.y, r, phase + k * 0.18)}" stroke-opacity="${opacity}"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g fill="none" stroke="#ffffff" stroke-width="1">${paths}</g></svg>`;
writeFileSync(new URL("../public/brand/contours.svg", import.meta.url), svg);
console.log("contours.svg", svg.length, "bytes");
