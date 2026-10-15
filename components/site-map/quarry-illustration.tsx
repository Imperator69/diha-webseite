import { smoothClosedPath, smoothOpenPath, type Pt } from "./geometry";

// Stilisierte Draufsicht des Steinbruchs (Platzhalter, bis die finalen Grafiken vorliegen).
const pit: Pt[] = [
  [180, 250],
  [250, 130],
  [420, 85],
  [640, 68],
  [850, 115],
  [945, 255],
  [905, 455],
  [800, 585],
  [600, 625],
  [420, 575],
  [300, 500],
  [205, 390],
];

const center: Pt = [575, 345];
const terraces = [
  { s: 1, fill: "#55595c" },
  { s: 0.86, fill: "#666864" },
  { s: 0.72, fill: "#78776f" },
  { s: 0.58, fill: "#8a867b" },
  { s: 0.44, fill: "#9c9587" },
  { s: 0.3, fill: "#ada493" },
];

function scaled(points: Pt[], s: number, dy: number): Pt[] {
  return points.map(([x, y]) => [center[0] + (x - center[0]) * s, center[1] + (y - center[1]) * s + dy]);
}

const road: Pt[] = [
  [-10, 694],
  [90, 642],
  [180, 602],
  [262, 562],
  [360, 515],
  [455, 450],
  [530, 375],
  [585, 318],
  [640, 352],
  [690, 380],
];

const pond: Pt[] = [
  [640, 456],
  [712, 424],
  [792, 440],
  [822, 494],
  [774, 542],
  [690, 548],
  [644, 508],
];

const trees: Pt[] = [];
// Deterministisch verteilte Baumgruppen außerhalb der Grube
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 420; i++) {
  const x = rnd() * 1000;
  const y = rnd() * 700;
  const dx = (x - center[0]) / 430;
  const dy = (y - center[1]) / 330;
  const insideField = x < 300 && y > 520;
  if (dx * dx + dy * dy > 1.05 && !insideField) trees.push([x, y]);
}

export function QuarryIllustration() {
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id="qi-vignette" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id="qi-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f7896" />
          <stop offset="100%" stopColor="#24506a" />
        </linearGradient>
        <pattern id="qi-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#2c2f33" strokeWidth="3" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="1000" height="700" fill="#1d2820" />
      {/* Felder im Südwesten */}
      <path d="M-10 520 L300 505 L330 700 L-10 700 Z" fill="#3a4a2e" />
      <path d="M-10 600 L140 590 L150 700 L-10 700 Z" fill="#46573a" />
      {trees.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(5 + (i % 4)).toString()} fill={i % 3 === 0 ? "#2a3a2c" : "#243327"} />
      ))}

      {/* Terrassen (Etagen) der Grube */}
      {terraces.map((t, i) => (
        <g key={t.s}>
          <path d={smoothClosedPath(scaled(pit, t.s, i * 6 + 5))} fill="#2c2f33" opacity="0.55" />
          <path d={smoothClosedPath(scaled(pit, t.s, i * 6))} fill={t.fill} stroke="#3a3d41" strokeWidth="1.5" />
        </g>
      ))}

      {/* Aktiver Abbau des Betreibers (nicht buchbar) */}
      <path d="M868 300 C900 320 914 380 896 430 C870 446 846 420 842 380 C840 340 848 310 868 300Z" fill="url(#qi-hatch)" opacity="0.55" />

      {/* Wasserfläche */}
      <path d={smoothClosedPath(pond)} fill="url(#qi-water)" stroke="#9cc3d6" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M690 470 q20 -6 40 0 M700 500 q24 -6 48 0 M720 524 q16 -5 32 0" stroke="#bfe0ee" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />

      {/* Zufahrt und Fahrwege */}
      <path d={smoothOpenPath(road)} stroke="#2b2b2a" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={smoothOpenPath(road)} stroke="#c9b990" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M585 318 C620 250 700 230 760 260" stroke="#b9aa84" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* Gebäude an der Basis */}
      <rect x="110" y="600" width="46" height="26" fill="#d9d4c9" stroke="#2b2b2a" />
      <rect x="164" y="590" width="30" height="22" fill="#cfc9bd" stroke="#2b2b2a" />
      {/* Container-Cluster */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={250 + i * 22} y={540 + (i % 2) * 4} width="18" height="40" fill="#8a96a8" stroke="#1f2630" />
      ))}

      {/* Nordpfeil */}
      <g transform="translate(958 40)">
        <circle r="18" fill="#0c0f13" opacity="0.6" />
        <path d="M0 -12 L6 6 L0 2 L-6 6 Z" fill="#ffffff" />
        <text y="15" textAnchor="middle" fontSize="8" fill="#ffffff" fontFamily="inherit">N</text>
      </g>
      <rect x="0" y="0" width="1000" height="700" fill="url(#qi-vignette)" />
    </g>
  );
}
