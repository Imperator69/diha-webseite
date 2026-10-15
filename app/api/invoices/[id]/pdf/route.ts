import { routeViewer } from "@/lib/auth/current";
import { can } from "@/lib/auth/rbac";
import { loadInvoice, pdfFileName, pdfInput, storedPdf } from "@/lib/invoices/data";
import { renderInvoicePdf } from "@/lib/invoices/pdf";
import { contentDisposition } from "@/lib/storage";

/** Rechnungs-PDF: Manager alle (Entwürfe als Vorschau), Projekte nur eigene ausgestellte Rechnungen. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await routeViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const full = await loadInvoice((await params).id);
  const staff = can(viewer.role, "invoices.manage");
  if (!full || (!staff && (full.invoice.status === "draft" || !viewer.projectIds.includes(full.invoice.projectId)))) return new Response("Not found", { status: 404 });
  const bytes = full.invoice.status === "draft" ? await renderInvoicePdf(await pdfInput(full, true)) : await storedPdf(full);
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(pdfFileName(full.invoice), true),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
