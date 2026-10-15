/** CSV für Excel (Semikolon, UTF-8 mit BOM). Text, der wie eine Formel beginnt, wird entschärft. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Betrag in Euro als Text mit lokalem Dezimaltrennzeichen. */
export function euros(cents: number, locale: "de" | "en"): string {
  const v = (cents / 100).toFixed(2);
  return locale === "de" ? v.replace(".", ",") : v;
}
