'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { IconQrcode } from '@tabler/icons-react';
import { createClient, getCurrentUser } from '@/lib/supabase/client';

export type QRTemplateField =
	| 'product_name'
	| 'product_number'
	| 'hsn_code'
	| 'material'
	| 'color'
	| 'gsm'
	| 'selling_price_per_unit'
	| 'unit_number'
	| 'manufacturing_date'
	| 'initial_quantity'
	| 'quality_grade'
	| 'warehouse_location';

interface FieldOption {
	id: QRTemplateField;
	label: string;
	disabled: boolean;
	defaultSelected: boolean;
}

interface QRTemplateSelectionStepProps {
	selectedFields: QRTemplateField[];
	onSelectionChange: (fields: QRTemplateField[]) => void;
}

const PRODUCT_INFO_FIELDS: FieldOption[] = [
	{ id: 'product_name', label: 'Product name', disabled: true, defaultSelected: true },
	{ id: 'product_number', label: 'Product number', disabled: true, defaultSelected: true },
	{ id: 'hsn_code', label: 'HSN code', disabled: false, defaultSelected: false },
	{ id: 'material', label: 'Material', disabled: false, defaultSelected: true },
	{ id: 'color', label: 'Color', disabled: false, defaultSelected: true },
	{ id: 'gsm', label: 'GSM', disabled: false, defaultSelected: true },
	{ id: 'selling_price_per_unit', label: 'Sale price', disabled: false, defaultSelected: false },
];

const STOCK_UNIT_INFO_FIELDS: FieldOption[] = [
	{ id: 'unit_number', label: 'Unit number', disabled: true, defaultSelected: true },
	{ id: 'manufacturing_date', label: 'Made on', disabled: false, defaultSelected: true },
	{ id: 'initial_quantity', label: 'Size', disabled: false, defaultSelected: false },
	{ id: 'quality_grade', label: 'Quality', disabled: false, defaultSelected: true },
	{ id: 'warehouse_location', label: 'Location', disabled: false, defaultSelected: true },
];

// Map field IDs to their display labels in the preview
const FIELD_PREVIEW_LABELS: Record<QRTemplateField, string> = {
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

export function QRTemplateSelectionStep({
	selectedFields,
	onSelectionChange,
}: QRTemplateSelectionStepProps) {
	const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
	const supabase = createClient();

	useEffect(() => {
		loadCompanyLogo();
	}, []);

	const loadCompanyLogo = async () => {
		try {
			const currentUser = await getCurrentUser();
			if (!currentUser?.company_id) return;

			const { data, error } = await supabase
				.from('companies')
				.select('logo_url')
				.eq('id', currentUser.company_id)
				.single();

			if (error) throw error;
			setCompanyLogoUrl(data?.logo_url || null);
		} catch (error) {
			console.error('Error loading company logo:', error);
		}
	};

	const handleFieldToggle = (fieldId: QRTemplateField, checked: boolean) => {
		if (checked) {
			onSelectionChange([...selectedFields, fieldId]);
		} else {
			onSelectionChange(selectedFields.filter(f => f !== fieldId));
		}
	};

	// Get all available fields in order
	const allFieldsInOrder = [...PRODUCT_INFO_FIELDS, ...STOCK_UNIT_INFO_FIELDS];

	// Filter to show only selected fields in preview
	const previewFields = allFieldsInOrder
		.filter(field => selectedFields.includes(field.id))
		.map(field => FIELD_PREVIEW_LABELS[field.id]);

	return (
		<div className="flex flex-col h-full overflow-y-auto">
			{/* Header */}
			<div className="px-4 pt-6 shrink-0">
				<h3 className="text-lg font-semibold text-gray-900">Customise label</h3>
			</div>

			{/* Fields List - Scrollable */}
			<div className="flex-1 p-4">
				<div className="flex flex-col gap-6">
					{/* Preview Card */}
					<div className="bg-white border border-gray-200 rounded-lg p-4 relative">
						<div className="flex gap-4 mb-10">
							<div className="flex-1 flex flex-col gap-2 text-sm text-gray-700">
								{previewFields.length > 0 ? (
									previewFields.map((label, index) => (
										<div key={index}>{label}</div>
									))
								) : (
									<div className="text-gray-400 italic">No fields selected</div>
								)}
							</div>
							<div className="flex-shrink-0">
								<IconQrcode className="size-24 text-gray-900" />
							</div>
						</div>
						{/* Company Logo - Bottom Right */}
						{companyLogoUrl && (
							<div className="absolute bottom-4 right-4">
								<Image
									src={companyLogoUrl}
									alt="Company Logo"
									width={40}
									height={40}
									className="object-contain"
								/>
							</div>
						)}
					</div>

					{/* Product Information */}
					<div className="flex flex-col gap-3">
						<h4 className="text-sm font-normal text-gray-500">Product information</h4>
						<div className="grid grid-cols-2 gap-2">
							{PRODUCT_INFO_FIELDS.map(field => (
								<div
									key={field.id}
									className="flex items-center gap-2"
								>
									<Checkbox
										checked={selectedFields.includes(field.id)}
										disabled={field.disabled}
										onCheckedChange={(checked) => handleFieldToggle(field.id, checked === true)}
									/>
									<span className="text-sm text-gray-700">
										{field.label}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Stock Unit Information */}
					<div className="flex flex-col gap-3">
						<h4 className="text-sm font-normal text-gray-500">Stock unit information</h4>
						<div className="grid grid-cols-2 gap-2">
							{STOCK_UNIT_INFO_FIELDS.map(field => (
								<div
									key={field.id}
									className="flex items-center gap-2"
								>
									<Checkbox
										checked={selectedFields.includes(field.id)}
										disabled={field.disabled}
										onCheckedChange={(checked) => handleFieldToggle(field.id, checked === true)}
									/>
									<span className="text-sm text-gray-700">
										{field.label}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Helper to get default selected fields
export function getDefaultTemplateFields(): QRTemplateField[] {
	return [
		...PRODUCT_INFO_FIELDS.filter(f => f.defaultSelected).map(f => f.id),
		...STOCK_UNIT_INFO_FIELDS.filter(f => f.defaultSelected).map(f => f.id),
	];
}
