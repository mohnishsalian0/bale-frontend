import { pdf } from "@react-pdf/renderer";
import { DeliveryChallanPDF } from "@/components/pdf/DeliveryChallanPDF";
import type { OutwardDetailView } from "@/types/stock-flow.types";
import type { Company } from "@/types/companies.types";

/**
 * Generate PDF blob from goods outward data
 */
export async function generateDeliveryChallanPDF(
  outward: OutwardDetailView,
  company: Company,
): Promise<Blob> {
  const blob = await pdf(
    <DeliveryChallanPDF outward={outward} company={company} />,
  ).toBlob();
  return blob;
}

/**
 * Download delivery challan PDF to client
 */
export async function downloadDeliveryChallanPDF(
  outward: OutwardDetailView,
  company: Company,
  filename?: string,
): Promise<void> {
  const blob = await generateDeliveryChallanPDF(outward, company);

  // Generate filename if not provided
  const challanFilename = filename || `DC-GO-${outward.sequence_number}.pdf`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = challanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
