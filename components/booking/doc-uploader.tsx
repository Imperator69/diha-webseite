"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";
import { errorText } from "@/lib/i18n/errors";
import { docKindLabels } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";

type Props = {
  locale: Locale;
  scope: "booking" | "project" | "permit" | "site" | "zone";
  kind?: string;
  kinds?: string[];
  projectId?: string;
  bookingId?: string;
  permitId?: string;
  zoneId?: string;
  /** Auswahl einer Zone für Standort-Unterlagen (leer = gesamtes Gelände) */
  zones?: { id: string; code: string; name: string }[];
  /** Projekt-Benutzer können eine Unterlage für alle Buchungen ihres Projekts hinterlegen */
  offerProjectScope?: boolean;
  compact?: boolean;
  onUploaded?: () => void;
};

export function DocUploader({ locale, scope, kind, kinds, projectId, bookingId, permitId, zoneId, zones, offerProjectScope, compact, onUploaded }: Props) {
  const t = translator(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    const useProject = fd.get("project_scope") === "on";
    const pickedZone = String(fd.get("zone_id") ?? "");
    fd.set("scope", useProject ? "project" : scope === "site" && pickedZone ? "zone" : scope);
    if (projectId) fd.set("project_id", projectId);
    if (bookingId && !useProject) fd.set("booking_id", bookingId);
    if (permitId) fd.set("permit_id", permitId);
    if (zoneId) fd.set("zone_id", zoneId);
    else if (!pickedZone) fd.delete("zone_id");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(json.error ?? "server");
      else {
        (e.target as HTMLFormElement).reset();
        setDone(true);
        onUploaded?.();
        router.refresh();
      }
    } catch {
      setError("server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="@container">
      <form
        onSubmit={onSubmit}
        className={compact ? "flex flex-wrap items-end gap-2" : zones ? "grid items-end gap-3 @lg:grid-cols-2" : "grid items-end gap-3 @lg:grid-cols-2 @3xl:grid-cols-[1fr_1fr_150px_auto]"}
      >
        {kind ? (
          <input type="hidden" name="kind" value={kind} />
        ) : (
          <label className="text-xs font-medium">
            {t("Art", "Type")}
            <Select name="kind" className="mt-1" defaultValue={kinds?.[0] ?? "other"}>
              {(kinds ?? Object.keys(docKindLabels)).map((k) => (
                <option key={k} value={k}>
                  {docKindLabels[k]?.[locale] ?? k}
                </option>
              ))}
            </Select>
          </label>
        )}
        {zones && (
          <label className="text-xs font-medium">
            {t("Bereich", "Area")}
            <Select name="zone_id" className="mt-1" defaultValue="">
              <option value="">{t("Gesamtes Gelände", "Entire site")}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} · {z.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="text-xs font-medium">
          {t("Datei (PDF, Bild, Office; max. 25 MB)", "File (PDF, image, Office; max. 25 MB)")}
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.odt,.txt,.csv,.kml,.zip"
            className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-bg-subtle file:px-2 file:py-1.5 file:text-xs file:font-medium"
          />
        </label>
        {!compact && (
          <label className="text-xs font-medium">
            {t("Gültig bis", "Valid until")}
            <Input type="date" name="valid_until" className="mt-1" />
          </label>
        )}
        <div className="flex flex-col gap-2">
          {offerProjectScope && (
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="project_scope" className="accent-signal" />
              {t("für alle Buchungen merken", "keep for all bookings")}
            </label>
          )}
          <Button type="submit" size="sm" variant="secondary" disabled={busy}>
            <Upload className="size-3.5" />
            {busy ? t("Lädt …", "Uploading …") : t("Hochladen", "Upload")}
          </Button>
        </div>
        {error && <p className="text-xs font-medium text-danger col-span-full">{errorText(locale, error)}</p>}
        {done && <p className="text-xs font-medium text-ok col-span-full">{t("Hochgeladen.", "Uploaded.")}</p>}
      </form>
    </div>
  );
}
