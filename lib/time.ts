import { TIME_ZONE } from "./i18n/format";

const DAY_MS = 86_400_000;

function partsInZone(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  return map as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Versatz der Zeitzone gegenüber UTC in Minuten zum Zeitpunkt ms. */
export function zoneOffsetMinutes(ms: number, timeZone = TIME_ZONE): number {
  const p = partsInZone(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** Wandelt eine Wiener Wandzeit ("2026-10-15", "08:00") in UTC-Millisekunden um. */
export function zonedToUtc(date: string, time: string, timeZone = TIME_ZONE): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Zwei Iterationen fangen die Sommerzeit-Umstellung ab.
  let guess = naive - zoneOffsetMinutes(naive, timeZone) * 60_000;
  guess = naive - zoneOffsetMinutes(guess, timeZone) * 60_000;
  return guess;
}

/** Kalendertag (YYYY-MM-DD) eines Zeitpunkts in Wien. */
export function zonedDate(ms: number, timeZone = TIME_ZONE): string {
  const p = partsInZone(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function zonedTime(ms: number, timeZone = TIME_ZONE): string {
  const p = partsInZone(ms, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function startOfIsoWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function utcMidnight(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / DAY_MS);
}

export function todayInVienna(nowMs = Date.now()): string {
  return zonedDate(nowMs);
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Aktueller Zeitpunkt; in Server-Komponenten statt Date.now() verwenden (Lint-Regel react-hooks/purity). */
export function nowMs(): number {
  return Date.now();
}
