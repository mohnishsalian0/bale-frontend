import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/InvoicePDF";
import type { InvoiceDetailView } from "@/types/invoices.types";

/**
 * Generate PDF blob from invoice data
 */
export async function generateInvoicePDF(
  invoice: InvoiceDetailView,
): Promise<Blob> {
  const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
  return blob;
}

/**
 * Download invoice PDF to client
 */
export async function downloadInvoicePDF(
  invoice: InvoiceDetailView,
  filename?: string,
): Promise<void> {
  const blob = await generateInvoicePDF(invoice);

  // Generate filename if not provided (just invoice number)
  const invoiceFilename =
    filename || `${invoice.invoice_number.replace(/\//g, "-")}.pdf`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = invoiceFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
