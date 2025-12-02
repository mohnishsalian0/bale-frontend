import React from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  QRLabelDocument,
  generateQRCodeDataUrl,
  type LabelData,
} from "./qr-label-generator";
import type { QRTemplateField } from "@/app/(protected)/warehouse/[warehouse_slug]/qr-codes/QRTemplateCustomisationStep";
import { getQRBatchById } from "@/lib/queries/qr-batches";

/**
 * Generate PDF blob from stock units
 */
export async function generatePDFBlob(
  stockUnits: LabelData[],
  selectedFields: QRTemplateField[],
  companyLogoUrl: string | null,
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");

  // Generate QR codes for all stock units
  const unitsWithQR = await Promise.all(
    stockUnits.map(async (unit) => {
      const qrCodeDataUrl = await generateQRCodeDataUrl(unit.id);
      return { ...unit, qrCodeDataUrl };
    }),
  );

  // Generate and return PDF blob
  const blob = await pdf(
    <QRLabelDocument
      stockUnits={unitsWithQR}
      selectedFields={selectedFields}
      companyLogoUrl={companyLogoUrl}
    />,
  ).toBlob();

  return blob;
}

/**
 * Helper to download a PDF blob
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetches batch data and generates PDF blob
 * Returns the blob and batch name for the caller to decide what to do with it
 */
export async function generateBatchPDF(
  batchId: string,
  companyId: string,
): Promise<{ blob: Blob; batchName: string }> {
  const supabase = createClient();

  // Fetch batch with full details using centralized query
  const batch = await getQRBatchById(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  // Fetch company logo
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("logo_url")
    .eq("id", companyId)
    .single<{ logo_url: string }>();

  if (companyError) throw companyError;

  // Transform batch items to LabelData format
  const stockUnits: LabelData[] = batch.qr_batch_items.map((item) => {
    const unit = item.stock_unit!;
    const product = unit.product!;

    return {
      id: unit.id,
      sequence_number: unit.sequence_number,
      manufacturing_date: unit.manufacturing_date,
      initial_quantity: unit.initial_quantity,
      quality_grade: unit.quality_grade,
      warehouse_location: unit.warehouse_location,
      product: {
        name: product.name,
        sequence_number: product.sequence_number,
        hsn_code: product.hsn_code,
        gsm: product.gsm,
        selling_price_per_unit: product.selling_price_per_unit,
        stock_type: product.stock_type,
        measuring_unit: product.measuring_unit,
        // Product data already transformed with materials/colors arrays
        materials: product.materials || [],
        colors: product.colors || [],
      },
    };
  });

  const selectedFields = (batch.fields_selected || []) as QRTemplateField[];
  const companyLogoUrl = companyData?.logo_url || null;

  // Generate PDF blob
  const blob = await generatePDFBlob(
    stockUnits,
    selectedFields,
    companyLogoUrl,
  );

  return { blob, batchName: batch.batch_name };
}

/**
 * Fetches batch data, generates PDF, and downloads it
 */
export async function generateAndDownloadBatchPDF(
  batchId: string,
  companyId: string,
) {
  const { blob, batchName } = await generateBatchPDF(batchId, companyId);
  downloadPDF(blob, `${batchName}.pdf`);
  return { batchName };
}
