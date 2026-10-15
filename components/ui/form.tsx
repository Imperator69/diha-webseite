import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const control =
  "block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-xs placeholder:text-fg-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(control, "min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  // React übernimmt ein geändertes defaultValue bei <select> nicht. Ohne neuen Key würde das
  // Formular nach dem Speichern (automatischer Reset) auf den Wert beim ersten Rendern zurückspringen.
  const key = props.defaultValue !== undefined ? JSON.stringify(props.defaultValue) : undefined;
  return (
    <select key={key} className={clsx(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={clsx("flex items-start gap-2.5 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-border accent-signal" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | string[] | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-signal" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !message && <p className="text-xs text-fg-muted">{hint}</p>}
      {message && (
        <p className="text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
