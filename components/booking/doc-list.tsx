"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { docKindLabels, label } from "@/lib/i18n/labels";
import { translator } from "@/lib/i18n/t";

export type ListedDoc = { id: string; kind: string; title: string; fileName: string; validUntil: string | null; status: string; scope: string; canDelete: boolean };

export function DocList({ locale, docs, canReview }: { locale: Locale; docs: ListedDoc[]; canReview: boolean }) {
  const t = translator(locale);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function review(id: string, status: "accepted" | "rejected") {
    setBusy(id);
    await fetch(`/api/documents/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm(t("Unterlage wirklich löschen?", "Really delete this document?"))) return;
    setBusy(id);
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  if (docs.length === 0) return <p className="text-sm text-fg-muted">{t("Noch keine Unterlagen.", "No documents yet.")}</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul className="divide-y divide-border">
      {docs.map((d) => {
        const expired = d.validUntil !== null && d.validUntil < today;
        return (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.title}</p>
              <p className="text-xs text-fg-muted">
                {label(docKindLabels, d.kind, locale)}
                {d.validUntil && ` · ${t("gültig bis", "valid until")} ${formatDate(d.validUntil, locale)}`}
                {d.scope === "project" && ` · ${t("Projektunterlage", "project document")}`}
              </p>
            </div>
            {expired ? (
              <Badge tone="danger">{t("abgelaufen", "expired")}</Badge>
            ) : (
              <Badge tone={d.status === "accepted" ? "ok" : d.status === "rejected" ? "danger" : "warn"}>
                {d.status === "accepted" ? t("geprüft", "accepted") : d.status === "rejected" ? t("abgelehnt", "rejected") : t("ungeprüft", "pending")}
              </Badge>
            )}
            {canReview && d.status !== "accepted" && (
              <button type="button" disabled={busy === d.id} onClick={() => review(d.id, "accepted")} className="text-xs font-semibold text-ok hover:underline">
                {t("Akzeptieren", "Accept")}
              </button>
            )}
            {canReview && d.status !== "rejected" && (
              <button type="button" disabled={busy === d.id} onClick={() => review(d.id, "rejected")} className="text-xs font-semibold text-danger hover:underline">
                {t("Ablehnen", "Reject")}
              </button>
            )}
            <a href={`/api/documents/${d.id}`} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg" aria-label={t("Herunterladen", "Download")} title={d.fileName}>
              <Download className="size-4" />
            </a>
            {d.canDelete && (
              <button type="button" onClick={() => remove(d.id)} disabled={busy === d.id} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-danger" aria-label={t("Löschen", "Delete")}>
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
