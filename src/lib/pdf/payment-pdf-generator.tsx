import { pdf } from "@react-pdf/renderer";
import { PaymentPDF } from "@/components/pdf/PaymentPDF";
import type { PaymentDetailView } from "@/types/payments.types";
import type { Company } from "@/types/companies.types";

/**
 * Generate PDF blob from payment data
 */
export async function generatePaymentPDF(
  payment: PaymentDetailView,
  company: Company,
): Promise<Blob> {
  const blob = await pdf(
    <PaymentPDF payment={payment} company={company} />,
  ).toBlob();
  return blob;
}

/**
 * Download payment PDF to client
 */
export async function downloadPaymentPDF(
  payment: PaymentDetailView,
  company: Company,
  filename?: string,
): Promise<void> {
  const blob = await generatePaymentPDF(payment, company);

  // Generate filename if not provided (payment number with slashes replaced)
  const paymentFilename =
    filename || `${payment.payment_number.replace(/\//g, "-")}.pdf`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = paymentFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
