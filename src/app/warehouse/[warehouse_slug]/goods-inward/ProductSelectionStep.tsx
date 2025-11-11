'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { IconSearch, IconPlus, IconMinus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tables } from '@/types/database/supabase';
import { pluralize, pluralizeWord } from '@/lib/utils/pluralize';

export interface StockUnitSpec {
	id: string; // temp ID for UI
	quantity: number;
	grade: string;
	supplier_number?: string;
	location?: string;
	notes?: string;
	count: number; // for duplicate specs
}

export interface ProductWithUnits extends Tables<'products'> {
	units: StockUnitSpec[];
}

interface ProductSelectionStepProps {
	products: ProductWithUnits[];
	loading: boolean;
	onOpenUnitSheet: (product: Tables<'products'>, hasExistingUnits: boolean) => void;
}

export function ProductSelectionStep({
	products,
	loading,
	onOpenUnitSheet,
}: ProductSelectionStepProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [materialFilter, setMaterialFilter] = useState<string>('all');
	const [colorFilter, setColorFilter] = useState<string>('all');
	const [tagsFilter, setTagsFilter] = useState<string>('all');

	// Extract filter options using useMemo
	const { materials, colors, tags } = useMemo(() => {
		const m = new Set<string>(), c = new Set<string>(), t = new Set<string>();
		for (const p of products) {
			if (p.material) m.add(p.material);
			if (p.color_name) c.add(p.color_name);
			p.tags?.forEach(tag => t.add(tag));
		}
		return {
			materials: Array.from(m).sort(),
			colors: Array.from(c).sort(),
			tags: Array.from(t).sort(),
		};
	}, [products]);

	// Filter and sort products using useMemo
	const filteredProducts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		// Filter products
		let filtered = products.filter(product => {
			// Search filter
			if (query && !(
				product.name.toLowerCase().includes(query) ||
				product.material?.toLowerCase().includes(query) ||
				product.color_name?.toLowerCase().includes(query)
			)) return false;

			// Material filter
			if (materialFilter !== 'all' && product.material !== materialFilter) return false;

			// Color filter
			if (colorFilter !== 'all' && product.color_name !== colorFilter) return false;

			// Tags filter
			if (tagsFilter !== 'all' && !product.tags?.includes(tagsFilter)) return false;

			return true;
		});

		// Sort: products with units first
		filtered.sort((a, b) => {
			const aHasUnits = a.units.length > 0;
			const bHasUnits = b.units.length > 0;
			if (aHasUnits && !bHasUnits) return -1;
			if (!aHasUnits && bHasUnits) return 1;
			return 0;
		});

		return filtered;
	}, [products, searchQuery, materialFilter, colorFilter, tagsFilter]);

	return (
		<>
			{/* Filters Section */}
			<div className="flex flex-col gap-3 px-4 py-4 shrink-0">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900">Select products</h3>
					<Button variant="ghost">
						<IconPlus className="size-4" />
						New product
					</Button>
				</div>

				{/* Search */}
				<div className="relative">
					<Input
						placeholder="Search for product"
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="pr-10"
					/>
					<IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
				</div>

				{/* Filter Dropdowns */}
				<div className="flex gap-3">
					<Select value={materialFilter} onValueChange={setMaterialFilter}>
						<SelectTrigger className="flex-1 h-10">
							<SelectValue placeholder="Material" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All materials</SelectItem>
							{materials.map(material => (
								<SelectItem key={material} value={material}>
									{material}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={colorFilter} onValueChange={setColorFilter}>
						<SelectTrigger className="flex-1 h-10">
							<SelectValue placeholder="Color" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All colors</SelectItem>
							{colors.map(color => (
								<SelectItem key={color} value={color}>
									{color}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={tagsFilter} onValueChange={setTagsFilter}>
						<SelectTrigger className="flex-1 h-10">
							<SelectValue placeholder="Tags" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All tags</SelectItem>
							{tags.map(tag => (
								<SelectItem key={tag} value={tag}>
									{tag}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Product List - Scrollable */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-gray-500">Loading products...</p>
					</div>
				) : filteredProducts.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-gray-500">No products found</p>
					</div>
				) : (
					<div className="flex flex-col">
						{filteredProducts.map(product => {
							const imageUrl = product.product_images?.[0];
							const hasUnits = product.units.length > 0;
							const totalUnits = product.units.reduce((sum, unit) => sum + unit.count, 0);
							const productInfo = [product.material, product.color_name].filter(Boolean).join(', ');

							return (
								<div
									key={product.id}
									className="flex items-center gap-3 p-4 border-b border-gray-200"
								>
									{/* Product Image */}
									<div className="relative size-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
										{imageUrl ? (
											<Image
												src={imageUrl}
												alt={product.name}
												fill
												className="object-cover"
											/>
										) : (
											<div className="flex items-center justify-center size-full text-gray-400">
												<IconPlus className="size-6" />
											</div>
										)}
									</div>

									{/* Product Info */}
									<div className="flex-1 min-w-0">
										<p title={product.name} className="text-base font-medium text-gray-700 truncate">
											{product.name}
										</p>
										<p title={productInfo} className="text-xs text-gray-500 truncate">
											{[product.material, product.color_name].filter(Boolean).join(', ')}
										</p>
									</div>

									{/* Add/Count Button */}
									{hasUnits ? (
										<Button
											type="button"
											size="sm"
											onClick={() => onOpenUnitSheet(product, hasUnits)}
										>
											<IconMinus />
											{pluralize(totalUnits, product.stock_type)}
											<IconPlus />
										</Button>
									) : (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => onOpenUnitSheet(product, hasUnits)}
										>
											<IconPlus />
											Add {product.stock_type}
										</Button>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</>
	);
}
