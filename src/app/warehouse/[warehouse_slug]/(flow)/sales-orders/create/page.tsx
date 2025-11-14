'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ProductQuantitySheet } from '../ProductQuantitySheet';
import { ProductSelectionStep } from '../ProductSelectionStep';
import { OrderDetailsStep } from '../OrderDetailsStep';
import type { Tables, TablesInsert } from '@/types/database/supabase';
import { useSession } from '@/contexts/warehouse-context';
import { toast } from 'sonner';

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

export default function CreateSalesOrderPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [currentStep, setCurrentStep] = useState<FormStep>('products');
	const [products, setProducts] = useState<ProductWithSelection[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);
	const [saving, setSaving] = useState(false);

	const supabase = createClient();

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
		loadProducts();
	}, []);

	const loadProducts = async () => {
		setLoading(true);
		try {
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
			toast.error('Failed to load products');
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

	const canProceed = useMemo(() =>
		products.some(p => p.selected && p.quantity > 0),
		[products]
	);

	const canSubmit = useMemo(() =>
		formData.customerId !== '' && formData.orderDate !== '',
		[formData.customerId, formData.orderDate]
	);

	const handleNext = () => {
		setCurrentStep('details');
	};

	const handleBack = () => {
		setCurrentStep('products');
	};

	const handleCancel = () => {
		router.push(`/warehouse/${warehouse.slug}/sales-orders`);
	};

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSaving(true);

		try {
			const selectedProducts = products.filter(p => p.selected && p.quantity > 0);

			// Prepare sales order insert data
			const salesOrderInsert: Omit<TablesInsert<'sales_orders'>, 'created_by' | 'modified_by' | 'sequence_number'> = {
				warehouse_id: formData.warehouseId,
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
					warehouse_id: formData.warehouseId,
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

			// Success! Show toast and redirect
			toast.success('Sales order created successfully');
			router.push(`/warehouse/${warehouse.slug}/sales-orders`);
		} catch (error) {
			console.error('Error creating sales order:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create sales order');
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
							<h1 className="text-xl font-semibold text-gray-900">Create sales order</h1>
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
				<div className="flex-1 flex-col overflow-y-auto flex">
					{currentStep === 'products' ? (
						<ProductSelectionStep
							products={products}
							loading={loading}
							onOpenQuantitySheet={handleOpenQuantitySheet}
						/>
					) : (
						<OrderDetailsStep
							formData={formData}
							setFormData={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
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

				{/* Product Quantity Sheet */}
				{showQuantitySheet && selectedProduct && (
					<ProductQuantitySheet
						open={showQuantitySheet}
						onOpenChange={setShowQuantitySheet}
						product={selectedProduct}
						initialQuantity={products.find(p => p.id === selectedProduct.id)?.quantity || 0}
						onConfirm={handleQuantityConfirm}
					/>
				)}
			</div>
		</div>
	);
}
