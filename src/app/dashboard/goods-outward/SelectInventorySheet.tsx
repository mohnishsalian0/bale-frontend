'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InventoryProductListStep } from './InventoryProductListStep';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

interface SelectInventorySheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProductSelect?: (product: Tables<'products'>) => void;
}

export function SelectInventorySheet({
	open,
	onOpenChange,
	onProductSelect,
}: SelectInventorySheetProps) {
	const [products, setProducts] = useState<Tables<'products'>[]>([]);
	const [loading, setLoading] = useState(false);

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

			setProducts(data || []);
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleProductSelect = (product: Tables<'products'>) => {
		// TODO: Open stock units selection for this product
		console.log('Selected product:', product);
		if (onProductSelect) {
			onProductSelect(product);
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				{/* Header */}
				<SheetHeader>
					<SheetTitle>Select from inventory</SheetTitle>
				</SheetHeader>

				{/* Product List - Scrollable */}
				<div className="flex flex-col h-full overflow-hidden">
					<InventoryProductListStep
						products={products}
						loading={loading}
						onProductSelect={handleProductSelect}
					/>

					{/* Footer */}
					<SheetFooter>
						<Button variant="outline" onClick={handleCancel} className="w-full">
							Cancel
						</Button>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
}
