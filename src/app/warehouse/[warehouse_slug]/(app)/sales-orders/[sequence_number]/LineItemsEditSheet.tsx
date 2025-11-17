'use client';

import { useState, useEffect, useMemo } from 'react';
import { IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database/supabase';
import { ProductSelectionStep } from '../ProductSelectionStep';
import { ProductQuantitySheet } from '../ProductQuantitySheet';

interface ProductWithSelection extends Tables<'products'> {
	selected: boolean;
	quantity: number;
	lineItemId?: string; // Track existing line item ID for updates
}

interface LineItemsEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	companyId: string;
	existingLineItems: Array<{
		id: string;
		product_id: string;
		required_quantity: number;
	}>;
	onSuccess: () => void;
}

export function LineItemsEditSheet({
	open,
	onOpenChange,
	orderId,
	companyId,
	existingLineItems,
	onSuccess,
}: LineItemsEditSheetProps) {
	const [products, setProducts] = useState<ProductWithSelection[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);
	const isMobile = useIsMobile();

	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

	const loadProducts = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			const { data, error } = await supabase
				.from('products')
				.select('*')
				.eq('company_id', companyId)
				.order('name', { ascending: true });

			if (error) throw error;

			// Map existing line items to selected products
			const lineItemsMap = new Map(
				existingLineItems.map(item => [item.product_id, { quantity: item.required_quantity, lineItemId: item.id }])
			);

			const productsWithSelection: ProductWithSelection[] = (data || []).map(product => {
				const lineItem = lineItemsMap.get(product.id);
				return {
					...product,
					selected: !!lineItem,
					quantity: lineItem?.quantity || 0,
					lineItemId: lineItem?.lineItemId,
				};
			});

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
							selected: quantity > 0,
							quantity,
						}
						: product
				)
			);
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			const supabase = createClient();

			const selectedProducts = products.filter(p => p.selected && p.quantity > 0);

			if (selectedProducts.length === 0) {
				toast.error('Please select at least one product');
				return;
			}

			// Determine operations: insert new, update existing, delete removed
			const existingIds = new Set(existingLineItems.map(item => item.id));
			const currentProductIds = new Set(selectedProducts.map(p => p.id));
			const previousProductIds = new Set(existingLineItems.map(item => item.product_id));

			// Items to delete: products that were selected but are no longer
			const itemsToDelete = existingLineItems
				.filter(item => !currentProductIds.has(item.product_id))
				.map(item => item.id);

			// Items to update: products that exist in both old and new
			const itemsToUpdate = selectedProducts
				.filter(p => p.lineItemId && previousProductIds.has(p.id))
				.map(p => ({
					id: p.lineItemId!,
					required_quantity: p.quantity,
				}));

			// Items to insert: products that are new
			const itemsToInsert = selectedProducts
				.filter(p => !previousProductIds.has(p.id))
				.map(p => ({
					sales_order_id: orderId,
					product_id: p.id,
					required_quantity: p.quantity,
					unit_rate: 0, // Will be set by user or calculated
					line_total: 0, // Will be calculated
				}));

			// Execute operations
			if (itemsToDelete.length > 0) {
				const { error } = await supabase
					.from('sales_order_items')
					.delete()
					.in('id', itemsToDelete);

				if (error) throw error;
			}

			if (itemsToUpdate.length > 0) {
				for (const item of itemsToUpdate) {
					const { error } = await supabase
						.from('sales_order_items')
						.update({ required_quantity: item.required_quantity })
						.eq('id', item.id);

					if (error) throw error;
				}
			}

			if (itemsToInsert.length > 0) {
				const { error } = await supabase
					.from('sales_order_items')
					.insert(itemsToInsert);

				if (error) throw error;
			}

			toast.success('Line items updated');
			onSuccess();
			onOpenChange(false);
		} catch (error) {
			console.error('Error updating line items:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update line items');
		} finally {
			setSaving(false);
		}
	};

	const selectedCount = useMemo(() => {
		return products.filter(p => p.selected && p.quantity > 0).length;
	}, [products]);

	const content = (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b shrink-0">
				<h2 className="text-lg font-semibold">Edit line items</h2>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleCancel}
					disabled={saving}
				>
					<IconX />
				</Button>
			</div>

			{/* Product Selection */}
			<div className="flex-1 overflow-hidden flex flex-col">
				<ProductSelectionStep
					products={products}
					loading={loading}
					onOpenQuantitySheet={handleOpenQuantitySheet}
				/>
			</div>

			{/* Footer */}
			<div className="flex gap-3 p-4 border-t shrink-0">
				<Button
					type="button"
					variant="outline"
					onClick={handleCancel}
					className="flex-1"
					disabled={saving}
				>
					Cancel
				</Button>
				<Button
					type="button"
					onClick={handleSave}
					className="flex-1"
					disabled={saving || selectedCount === 0}
				>
					{saving ? 'Saving...' : `Save (${selectedCount} items)`}
				</Button>
			</div>

			{/* Product Quantity Sheet */}
			<ProductQuantitySheet
				open={showQuantitySheet}
				onOpenChange={setShowQuantitySheet}
				product={selectedProduct}
				initialQuantity={selectedProduct ? products.find(p => p.id === selectedProduct.id)?.quantity || 0 : 0}
				onConfirm={handleQuantityConfirm}
			/>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent className="h-[95vh]">
					{content}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl h-[90vh] p-0 gap-0">
				{content}
			</DialogContent>
		</Dialog>
	);
}
