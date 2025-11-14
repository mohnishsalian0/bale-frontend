'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { QRScannerStep, ScannedStockUnit } from '../QRScannerStep';
import { OutwardDetailsStep } from '../OutwardDetailsStep';
import { createClient } from '@/lib/supabase/client';
import type { TablesInsert } from '@/types/database/supabase';
import { useSession } from '@/contexts/warehouse-context';
import { toast } from 'sonner';

interface DetailsFormData {
	dispatchToType: 'partner' | 'warehouse';
	dispatchToId: string;
	linkToType: 'sales_order' | 'job_work' | 'purchase_return' | 'other';
	linkToValue: string;
	outwardDate: string;
	dueDate: string;
	invoiceNumber: string;
	invoiceAmount: string;
	transportDetails: string;
	notes: string;
	documentFile: File | null;
}

type FormStep = 'scanner' | 'details';

export default function CreateGoodsOutwardPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('scanner');
	const [scannedUnits, setScannedUnits] = useState<ScannedStockUnit[]>([]);
	const [saving, setSaving] = useState(false);

	const supabase = createClient();

	// Details form state
	const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
		dispatchToType: 'partner',
		dispatchToId: '',
		linkToType: 'sales_order',
		linkToValue: '',
		outwardDate: '',
		dueDate: '',
		invoiceNumber: '',
		invoiceAmount: '',
		transportDetails: '',
		notes: '',
		documentFile: null,
	});

	// Check if user can proceed to step 2
	const canProceed = useMemo(() =>
		scannedUnits.length > 0,
		[scannedUnits]
	);

	// Check if form is valid for submission
	const canSubmit = useMemo(() =>
		detailsFormData.dispatchToId !== '' &&
		scannedUnits.length > 0,
		[detailsFormData.dispatchToId, scannedUnits]
	);

	const handleNext = () => {
		if (canProceed) {
			setCurrentStep('details');
		}
	};

	const handleBack = () => {
		setCurrentStep('scanner');
	};

	const handleCancel = () => {
		router.push(`/warehouse/${warehouse.slug}/stock-flow`);
	};

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSaving(true);

		try {
			// Map linkToType to outward_type
			const outwardTypeMap: Record<typeof detailsFormData.linkToType, string> = {
				'sales_order': 'sales',
				'job_work': 'job_work',
				'purchase_return': 'purchase_return',
				'other': 'other',
			};

			// Prepare outward data
			const outwardData: Omit<TablesInsert<'goods_outwards'>, 'created_by' | 'sequence_number'> = {
				warehouse_id: warehouse.id,
				outward_type: outwardTypeMap[detailsFormData.linkToType],

				// Conditional partner/warehouse
				partner_id: detailsFormData.dispatchToType === 'partner' ? detailsFormData.dispatchToId : null,
				to_warehouse_id: detailsFormData.dispatchToType === 'warehouse' ? detailsFormData.dispatchToId : null,

				// Conditional linking
				sales_order_id: detailsFormData.linkToType === 'sales_order' ? detailsFormData.linkToValue || null : null,
				job_work_id: detailsFormData.linkToType === 'job_work' ? detailsFormData.linkToValue || null : null,
				other_reason: detailsFormData.linkToType === 'other' ? detailsFormData.linkToValue || null : null,

				// Dates and details
				outward_date: detailsFormData.outwardDate,
				due_date: detailsFormData.dueDate || null,
				invoice_number: detailsFormData.invoiceNumber || null,
				invoice_amount: detailsFormData.invoiceAmount ? parseFloat(detailsFormData.invoiceAmount) : null,
				transport_details: detailsFormData.transportDetails || null,
				notes: detailsFormData.notes || null,
			};

			// Prepare stock unit items from scannedUnits
			const stockUnitItems = scannedUnits.map(item => ({
				stock_unit_id: item.stockUnit.id,
				quantity: item.quantity,
			}));

			// Call RPC function to create outward with items atomically
			const { data: _result, error: rpcError } = await supabase.rpc('create_goods_outward_with_items', {
				p_outward_data: outwardData,
				p_stock_unit_items: stockUnitItems,
			});

			if (rpcError) throw rpcError;

			// Success! Show toast and redirect to stock flow
			toast.success('Goods outward created successfully');
			router.push(`/warehouse/${warehouse.slug}/stock-flow`);
		} catch (error) {
			console.error('Error creating goods outward:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create goods outward');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="h-dvh flex flex-col items-center">
			<div className="flex-1 flex flex-col w-full max-w-2xl border-x-1 border-border overflow-y-hidden">
				{/* Header - Fixed at top */}
				<div className="shrink-0 border-b border-gray-200 bg-background">
					<div className="flex items-center gap-3 px-4 py-3">
						<Button variant="ghost" size="icon" onClick={handleCancel} disabled={saving}>
							<IconArrowLeft className="size-5" />
						</Button>
						<div className="flex-1">
							<h1 className="text-xl font-semibold text-gray-900">Create goods outward</h1>
							<p className="text-sm text-gray-500">Step {currentStep === 'scanner' ? '1' : '2'} of 2</p>
						</div>
					</div>

					{/* Progress bar */}
					<div className="h-1 bg-gray-200">
						<div
							className="h-full bg-primary-500 transition-all duration-300"
							style={{ width: currentStep === 'scanner' ? '50%' : '100%' }}
						/>
					</div>
				</div>

				{/* Main Content - Scrollable */}
				<div className="flex-1 overflow-y-auto flex">
					{currentStep === 'scanner' ? (
						<QRScannerStep
							scannedUnits={scannedUnits}
							onScannedUnitsChange={setScannedUnits}
						/>
					) : (
						<OutwardDetailsStep
							formData={detailsFormData}
							onChange={(updates) => setDetailsFormData(prev => ({ ...prev, ...updates }))}
						/>
					)}
				</div>

				{/* Footer - Fixed at bottom */}
				<div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
					<div className="w-full flex gap-3">
						{currentStep === 'scanner' ? (
							<>
								<Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
									Cancel
								</Button>
								<Button onClick={handleNext} disabled={!canProceed || saving} className="flex-1">
									Next
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1">
									Back
								</Button>
								<Button onClick={handleSubmit} disabled={!canSubmit || saving} className="flex-1">
									{saving ? 'Saving...' : 'Submit'}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
