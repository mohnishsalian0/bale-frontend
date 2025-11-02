'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { IconQrcode } from '@tabler/icons-react';

export type QRTemplateField =
	| 'product_name'
	| 'product_number'
	| 'material'
	| 'color'
	| 'gsm'
	| 'selling_price'
	| 'unit_number'
	| 'manufacturing_date'
	| 'initial_quantity'
	| 'wastage'
	| 'quality_grade'
	| 'location_description';

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
	{ id: 'material', label: 'Material', disabled: false, defaultSelected: true },
	{ id: 'color', label: 'Color', disabled: false, defaultSelected: true },
	{ id: 'gsm', label: 'GSM', disabled: false, defaultSelected: false },
	{ id: 'selling_price', label: 'Sale price', disabled: false, defaultSelected: false },
];

const STOCK_UNIT_INFO_FIELDS: FieldOption[] = [
	{ id: 'unit_number', label: 'Unit no', disabled: true, defaultSelected: true },
	{ id: 'manufacturing_date', label: 'Made on', disabled: false, defaultSelected: true },
	{ id: 'initial_quantity', label: 'Size (initial quantity)', disabled: false, defaultSelected: true },
	{ id: 'wastage', label: 'Wastage', disabled: false, defaultSelected: false },
	{ id: 'quality_grade', label: 'Quality', disabled: false, defaultSelected: true },
	{ id: 'location_description', label: 'Location', disabled: false, defaultSelected: true },
];

export function QRTemplateSelectionStep({
	selectedFields,
	onSelectionChange,
}: QRTemplateSelectionStepProps) {
	const handleFieldToggle = (fieldId: QRTemplateField, checked: boolean) => {
		if (checked) {
			onSelectionChange([...selectedFields, fieldId]);
		} else {
			onSelectionChange(selectedFields.filter(f => f !== fieldId));
		}
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="px-4 py-4 shrink-0 border-b border-gray-200">
				<h3 className="text-lg font-semibold text-gray-900">Template fields</h3>
				<p className="text-sm text-gray-500">Select fields to include on QR code labels</p>
			</div>

			{/* Fields List - Scrollable */}
			<div className="flex-1 overflow-y-auto p-4">
				<div className="flex flex-col gap-6">
					{/* QR Code - Always included */}
					<div className="flex flex-col gap-3">
						<h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">QR Code</h4>
						<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
							<Checkbox checked={true} disabled={true} />
							<div className="flex items-center gap-2 flex-1">
								<IconQrcode className="size-5 text-gray-600" />
								<span className="text-sm font-medium text-gray-900">QR Code</span>
							</div>
							<span className="text-xs text-gray-500 italic">Always included</span>
						</div>
					</div>

					{/* Product Info */}
					<div className="flex flex-col gap-3">
						<h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Product Info</h4>
						<div className="flex flex-col gap-2">
							{PRODUCT_INFO_FIELDS.map(field => (
								<div
									key={field.id}
									className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
										field.disabled ? 'bg-gray-50' : 'hover:bg-gray-50'
									}`}
								>
									<Checkbox
										checked={selectedFields.includes(field.id)}
										disabled={field.disabled}
										onCheckedChange={(checked) => handleFieldToggle(field.id, checked === true)}
									/>
									<span className={`text-sm flex-1 ${
										field.disabled ? 'font-medium text-gray-900' : 'text-gray-700'
									}`}>
										{field.label}
									</span>
									{field.disabled && (
										<span className="text-xs text-gray-500 italic">Required</span>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Stock Unit Info */}
					<div className="flex flex-col gap-3">
						<h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stock Unit Info</h4>
						<div className="flex flex-col gap-2">
							{STOCK_UNIT_INFO_FIELDS.map(field => (
								<div
									key={field.id}
									className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
										field.disabled ? 'bg-gray-50' : 'hover:bg-gray-50'
									}`}
								>
									<Checkbox
										checked={selectedFields.includes(field.id)}
										disabled={field.disabled}
										onCheckedChange={(checked) => handleFieldToggle(field.id, checked === true)}
									/>
									<span className={`text-sm flex-1 ${
										field.disabled ? 'font-medium text-gray-900' : 'text-gray-700'
									}`}>
										{field.label}
									</span>
									{field.disabled && (
										<span className="text-xs text-gray-500 italic">Required</span>
									)}
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
