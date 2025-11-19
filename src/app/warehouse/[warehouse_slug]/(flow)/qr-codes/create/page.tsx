'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { QRProductSelectionStep } from '../QRProductSelectionStep';
import { QRStockUnitSelectionStep } from '../QRStockUnitSelectionStep';
import { QRTemplateSelectionStep, getDefaultTemplateFields } from '../QRTemplateCustomisationStep';
import type { QRTemplateField } from '../QRTemplateCustomisationStep';
import type { Tables } from '@/types/database/supabase';
import { useSession } from '@/contexts/session-context';
import { toast } from 'sonner';
import { generateAndDownloadPDF, type LabelData } from '@/lib/pdf/qr-label-generator';

type FormStep = 'product' | 'stock-units' | 'template';

export default function CreateQRBatchPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('product');
	const [products, setProducts] = useState<Tables<'products'>[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [selectedStockUnitIds, setSelectedStockUnitIds] = useState<string[]>([]);
	const [selectedFields, setSelectedFields] = useState<QRTemplateField[]>(getDefaultTemplateFields());
	const [saving, setSaving] = useState(false);

	const supabase = createClient();

	// Load products on mount
	useEffect(() => {
		loadProducts();
	}, []);

	const loadProducts = async () => {
		setProductsLoading(true);
		try {
			const { data, error } = await supabase
				.from('products')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;

			setProducts(data || []);
		} catch (error) {
			console.error('Error loading products:', error);
			toast.error('Failed to load products');
		} finally {
			setProductsLoading(false);
		}
	};

	const handleProductSelect = (product: Tables<'products'>) => {
		setSelectedProduct(product);
		setCurrentStep('stock-units');
	};

	const handleNext = () => {
		if (currentStep === 'stock-units' && selectedStockUnitIds.length > 0) {
			setCurrentStep('template');
		}
	};

	const handleBack = () => {
		if (currentStep === 'template') {
			setCurrentStep('stock-units');
		} else if (currentStep === 'stock-units') {
			setCurrentStep('product');
			setSelectedProduct(null);
			setSelectedStockUnitIds([]);
		} else {
			router.push(`/warehouse/${warehouse.slug}/qr-codes`);
		}
	};

	const handleCancel = () => {
		router.push(`/warehouse/${warehouse.slug}/qr-codes`);
	};

	const handleSubmit = async () => {
		if (!selectedProduct || selectedStockUnitIds.length === 0) {
			toast.error('Please select at least one stock unit');
			return;
		}

		setSaving(true);
		try {

			// Generate batch name
			const batchName = `${selectedProduct.name} - ${new Date().toLocaleDateString()}`;

			// Prepare batch data
			const batchData = {
				warehouse_id: warehouse.id,
				batch_name: batchName,
				image_url: null,
				fields_selected: selectedFields,
				pdf_url: null,
			};

			// Call RPC function to create batch atomically
			const { data: _data, error } = await supabase.rpc('create_qr_batch_with_items', {
				p_batch_data: batchData,
				p_stock_unit_ids: selectedStockUnitIds,
			});

			if (error) throw error;

			// Fetch stock unit data for PDF generation
			const { data: stockUnitsData, error: stockUnitsError } = await supabase
				.from('stock_units')
				.select(`
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
						material,
						color_name,
						gsm,
						selling_price_per_unit
					)
				`)
				.in('id', selectedStockUnitIds);

			if (stockUnitsError) throw stockUnitsError;

			// Fetch company logo
			const { data: companyData, error: companyError } = await supabase
				.from('companies')
				.select('logo_url')
				.single();

			if (companyError) throw companyError;

			// Map data to LabelData format
			const stockUnits: LabelData[] = stockUnitsData.map((unit: any) => ({
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
					material: unit.products?.material,
					color_name: unit.products?.color_name,
					gsm: unit.products?.gsm,
					selling_price_per_unit: unit.products?.selling_price_per_unit,
				},
			}));

			// Generate and download PDF
			await generateAndDownloadPDF(
				stockUnits,
				selectedFields,
				companyData?.logo_url || null,
				batchName
			);

			toast.success(`QR batch created with ${selectedStockUnitIds.length} units`);
			router.push(`/warehouse/${warehouse.slug}/qr-codes`);
		} catch (error) {
			console.error('Error creating QR batch:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create QR batch');
		} finally {
			setSaving(false);
		}
	};

	const canProceedToTemplate = selectedStockUnitIds.length > 0;

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
							<h1 className="text-xl font-semibold text-gray-900">Create QR codes</h1>
							<p className="text-sm text-gray-500">
								Step {currentStep === 'product' ? '1' : currentStep === 'stock-units' ? '2' : '3'} of 3
							</p>
						</div>
					</div>

					{/* Progress bar */}
					<div className="h-1 bg-gray-200">
						<div
							className="h-full bg-primary-500 transition-all duration-300"
							style={{
								width:
									currentStep === 'product' ? '33%' :
										currentStep === 'stock-units' ? '66%' :
											'100%'
							}}
						/>
					</div>
				</div>

				{/* Main Content - Scrollable */}
				<div className="flex-1 overflow-y-auto flex">
					{currentStep === 'product' && (
						<QRProductSelectionStep
							products={products}
							loading={productsLoading}
							onProductSelect={handleProductSelect}
						/>
					)}

					{currentStep === 'stock-units' && selectedProduct && (
						<QRStockUnitSelectionStep
							productId={selectedProduct.id}
							selectedStockUnitIds={selectedStockUnitIds}
							onSelectionChange={setSelectedStockUnitIds}
						/>
					)}

					{currentStep === 'template' && (
						<QRTemplateSelectionStep
							selectedFields={selectedFields}
							onSelectionChange={setSelectedFields}
						/>
					)}
				</div>

				{/* Footer - Fixed at bottom */}
				<div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
					<div className="w-full flex gap-3">
						{currentStep === 'product' ? (
							<>
								<Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
									Cancel
								</Button>
							</>
						) : currentStep === 'stock-units' ? (
							<>
								<Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1">
									Back
								</Button>
								<Button onClick={handleNext} disabled={!canProceedToTemplate || saving} className="flex-1">
									Next
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1">
									Back
								</Button>
								<Button onClick={handleSubmit} disabled={saving} className="flex-1">
									{saving ? 'Creating...' : 'Confirm'}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
