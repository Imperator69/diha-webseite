"use client";

import { useActionState } from "react";
import { uploadMapImageAction } from "@/lib/actions/site";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { translator } from "@/lib/i18n/t";
import { FormStatus } from "./form-status";

export function MapImageForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(uploadMapImageAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <FormStatus state={state} locale={locale} okText={t("Kartenbild aktualisiert.", "Map image updated.")} />
      <input
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bg-subtle file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      <p className="text-xs text-fg-muted">
        {t(
          "PNG, JPG oder WebP, max. 8 MB, idealerweise im Seitenverhältnis 10:7 (z. B. 2000 × 1400 px). Danach Zonen im Editor an das neue Bild anpassen.",
          "PNG, JPG or WebP, max. 8 MB, ideally 10:7 aspect ratio (e.g. 2000 × 1400 px). Then adjust the zones to the new image in the editor.",
        )}
      </p>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {t("Hochladen", "Upload")}
      </Button>
    </form>
  );
}
