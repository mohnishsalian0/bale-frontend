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
import { useSession } from '@/contexts/session-context';
import { useAppChrome } from '@/contexts/app-chrome-context';
import { toast } from 'sonner';
import { generatePDFBlob, downloadPDF } from '@/lib/pdf/batch-pdf-generator';
import type { LabelData } from '@/lib/pdf/qr-label-generator';
import {
	getProductsWithAttributes,
	getProductAttributeLists,
	type ProductWithAttributes,
	type ProductMaterial,
	type ProductColor,
	type ProductTag
} from '@/lib/queries/products';

type FormStep = 'product' | 'stock-units' | 'template';

export default function CreateQRBatchPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const { hideChrome, showChromeUI } = useAppChrome();
	const [currentStep, setCurrentStep] = useState<FormStep>('product');
	const [products, setProducts] = useState<ProductWithAttributes[]>([]);
	const [materials, setMaterials] = useState<ProductMaterial[]>([]);
	const [colors, setColors] = useState<ProductColor[]>([]);
	const [tags, setTags] = useState<ProductTag[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<ProductWithAttributes | null>(null);
	const [selectedStockUnitIds, setSelectedStockUnitIds] = useState<string[]>([]);
	const [selectedFields, setSelectedFields] = useState<QRTemplateField[]>(getDefaultTemplateFields());
	const [saving, setSaving] = useState(false);

	const supabase = createClient();

	// Hide chrome for immersive flow experience
	useEffect(() => {
		hideChrome();
		return () => showChromeUI(); // Restore chrome on unmount
	}, [hideChrome, showChromeUI]);

	// Load products on mount
	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setProductsLoading(true);
		try {
			// Fetch products and attributes in parallel
			const [productsData, attributeLists] = await Promise.all([
				getProductsWithAttributes(),
				getProductAttributeLists(),
			]);

			setProducts(productsData);
			setMaterials(attributeLists.materials);
			setColors(attributeLists.colors);
			setTags(attributeLists.tags);
		} catch (error) {
			console.error('Error loading data:', error);
			toast.error('Failed to load products');
		} finally {
			setProductsLoading(false);
		}
	};

	const handleProductSelect = (product: ProductWithAttributes) => {
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
			const batchName = `${selectedProduct.name} QRs - ${new Date().toLocaleDateString()}`;

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
						name, sequence_number, hsn_code, gsm, selling_price_per_unit, stock_type,
						product_material_assignments(
							material:product_materials(*)
						),
						product_color_assignments(
							color:product_colors(*)
						),
						product_tag_assignments(
							tag:product_tags(*)
						)
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
					stock_type: unit.products?.stock_type,
					gsm: unit.products?.gsm,
					selling_price_per_unit: unit.products?.selling_price_per_unit,
					// Keep as arrays of objects - PDF generator will handle joining
					materials: unit.products?.product_material_assignments
						?.map((a: any) => a.material)
						.filter(Boolean) || [],
					colors: unit.products?.product_color_assignments
						?.map((a: any) => a.color)
						.filter(Boolean) || [],
				},
			}));

			// Generate and download PDF
			const blob = await generatePDFBlob(
				stockUnits,
				selectedFields,
				companyData?.logo_url || null
			);
			downloadPDF(blob, `${batchName}.pdf`);

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
		<div className="h-full flex flex-col items-center">
			<div className="flex-1 flex flex-col w-full overflow-y-hidden">
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
				<div className="flex-1 overflow-y-auto flex flex-col">
					{currentStep === 'product' && (
						<QRProductSelectionStep
							products={products}
							materials={materials}
							colors={colors}
							tags={tags}
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
