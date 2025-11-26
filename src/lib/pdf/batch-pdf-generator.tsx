import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { QRLabelDocument, generateQRCodeDataUrl, type LabelData } from './qr-label-generator';
import type { QRTemplateField } from '@/app/(protected)/warehouse/[warehouse_slug]/qr-codes/QRTemplateCustomisationStep';

/**
 * Generate PDF blob from stock units
 */
export async function generatePDFBlob(
	stockUnits: LabelData[],
	selectedFields: QRTemplateField[],
	companyLogoUrl: string | null
): Promise<Blob> {
	const { pdf } = await import('@react-pdf/renderer');

	// Generate QR codes for all stock units
	const unitsWithQR = await Promise.all(
		stockUnits.map(async (unit) => {
			const qrCodeDataUrl = await generateQRCodeDataUrl(unit.id);
			return { ...unit, qrCodeDataUrl };
		})
	);

	// Generate and return PDF blob
	const blob = await pdf(
		<QRLabelDocument
			stockUnits={unitsWithQR}
			selectedFields={selectedFields}
			companyLogoUrl={companyLogoUrl}
		/>
	).toBlob();

	return blob;
}

/**
 * Helper to download a PDF blob
 */
export function downloadPDF(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
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
export async function generateBatchPDF(batchId: string, companyId: string): Promise<{ blob: Blob; batchName: string }> {
	const supabase = createClient();

	// Fetch batch details
	const { data: batch, error: batchError } = await supabase
		.from('qr_batches')
		.select('batch_name, fields_selected')
		.eq('id', batchId)
		.single();

	if (batchError) throw batchError;
	if (!batch) throw new Error('Batch not found');

	// Fetch stock units with full product data
	const { data: batchItems, error: itemsError } = await supabase
		.from('qr_batch_items')
		.select(`
			stock_unit_id,
			stock_units (
				id,
				sequence_number,
				manufacturing_date,
				initial_quantity,
				quality_grade,
				warehouse_location,
				products (
					name,
					sequence_number,
					hsn_code,
					stock_type,
					gsm,
					selling_price_per_unit,
					product_material_assignments (
						material:product_materials (
							id,
							name
						)
					),
					product_color_assignments (
						color:product_colors (
							id,
							name
						)
					)
				)
			)
		`)
		.eq('batch_id', batchId);

	if (itemsError) throw itemsError;
	if (!batchItems || batchItems.length === 0) {
		throw new Error('No stock units found in batch');
	}

	// Fetch company logo
	const { data: companyData, error: companyError } = await supabase
		.from('companies')
		.select('logo_url')
		.eq('id', companyId)
		.single();

	if (companyError) throw companyError;

	// Transform data to LabelData format
	const stockUnits: LabelData[] = batchItems
		.map((item: any) => {
			const unit = item.stock_units;
			if (!unit) return null;

			return {
				id: unit.id,
				sequence_number: unit.sequence_number,
				manufacturing_date: unit.manufacturing_date,
				initial_quantity: unit.initial_quantity,
				quality_grade: unit.quality_grade,
				warehouse_location: unit.warehouse_location,
				product: {
					name: unit.products?.name || '',
					sequence_number: unit.products?.sequence_number || 0,
					hsn_code: unit.products?.hsn_code,
					stock_type: unit.products?.stock_type,
					gsm: unit.products?.gsm,
					selling_price_per_unit: unit.products?.selling_price_per_unit,
					materials: unit.products?.product_material_assignments
						?.map((a: any) => a.material)
						.filter(Boolean) || [],
					colors: unit.products?.product_color_assignments
						?.map((a: any) => a.color)
						.filter(Boolean) || [],
				},
			};
		})
		.filter(Boolean) as LabelData[];

	const selectedFields = (batch.fields_selected || []) as QRTemplateField[];
	const companyLogoUrl = companyData?.logo_url || null;

	// Generate PDF blob
	const blob = await generatePDFBlob(stockUnits, selectedFields, companyLogoUrl);

	return { blob, batchName: batch.batch_name };
}

/**
 * Fetches batch data, generates PDF, and downloads it
 */
export async function generateAndDownloadBatchPDF(batchId: string, companyId: string) {
	const { blob, batchName } = await generateBatchPDF(batchId, companyId);
	downloadPDF(blob, `${batchName}.pdf`);
	return { batchName };
}
