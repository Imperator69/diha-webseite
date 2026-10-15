import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export type TableView = { head: string[]; rows: (string | number)[][]; alignRight?: number[] };

/** Rahmen für ein Diagramm: Titel, Legende (ab zwei Reihen), Diagramm und Tabellenansicht. */
export function ChartCard({
  title,
  description,
  legend,
  table,
  tableLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  legend?: { label: string; color: string }[];
  table?: TableView;
  tableLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} />
      <CardBody className="space-y-4">
        {legend && legend.length > 1 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-[3px]" style={{ background: l.color }} aria-hidden />
                {l.label}
              </li>
            ))}
          </ul>
        )}
        {children}
        {table && (
          <details className="text-xs">
            <summary className="cursor-pointer text-fg-muted hover:text-fg">{tableLabel}</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {table.head.map((h, i) => (
                      <th key={h + i} className={`border-b border-border px-2 py-1 font-medium text-fg-muted ${table.alignRight?.includes(i) ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className={`border-b border-border px-2 py-1 ${table.alignRight?.includes(ci) ? "text-right tabular-nums" : ""}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
