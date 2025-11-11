'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import { ProductQuantitySheet } from './ProductQuantitySheet';
import { ProductSelectionStep } from './ProductSelectionStep';
import { OrderDetailsStep } from './OrderDetailsStep';
import type { Tables, TablesInsert } from '@/types/database/supabase';
import { useSession } from '@/contexts/warehouse-context';

interface AddSalesOrderSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOrderAdded?: () => void;
}

interface ProductWithSelection extends Tables<'products'> {
	selected: boolean;
	quantity: number;
}

interface OrderFormData {
	warehouseId: string;
	customerId: string;
	agentId: string;
	orderDate: string;
	expectedDate: string;
	advanceAmount: string;
	discount: string;
	notes: string;
	files: File[];
}

type FormStep = 'products' | 'details';

export function AddSalesOrderSheet({ open, onOpenChange, onOrderAdded }: AddSalesOrderSheetProps) {
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('products');
	const [products, setProducts] = useState<ProductWithSelection[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [formData, setFormData] = useState<OrderFormData>({
		warehouseId: warehouse.id,
		customerId: '',
		agentId: '',
		orderDate: '',
		expectedDate: '',
		advanceAmount: '',
		discount: '',
		notes: '',
		files: [],
	});

	// Load products on mount
	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

	const loadProducts = async () => {
		setLoading(true);
		try {
			const supabase = createClient();

			const { data, error } = await supabase
				.from('products')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;

			// Add selection state to products
			const productsWithSelection: ProductWithSelection[] = (data || []).map(product => ({
				...product,
				selected: false,
				quantity: 0,
			}));

			setProducts(productsWithSelection);
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenQuantitySheet = (product: Tables<'products'>) => {
		setSelectedProduct(product);
		setShowQuantitySheet(true);
	};

	const handleQuantityConfirm = (quantity: number) => {
		if (selectedProduct) {
			setProducts(prevProducts =>
				prevProducts.map(product =>
					product.id === selectedProduct.id
						? {
							...product,
							selected: true,
							quantity: quantity,
						}
						: product
				)
			);
		}
	};

	const handleCancel = () => {
		// Reset state
		setCurrentStep('products');
		setProducts([]);
		setFormData({
			warehouseId: warehouse.id,
			customerId: '',
			agentId: '',
			orderDate: '',
			expectedDate: '',
			advanceAmount: '',
			discount: '',
			notes: '',
			files: [],
		});
		setSaveError(null);
		onOpenChange(false);
	};

	const handleNext = () => {
		setCurrentStep('details');
	};

	const handleBack = () => {
		setCurrentStep('products');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setSaveError(null);

		try {
			const supabase = createClient();

			const selectedProducts = products.filter(p => p.selected && p.quantity > 0);

			// Prepare sales order insert data
			const salesOrderInsert: Omit<TablesInsert<'sales_orders'>, 'created_by' | 'modified_by'> = {
				fulfillment_warehouse_id: formData.warehouseId,
				order_number: '',
				customer_id: formData.customerId,
				agent_id: formData.agentId || null,
				order_date: formData.orderDate,
				expected_delivery_date: formData.expectedDate || null,
				advance_amount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : 0,
				discount_percentage: formData.discount ? parseFloat(formData.discount) : 0,
				notes: formData.notes || null,
				attachments: [], // TODO: Implement file upload
				status: 'approval_pending',
			};

			// Insert sales order
			const { data: salesOrder, error: orderError } = await supabase
				.from('sales_orders')
				.insert(salesOrderInsert)
				.select()
				.single();

			if (orderError) throw orderError;

			// Insert sales order line items
			const lineItems: TablesInsert<'sales_order_items'>[] = selectedProducts.map(
				(product) => ({
					sales_order_id: salesOrder.id,
					product_id: product.id,
					required_quantity: product.quantity,
					dispatched_quantity: 0,
				})
			);

			const { error: itemsError } = await supabase
				.from('sales_order_items')
				.insert(lineItems);

			if (itemsError) throw itemsError;

			// TODO: Upload files if any

			// Success! Close sheet and notify parent
			handleCancel();
			if (onOrderAdded) {
				onOrderAdded();
			}
		} catch (error) {
			console.error('Error saving sales order:', error);
			setSaveError(error instanceof Error ? error.message : 'Failed to save sales order');
		} finally {
			setSaving(false);
		}
	};

	// Check if user can proceed to next step using useMemo
	const canProceed = useMemo(() =>
		products.some(p => p.selected && p.quantity > 0),
		[products]
	);

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent>
					{/* Header */}
					<SheetHeader>
						<SheetTitle>Create sales order</SheetTitle>
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

					{/* Form */}
					<form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden mt-1">
						{/* Step Content */}
						{currentStep === 'products' ? (
							<ProductSelectionStep
								products={products}
								loading={loading}
								onOpenQuantitySheet={handleOpenQuantitySheet}
							/>
						) : (
							<OrderDetailsStep
								formData={formData}
								setFormData={setFormData}
							/>
						)}

						{/* Footer - Fixed at bottom */}
						<SheetFooter>
							{saveError && (
								<p className="text-sm text-red-600 text-center">{saveError}</p>
							)}
							<div className="flex gap-3">
								{currentStep === 'products' ? (
									<>
										<Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
											Cancel
										</Button>
										<Button type="button" onClick={handleNext} disabled={!canProceed} className="flex-1">
											Next
										</Button>
									</>
								) : (
									<>
										<Button type="button" variant="outline" onClick={handleBack} disabled={saving} className="flex-1">
											Back
										</Button>
										<Button type="submit" disabled={saving} className="flex-1">
											{saving ? 'Saving...' : 'Save'}
										</Button>
									</>
								)}
							</div>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>

			{/* Product Quantity Sheet */}
			<ProductQuantitySheet
				open={showQuantitySheet}
				onOpenChange={setShowQuantitySheet}
				product={selectedProduct}
				initialQuantity={
					selectedProduct
						? products.find(p => p.id === selectedProduct.id)?.quantity || 0
						: 0
				}
				onConfirm={handleQuantityConfirm}
			/>
		</>
	);
}
