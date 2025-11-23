'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { ProductSelectionStep, ProductWithUnits, StockUnitSpec } from '../ProductSelectionStep';
import { StockUnitEntrySheet } from '../StockUnitEntrySheet';
import { AllSpecificationsSheet } from '../AllSpecificationsSheet';
import { InwardDetailsStep } from '../InwardDetailsStep';
import { AddProductSheet } from '../../../(app)/inventory/AddProductSheet';
import { createClient } from '@/lib/supabase/client';
import {
	getProductsWithAttributes,
	getProductAttributeLists,
	type ProductWithAttributes,
	type ProductMaterial,
	type ProductColor,
	type ProductTag
} from '@/lib/queries/products';
import type { Tables, TablesInsert } from '@/types/database/supabase';
import { useSession } from '@/contexts/session-context';
import { toast } from 'sonner';

interface DetailsFormData {
	receivedFromType: 'partner' | 'warehouse';
	receivedFromId: string;
	linkToType: 'purchase_order' | 'job_work' | 'sales_return' | 'other';
	linkToValue: string;
	invoiceNumber: string;
	inwardDate: string;
	notes: string;
	documentFile: File | null;
}

type FormStep = 'products' | 'details';

const supabase = createClient();

export default function CreateGoodsInwardPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('products');
	const [products, setProducts] = useState<ProductWithUnits[]>([]);
	const [materials, setMaterials] = useState<ProductMaterial[]>([]);
	const [colors, setColors] = useState<ProductColor[]>([]);
	const [tags, setTags] = useState<ProductTag[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Unit entry sheet state
	const [showUnitEntrySheet, setShowUnitEntrySheet] = useState(false);
	const [showAllSpecsSheet, setShowAllSpecsSheet] = useState(false);
	const [showAddProductSheet, setShowAddProductSheet] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<ProductWithAttributes | null>(null);

	// Details form state
	const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
		receivedFromType: 'partner',
		receivedFromId: '',
		linkToType: 'purchase_order',
		linkToValue: '',
		invoiceNumber: '',
		inwardDate: '',
		notes: '',
		documentFile: null,
	});

	// Load products and attributes on mount
	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			// Fetch products and attributes in parallel
			const [productsData, attributeLists] = await Promise.all([
				getProductsWithAttributes(),
				getProductAttributeLists(),
			]);

			const productsWithUnits: ProductWithUnits[] = productsData.map(product => ({
				...product,
				units: [],
			}));

			setProducts(productsWithUnits);
			setMaterials(attributeLists.materials);
			setColors(attributeLists.colors);
			setTags(attributeLists.tags);
		} catch (error) {
			console.error('Error loading data:', error);
			toast.error('Failed to load products');
		} finally {
			setLoading(false);
		}
	};

	// Handle opening unit sheet
	const handleOpenUnitSheet = (product: ProductWithAttributes, hasExistingUnits: boolean) => {
		setSelectedProduct(product);
		if (hasExistingUnits) {
			setShowAllSpecsSheet(true);
		} else {
			setShowUnitEntrySheet(true);
		}
	};

	// Handle adding a new unit
	const handleAddUnit = (unit: Omit<StockUnitSpec, 'id'>) => {
		if (!selectedProduct) return;

		const newUnit: StockUnitSpec = {
			...unit,
			id: `temp-${Date.now()}-${Math.random()}`,
		};

		setProducts(prev => prev.map(p =>
			p.id === selectedProduct.id
				? { ...p, units: [...p.units, newUnit] }
				: p
		));
	};

	// Handle incrementing unit count
	const handleIncrementUnit = (unitId: string) => {
		if (!selectedProduct) return;

		setProducts(prev => prev.map(p =>
			p.id === selectedProduct.id
				? {
					...p,
					units: p.units.map(u =>
						u.id === unitId ? { ...u, count: u.count + 1 } : u
					)
				}
				: p
		));
	};

	// Handle decrementing unit count
	const handleDecrementUnit = (unitId: string) => {
		if (!selectedProduct) return;

		setProducts(prev => prev.map(p =>
			p.id === selectedProduct.id
				? {
					...p,
					units: p.units.map(u =>
						u.id === unitId && u.count > 1 ? { ...u, count: u.count - 1 } : u
					)
				}
				: p
		));
	};

	// Handle updating unit count
	const handleUpdateUnitCount = (unitId: string, count: number) => {
		if (!selectedProduct) return;

		setProducts(prev => prev.map(p =>
			p.id === selectedProduct.id
				? {
					...p,
					units: p.units.map(u =>
						u.id === unitId ? { ...u, count: Math.max(1, count) } : u
					)
				}
				: p
		));
	};

	// Handle deleting a unit
	const handleDeleteUnit = (unitId: string) => {
		if (!selectedProduct) return;

		setProducts(prev => prev.map(p =>
			p.id === selectedProduct.id
				? { ...p, units: p.units.filter(u => u.id !== unitId) }
				: p
		));
	};

	// Handle adding new unit from AllSpecsSheet
	const handleAddNewUnitFromAllSpecs = () => {
		setShowAllSpecsSheet(false);
		setShowUnitEntrySheet(true);
	};

	// Check if user can proceed to step 2
	const canProceed = useMemo(() =>
		products.some(p => p.units.length > 0),
		[products]
	);

	// Check if form is valid for submission
	const canSubmit = useMemo(() =>
		detailsFormData.receivedFromId !== '' &&
		products.some(p => p.units.length > 0),
		[detailsFormData.receivedFromId, products]
	);

	const handleNext = () => {
		if (canProceed) {
			setCurrentStep('details');
		}
	};

	const handleBack = () => {
		setCurrentStep('products');
	};

	const handleCancel = () => {
		router.push(`/warehouse/${warehouse.slug}/stock-flow`);
	};

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSaving(true);

		try {
			// Map linkToType to inward_type
			const inwardTypeMap: Record<typeof detailsFormData.linkToType, string> = {
				'purchase_order': 'other',
				'job_work': 'job_work',
				'sales_return': 'sales_return',
				'other': 'other',
			};

			// Prepare inward data
			const inwardData: Omit<TablesInsert<'goods_inwards'>, 'created_by' | 'sequence_number'> = {
				warehouse_id: warehouse.id,
				inward_type: inwardTypeMap[detailsFormData.linkToType] as 'job_work' | 'sales_return' | 'other',
				inward_date: detailsFormData.inwardDate || undefined,
				transport_reference_number: detailsFormData.invoiceNumber || undefined,
				partner_id: detailsFormData.receivedFromType === 'partner' ? detailsFormData.receivedFromId : undefined,
				from_warehouse_id: detailsFormData.receivedFromType === 'warehouse' ? detailsFormData.receivedFromId : undefined,
				job_work_id: detailsFormData.linkToType === 'job_work' && detailsFormData.linkToValue ? detailsFormData.linkToValue : undefined,
				sales_order_id: detailsFormData.linkToType === 'sales_return' && detailsFormData.linkToValue ? detailsFormData.linkToValue : undefined,
				other_reason: detailsFormData.linkToType === 'other' && detailsFormData.linkToValue ? detailsFormData.linkToValue : undefined,
				notes: detailsFormData.notes || undefined,
			};

			// Prepare stock units
			const stockUnits: Omit<TablesInsert<'stock_units'>, 'created_by' | 'modified_by' | 'sequence_number'>[] = [];
			for (const product of products) {
				if (product.units.length === 0) continue;

				for (const unit of product.units) {
					// Create multiple stock units based on count
					for (let i = 0; i < unit.count; i++) {
						stockUnits.push({
							warehouse_id: warehouse.id,
							product_id: product.id,
							initial_quantity: unit.quantity,
							remaining_quantity: unit.quantity,
							status: 'in_stock',
							quality_grade: unit.grade || null,
							supplier_number: unit.supplier_number || null,
							warehouse_location: unit.location || null,
							notes: unit.notes || null,
						});
					}
				}
			}

			// Call RPC function to create inward with stock units atomically
			const { data: _result, error: rpcError } = await supabase.rpc('create_goods_inward_with_units', {
				p_inward_data: inwardData,
				p_stock_units: stockUnits,
			});

			if (rpcError) throw rpcError;

			// Success! Show toast and redirect to stock flow
			toast.success('Goods inward created successfully');
			router.push(`/warehouse/${warehouse.slug}/stock-flow`);
		} catch (error) {
			console.error('Error creating goods inward:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create goods inward');
		} finally {
			setSaving(false);
		}
	};

	// Get current product's units for AllSpecsSheet
	const currentProductUnits = useMemo(() => {
		if (!selectedProduct) return [];
		const product = products.find(p => p.id === selectedProduct.id);
		return product?.units || [];
	}, [selectedProduct, products]);

	return (
		<div className="h-full flex flex-col items-center">
			<div className="flex-1 flex flex-col w-full overflow-y-hidden">
				{/* Header - Fixed at top */}
				<div className="border-b border-gray-200 bg-background">
					<div className="flex items-center gap-3 px-4 py-3">
						<Button variant="ghost" size="icon" onClick={handleCancel} disabled={saving}>
							<IconArrowLeft className="size-5" />
						</Button>
						<div className="flex-1">
							<h1 className="text-xl font-semibold text-gray-900">Create goods inward</h1>
							<p className="text-sm text-gray-500">Step {currentStep === 'products' ? '1' : '2'} of 2</p>
						</div>
					</div>

					{/* Progress bar */}
					<div className="h-1 bg-gray-200">
						<div
							className="h-full bg-primary-500 transition-all duration-300"
							style={{ width: currentStep === 'products' ? '50%' : '100%' }}
						/>
					</div>
				</div>

				{/* Main Content - Scrollable */}
				<div className="flex-1 overflow-y-auto flex flex-col">
					{currentStep === 'products' ? (
						<ProductSelectionStep
							products={products}
							materials={materials}
							colors={colors}
							tags={tags}
							loading={loading}
							onOpenUnitSheet={handleOpenUnitSheet}
							onAddNewProduct={() => setShowAddProductSheet(true)}
						/>
					) : (
						<InwardDetailsStep
							formData={detailsFormData}
							onChange={(updates) => setDetailsFormData(prev => ({ ...prev, ...updates }))}
						/>
					)}
				</div>

				{/* Footer - Fixed at bottom */}
				<div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
					<div className="w-full flex gap-3">
						{currentStep === 'products' ? (
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

				{/* Stock Unit Entry Sheet */}
				{showUnitEntrySheet && (
					<StockUnitEntrySheet
						open={showUnitEntrySheet}
						onOpenChange={setShowUnitEntrySheet}
						product={selectedProduct}
						onConfirm={handleAddUnit}
					/>
				)}

				{/* All Specifications Sheet */}
				{showAllSpecsSheet && (
					<AllSpecificationsSheet
						open={showAllSpecsSheet}
						onOpenChange={setShowAllSpecsSheet}
						product={selectedProduct}
						units={currentProductUnits}
						onIncrementUnit={handleIncrementUnit}
						onDecrementUnit={handleDecrementUnit}
						onUpdateUnitCount={handleUpdateUnitCount}
						onDeleteUnit={handleDeleteUnit}
						onAddNewUnit={handleAddNewUnitFromAllSpecs}
					/>
				)}

				{/* Add Product Sheet */}
				<AddProductSheet
					open={showAddProductSheet}
					onOpenChange={setShowAddProductSheet}
					onProductAdded={loadData}
				/>
			</div>
		</div>
	);
}
