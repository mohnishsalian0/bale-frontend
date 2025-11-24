import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { formatStockUnitNumber } from '@/lib/utils/stock-unit';
import type { QRTemplateField } from '@/app/warehouse/[warehouse_slug]/(flow)/qr-codes/QRTemplateCustomisationStep';
import type { Tables } from '@/types/database/supabase';
import type { StockType } from '@/types/database/enums';

// Type for product attributes in label data
interface LabelProductAttribute {
	id: string;
	name: string;
}

// Type for label data combining stock unit and product information
export type LabelData = Pick<
	Tables<'stock_units'>,
	'id' | 'sequence_number' | 'manufacturing_date' | 'initial_quantity' | 'quality_grade' | 'warehouse_location'
> & {
	product: Pick<
		Tables<'products'>,
		'name' | 'sequence_number' | 'hsn_code' | 'gsm' | 'selling_price_per_unit' | 'stock_type'
	> & {
		materials?: LabelProductAttribute[];
		colors?: LabelProductAttribute[];
	};
};

// Define styles for PDF
const styles = StyleSheet.create({
	page: {
		padding: 0,
		backgroundColor: '#ffffff',
	},
	labelsGrid: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	label: {
		width: '50%',
		padding: 16,
		position: 'relative',
		minHeight: 200,
		borderBottom: '2px solid #000000',
		borderRight: '2px solid #000000',
	},
	labelRight: {
		// Labels in right column - no right border
		borderRight: 'none',
	},
	labelContent: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 40, // Space for logo at bottom
	},
	fieldsList: {
		flex: 1,
		gap: 8,
	},
	fieldRow: {
		fontSize: 10,
		color: '#000000',
	},
	qrCode: {
		width: 100,
		height: 100,
	},
	logo: {
		position: 'absolute',
		bottom: 16,
		right: 16,
		width: 40,
		height: 40,
	},
});

interface QRLabelDocumentProps {
	stockUnits: LabelData[];
	selectedFields: QRTemplateField[];
	companyLogoUrl: string | null;
}

// Map field IDs to their display labels
const FIELD_LABELS: Record<QRTemplateField, string> = {
	product_name: 'Name:',
	product_number: 'Product No:',
	hsn_code: 'HSN code:',
	material: 'Material:',
	color: 'Color:',
	gsm: 'GSM:',
	selling_price_per_unit: 'Sale price:',
	unit_number: 'Unit No:',
	manufacturing_date: 'Made on:',
	initial_quantity: 'Size:',
	quality_grade: 'Quality:',
	warehouse_location: 'Location:',
};

// Generate QR code data URL
export async function generateQRCodeDataUrl(text: string): Promise<string> {
	try {
		return await QRCode.toDataURL(text, {
			width: 100,
			margin: 1,
			color: {
				dark: '#000000',
				light: '#FFFFFF',
			},
		});
	} catch (error) {
		console.error('Error generating QR code:', error);
		throw error;
	}
}

// Get field value from label data
function getFieldValue(unit: LabelData, field: QRTemplateField): string {
	let value: any;

	// Map fields to correct location (stock unit or product)
	switch (field) {
		case 'product_name':
			value = unit.product.name;
			break;
		case 'product_number':
			value = unit.product.sequence_number;
			break;
		case 'hsn_code':
			value = unit.product.hsn_code;
			break;
		case 'material':
			value = unit.product.materials?.map(m => m.name).join(', ') || '';
			break;
		case 'color':
			value = unit.product.colors?.map(c => c.name).join(', ') || '';
			break;
		case 'gsm':
			value = unit.product.gsm;
			break;
		case 'selling_price_per_unit':
			value = unit.product.selling_price_per_unit;
			break;
		case 'unit_number':
			return formatStockUnitNumber(unit.sequence_number, unit.product.stock_type as StockType);
		case 'manufacturing_date':
			value = unit.manufacturing_date;
			break;
		case 'initial_quantity':
			value = unit.initial_quantity;
			break;
		case 'quality_grade':
			value = unit.quality_grade;
			break;
		case 'warehouse_location':
			value = unit.warehouse_location;
			break;
		default:
			return '';
	}

	if (value === null || value === undefined) {
		return '';
	}

	// Format specific fields
	if (field === 'selling_price_per_unit' && typeof value === 'number') {
		return `₹${value.toFixed(2)}`;
	}

	if (field === 'initial_quantity' && typeof value === 'number') {
		return `${value} mtr`;
	}

	if (field === 'manufacturing_date' && typeof value === 'string') {
		return new Date(value).toLocaleDateString();
	}

	return String(value);
}

// Single label component
interface LabelProps {
	unit: LabelData;
	qrCodeDataUrl: string;
	selectedFields: QRTemplateField[];
	companyLogoUrl: string | null;
	isRightColumn: boolean;
}

const Label: React.FC<LabelProps> = ({ unit, qrCodeDataUrl, selectedFields, companyLogoUrl, isRightColumn }) => (
	<View style={[styles.label, isRightColumn ? styles.labelRight : {}]} wrap={false}>
		<View style={styles.labelContent}>
			<View style={styles.fieldsList}>
				{selectedFields.map((field) => {
					const value = getFieldValue(unit, field);
					if (!value) return null;

					return (
						<Text key={field} style={styles.fieldRow}>
							{FIELD_LABELS[field]} {value}
						</Text>
					);
				})}
			</View>
			<Image src={qrCodeDataUrl} style={styles.qrCode} />
		</View>
		{companyLogoUrl && (
			<Image src={companyLogoUrl} style={styles.logo} />
		)}
	</View>
);

// Main PDF document component
export const QRLabelDocument: React.FC<QRLabelDocumentProps> = ({
	stockUnits,
	selectedFields,
	companyLogoUrl,
}) => (
	<Document>
		<Page size="A4" style={styles.page}>
			<View style={styles.labelsGrid}>
				{stockUnits.map((unit, index) => (
					<Label
						key={unit.id}
						unit={unit}
						qrCodeDataUrl={(unit as any).qrCodeDataUrl} // Will be injected before rendering
						selectedFields={selectedFields}
						companyLogoUrl={companyLogoUrl}
						isRightColumn={index % 2 === 1} // Even indices = left column, odd = right column
					/>
				))}
			</View>
		</Page>
	</Document>
);

// Generate PDF and trigger download
export async function generateAndDownloadPDF(
	stockUnits: LabelData[],
	selectedFields: QRTemplateField[],
	companyLogoUrl: string | null,
	batchName: string
) {
	const { pdf } = await import('@react-pdf/renderer');

	// Generate QR codes for all stock units
	const unitsWithQR = await Promise.all(
		stockUnits.map(async (unit) => {
			const qrCodeDataUrl = await generateQRCodeDataUrl(unit.id);
			return { ...unit, qrCodeDataUrl };
		})
	);

	// Generate PDF
	const blob = await pdf(
		<QRLabelDocument
			stockUnits={unitsWithQR}
			selectedFields={selectedFields}
			companyLogoUrl={companyLogoUrl}
		/>
	).toBlob();

	// Trigger download
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `QR-Batch-${batchName}-${new Date().toISOString().split('T')[0]}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
