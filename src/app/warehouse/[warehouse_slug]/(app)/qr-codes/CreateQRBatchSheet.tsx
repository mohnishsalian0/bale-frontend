'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { QRProductSelectionStep } from './QRProductSelectionStep';
import { QRStockUnitSelectionStep } from './QRStockUnitSelectionStep';
import { QRTemplateSelectionStep, getDefaultTemplateFields } from './QRTemplateCustomisationStep';
import type { QRTemplateField } from './QRTemplateCustomisationStep';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database/supabase';
import { generateAndDownloadPDF, type LabelData } from '@/lib/pdf/qr-label-generator';
import { useSession } from '@/contexts/session-context';

interface CreateQRBatchSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onBatchCreated?: () => void;
}

type FormStep = 'product' | 'stock-units' | 'template';

export function CreateQRBatchSheet({
	open,
	onOpenChange,
	onBatchCreated,
}: CreateQRBatchSheetProps) {
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('product');
	const [products, setProducts] = useState<Tables<'products'>[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [selectedStockUnitIds, setSelectedStockUnitIds] = useState<string[]>([]);
	const [selectedFields, setSelectedFields] = useState<QRTemplateField[]>(getDefaultTemplateFields());
	const [saving, setSaving] = useState(false);

	const supabase = createClient();

	// Load products when sheet opens
	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

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
		}
	};

	const handleConfirm = async () => {
		if (!selectedProduct || selectedStockUnitIds.length === 0) {
			toast.error('Please select at least one stock unit');
			return;
		}

		setSaving(true);
		try {
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id || !currentUser.warehouse_id) {
				throw new Error('User information not found');
			}

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
			handleClose();

			if (onBatchCreated) {
				onBatchCreated();
			}
		} catch (error) {
			console.error('Error creating QR batch:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create QR batch');
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		// Reset all state
		setCurrentStep('product');
		setSelectedProduct(null);
		setSelectedStockUnitIds([]);
		setSelectedFields(getDefaultTemplateFields());
		onOpenChange(false);
	};

	const canProceedToTemplate = selectedStockUnitIds.length > 0;

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent>
				{/* Header */}
				<SheetHeader>
					<SheetTitle>Create QR codes</SheetTitle>
					<SheetDescription>
						Step {currentStep === 'product' ? '1' : currentStep === 'stock-units' ? '2' : '3'} of 3
					</SheetDescription>
				</SheetHeader>

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

				{/* Step Content - Scrollable */}
				<div className="flex flex-col h-full overflow-hidden">
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

					{/* Footer */}
					<SheetFooter>
						<div className="flex gap-3">
							{currentStep === 'product' ? (
								<>
									<Button
										variant="outline"
										onClick={handleClose}
										disabled={saving}
										className="flex-1"
									>
										Cancel
									</Button>
								</>
							) : currentStep === 'stock-units' ? (
								<>
									<Button
										variant="outline"
										onClick={handleBack}
										disabled={saving}
										className="flex-1"
									>
										Back
									</Button>
									<Button
										onClick={handleNext}
										disabled={!canProceedToTemplate || saving}
										className="flex-1"
									>
										Next
									</Button>
								</>
							) : (
								<>
									<Button
										variant="outline"
										onClick={handleBack}
										disabled={saving}
										className="flex-1"
									>
										Back
									</Button>
									<Button
										onClick={handleConfirm}
										disabled={saving}
										className="flex-1"
									>
										{saving ? 'Creating...' : 'Confirm'}
									</Button>
								</>
							)}
						</div>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
}
