'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InventoryProductListStep } from './InventoryProductListStep';
import {
	getProductsWithAttributes,
	getProductAttributeLists,
	type ProductWithAttributes,
	type ProductMaterial,
	type ProductColor,
	type ProductTag
} from '@/lib/queries/products';

interface SelectInventorySheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProductSelect?: (product: ProductWithAttributes) => void;
}

export function SelectInventorySheet({
	open,
	onOpenChange,
	onProductSelect,
}: SelectInventorySheetProps) {
	const [products, setProducts] = useState<ProductWithAttributes[]>([]);
	const [materials, setMaterials] = useState<ProductMaterial[]>([]);
	const [colors, setColors] = useState<ProductColor[]>([]);
	const [tags, setTags] = useState<ProductTag[]>([]);
	const [loading, setLoading] = useState(false);

	// Load products on mount
	useEffect(() => {
		if (open) {
			loadData();
		}
	}, [open]);

	const loadData = async () => {
		setLoading(true);
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
			console.error('Error loading products:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleProductSelect = (product: ProductWithAttributes) => {
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
						materials={materials}
						colors={colors}
						tags={tags}
						loading={loading}
						onProductSelect={handleProductSelect}
					/>

					{/* Footer */}
					<SheetFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							className="w-full"
						>
							Cancel
						</Button>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
}
