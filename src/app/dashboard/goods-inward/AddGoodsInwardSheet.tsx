'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductSelectionStep, ProductWithUnits, StockUnitSpec } from './ProductSelectionStep';
import { StockUnitEntrySheet } from './StockUnitEntrySheet';
import { AllSpecificationsSheet } from './AllSpecificationsSheet';
import { InwardDetailsStep } from './InwardDetailsStep';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

interface AddGoodsInwardSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInwardAdded?: () => void;
}

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

export function AddGoodsInwardSheet({
	open,
	onOpenChange,
	onInwardAdded,
}: AddGoodsInwardSheetProps) {
	const [currentStep, setCurrentStep] = useState<FormStep>('products');
	const [products, setProducts] = useState<ProductWithUnits[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Unit entry sheet state
	const [showUnitEntrySheet, setShowUnitEntrySheet] = useState(false);
	const [showAllSpecsSheet, setShowAllSpecsSheet] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);

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

	const supabase = createClient();

	// Load products on mount
	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

	const loadProducts = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('products')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;

			const productsWithUnits: ProductWithUnits[] = (data || []).map(product => ({
				...product,
				units: [],
			}));

			setProducts(productsWithUnits);
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			setLoading(false);
		}
	};

	// Handle opening unit sheet
	const handleOpenUnitSheet = (product: Tables<'products'>, hasExistingUnits: boolean) => {
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

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!canSubmit) return;
		setSaving(true);
		setSaveError(null);

		try {
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id) {
				throw new Error('User not found');
			}

			// Get the first warehouse for now (should be selected in details form later)
			const { data: warehouse } = await supabase
				.from('warehouses')
				.select('id')
				.eq('company_id', currentUser.company_id)
				.limit(1)
				.single();

			if (!warehouse) {
				throw new Error('No warehouse found');
			}

			// Map linkToType to inward_type
			const inwardTypeMap: Record<typeof detailsFormData.linkToType, string> = {
				'purchase_order': 'purchase',
				'job_work': 'job_work',
				'sales_return': 'sales_return',
				'other': 'other',
			};

			// Prepare inward data
			const inwardData = {
				company_id: currentUser.company_id,
				warehouse_id: warehouse.id,
				inward_number: `GI-${Date.now()}`, // TODO: Generate proper inward number
				inward_type: inwardTypeMap[detailsFormData.linkToType],
				inward_date: detailsFormData.inwardDate || null,
				invoice_number: detailsFormData.invoiceNumber || null,
				partner_id: detailsFormData.receivedFromType === 'partner' ? detailsFormData.receivedFromId : null,
				from_warehouse_id: detailsFormData.receivedFromType === 'warehouse' ? detailsFormData.receivedFromId : null,
				job_work_id: detailsFormData.linkToType === 'job_work' ? detailsFormData.linkToValue || null : null,
				sales_order_id: detailsFormData.linkToType === 'sales_return' ? detailsFormData.linkToValue || null : null,
				other_reason: detailsFormData.linkToType === 'other' ? detailsFormData.linkToValue || null : null,
				notes: detailsFormData.notes || null,
				created_by: currentUser.id,
			};

			// Prepare stock units
			const stockUnits = [];
			for (const product of products) {
				if (product.units.length === 0) continue;

				for (const unit of product.units) {
					// Create multiple stock units based on count
					for (let i = 0; i < unit.count; i++) {
						stockUnits.push({
							company_id: currentUser.company_id,
							warehouse_id: warehouse.id,
							product_id: product.id,
							size_quantity: unit.quantity,
							status: 'in_stock',
							quality_grade: unit.grade,
							supplier_number: unit.supplier_number || null,
							location_description: unit.location || null,
							notes: unit.notes || null,
							created_by: currentUser.id,
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

			// Success! Close sheet and notify parent
			handleCancel();
			if (onInwardAdded) {
				onInwardAdded();
			}
		} catch (error) {
			console.error('Error creating goods Inward:', error);
			setSaveError(error instanceof Error ? error.message : 'Failed to create goods inward');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setCurrentStep('products');
		setProducts([]);
		setDetailsFormData({
			receivedFromType: 'partner',
			receivedFromId: '',
			linkToType: 'purchase_order',
			linkToValue: '',
			invoiceNumber: '',
			inwardDate: '',
			notes: '',
			documentFile: null,
		});
		setSelectedProduct(null);
		setSaveError(null);
		onOpenChange(false);
	};

	// Get current product's units for AllSpecsSheet
	const currentProductUnits = useMemo(() => {
		if (!selectedProduct) return [];
		const product = products.find(p => p.id === selectedProduct.id);
		return product?.units || [];
	}, [selectedProduct, products]);

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent>
					{/* Header */}
					<SheetHeader>
						<SheetTitle>Create goods inward</SheetTitle>
						<SheetDescription>
							Step {currentStep === 'products' ? '1' : '2'} of 2
						</SheetDescription>
					</SheetHeader>

					{/* Progress bar */}
					<div className="h-1 bg-gray-200">
						<div
							className="h-full bg-primary-500 transition-all duration-300"
							style={{ width: currentStep === 'products' ? '50%' : '100%' }}
						/>
					</div>

					{/* Form Content - Scrollable */}
					<form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
						{currentStep === 'products' ? (
							<ProductSelectionStep
								products={products}
								loading={loading}
								onOpenUnitSheet={handleOpenUnitSheet}
							/>
						) : (
							<InwardDetailsStep
								formData={detailsFormData}
								onChange={(updates) => setDetailsFormData(prev => ({ ...prev, ...updates }))}
							/>
						)}

						{/* Footer */}
						<SheetFooter>
							{saveError && (
								<p className="text-sm text-red-600 text-center">{saveError}</p>
							)}
							<div className="flex gap-3">
								{currentStep === 'products' ? (
									<>
										<Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1" >
											Cancel
										</Button>
										<Button onClick={handleNext} disabled={!canProceed || saving} className="flex-1" >
											Next
										</Button>
									</>
								) : (
									<>
										<Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1" >
											Back
										</Button>
										<Button onClick={handleSubmit} disabled={!canSubmit || saving} className="flex-1" >
											{saving ? 'Saving...' : 'Submit'}
										</Button>
									</>
								)}
							</div>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>

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
		</>
	);
}
