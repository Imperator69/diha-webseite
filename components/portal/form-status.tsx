"use client";

import { Alert } from "@/components/ui/card";
import type { FormState } from "@/lib/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import { errorText } from "@/lib/i18n/errors";

export function FormStatus({ state, locale, okText }: { state: FormState; locale: Locale; okText?: string }) {
  if (state.error) return <Alert tone="danger">{errorText(locale, state.error)}</Alert>;
  if (state.ok && okText) return <Alert tone="ok">{okText}</Alert>;
  return null;
}

export function CopyField({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg-subtle px-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="rounded-lg px-3 text-xs font-semibold ring-1 ring-border hover:bg-bg-subtle" onClick={() => navigator.clipboard?.writeText(value)}>
          Copy
        </button>
      </div>
    </div>
  );
}
