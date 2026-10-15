import { asc, eq } from "drizzle-orm";
import type { MapZone } from "@/components/site-map/site-map";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { zoneKindLabels } from "@/lib/i18n/labels";
import { seedZones } from "@/lib/seed-data";

type ZoneRow = typeof schema.zones.$inferSelect;

export function toMapZone(z: Pick<ZoneRow, "id" | "code" | "nameDe" | "nameEn" | "descDe" | "descEn" | "kind" | "color" | "polygon" | "bookable">, locale: Locale): MapZone {
  return {
    id: z.id,
    code: z.code,
    name: locale === "en" ? z.nameEn : z.nameDe,
    description: locale === "en" ? z.descEn : z.descDe,
    kindLabel: zoneKindLabels[z.kind]?.[locale] ?? z.kind,
    color: z.color,
    polygon: z.polygon,
    bookable: z.bookable,
  };
}

/** Öffentlich sichtbare Zonen für die Landingpage (Fallback: Startdaten). */
export async function publicZones(locale: Locale): Promise<MapZone[]> {
  try {
    const rows = await db().select().from(schema.zones).where(eq(schema.zones.active, true)).orderBy(asc(schema.zones.sortOrder));
    return rows.filter((z) => z.publicVisible).map((z) => toMapZone(z, locale));
  } catch {
    return seedZones.filter((z) => z.publicVisible).map((z) => toMapZone(z, locale));
  }
}

export async function mapBaseImageUrl(): Promise<string | null> {
  try {
    const row = (await db().select().from(schema.settings).where(eq(schema.settings.key, "map")).limit(1))[0];
    const value = row?.value as { baseImageKey?: string | null; version?: number } | undefined;
    return value?.baseImageKey ? `/api/map/base?v=${value.version ?? 0}` : null;
  } catch {
    return null;
  }
}

/** Alle aktiven Zonen für angemeldete Benutzer (inkl. nicht öffentlicher). */
export async function portalZones(locale: Locale): Promise<{ map: MapZone[]; rows: ZoneRow[] }> {
  const rows = await db().select().from(schema.zones).orderBy(asc(schema.zones.sortOrder));
  return { rows, map: rows.filter((z) => z.active).map((z) => toMapZone(z, locale)) };
}
