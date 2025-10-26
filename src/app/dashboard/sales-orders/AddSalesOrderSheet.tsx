'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import { getProductImageUrls } from '@/lib/storage';
import { ProductQuantitySheet } from './ProductQuantitySheet';
import type { Tables } from '@/types/database/supabase';

interface AddSalesOrderSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOrderAdded?: () => void;
}

interface ProductWithSelection extends Tables<'products'> {
	selected: boolean;
	quantity: number;
}

type FormStep = 'products' | 'details';

export function AddSalesOrderSheet({ open, onOpenChange, onOrderAdded }: AddSalesOrderSheetProps) {
	const [currentStep, setCurrentStep] = useState<FormStep>('products');
	const [products, setProducts] = useState<ProductWithSelection[]>([]);
	const [filteredProducts, setFilteredProducts] = useState<ProductWithSelection[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [materialFilter, setMaterialFilter] = useState<string>('all');
	const [colorFilter, setColorFilter] = useState<string>('all');
	const [tagsFilter, setTagsFilter] = useState<string>('all');
	const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
	const [availableColors, setAvailableColors] = useState<string[]>([]);
	const [availableTags, setAvailableTags] = useState<string[]>([]);
	const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);

	// Load products on mount
	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

	// Apply filters when products or filters change
	useEffect(() => {
		applyFilters();
	}, [products, searchQuery, materialFilter, colorFilter, tagsFilter]);

	const loadProducts = async () => {
		setLoading(true);
		try {
			const supabase = createClient();
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id) {
				throw new Error('User not found');
			}

			const { data, error } = await supabase
				.from('products')
				.select('*')
				.eq('company_id', currentUser.company_id)
				.order('created_at', { ascending: false });

			if (error) throw error;

			// Add selection state to products
			const productsWithSelection: ProductWithSelection[] = (data || []).map(product => ({
				...product,
				selected: false,
				quantity: 0,
			}));

			setProducts(productsWithSelection);

			// Extract unique materials, colors, and tags
			const materials = new Set<string>();
			const colors = new Set<string>();
			const tags = new Set<string>();

			(data || []).forEach(product => {
				if (product.material) materials.add(product.material);
				if (product.color) colors.add(product.color);
				if (product.tags) {
					product.tags.forEach((tag: string) => tags.add(tag));
				}
			});

			setAvailableMaterials(Array.from(materials).sort());
			setAvailableColors(Array.from(colors).sort());
			setAvailableTags(Array.from(tags).sort());
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			setLoading(false);
		}
	};

	const applyFilters = () => {
		let filtered = [...products];

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				product =>
					product.name.toLowerCase().includes(query) ||
					product.material?.toLowerCase().includes(query) ||
					product.color?.toLowerCase().includes(query)
			);
		}

		// Material filter
		if (materialFilter && materialFilter !== 'all') {
			filtered = filtered.filter(product => product.material === materialFilter);
		}

		// Color filter
		if (colorFilter && colorFilter !== 'all') {
			filtered = filtered.filter(product => product.color === colorFilter);
		}

		// Tags filter
		if (tagsFilter && tagsFilter !== 'all') {
			filtered = filtered.filter(product => product.tags?.includes(tagsFilter));
		}

		setFilteredProducts(filtered);
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
		setFilteredProducts([]);
		setSearchQuery('');
		setMaterialFilter('all');
		setColorFilter('all');
		setTagsFilter('all');
		onOpenChange(false);
	};

	const handleNext = () => {
		// TODO: Move to step 2
		console.log('Moving to step 2...');
		setCurrentStep('details');
	};

	const selectedProducts = products.filter(p => p.selected && p.quantity > 0);
	const canProceed = selectedProducts.length > 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-[412px] p-0 flex flex-col">
				{/* Header */}
				<SheetHeader className='gap-0'>
					<SheetTitle>Create sales order</SheetTitle>
					<SheetDescription>
						Step {currentStep === 'products' ? '1' : '2'} of 2
					</SheetDescription>
				</SheetHeader>

				{/* Step 1: Product Selection */}
				{currentStep === 'products' && (
					<>
						{/* Filters Section */}
						<div className="flex flex-col gap-3 px-4 py-4 shrink-0">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-900">Select products</h3>
								<button className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800">
									<IconPlus className="size-4" />
									New product
								</button>
							</div>

							{/* Search */}
							<div className="relative">
								<Input
									placeholder="Search for item"
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
										{availableMaterials.map(material => (
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
										{availableColors.map(color => (
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
										{availableTags.map(tag => (
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
									<p className="text-sm text-neutral-500">Loading products...</p>
								</div>
							) : filteredProducts.length === 0 ? (
								<div className="flex items-center justify-center py-12">
									<p className="text-sm text-neutral-500">No products found</p>
								</div>
							) : (
								<div className="flex flex-col">
									{filteredProducts.map(product => {
										const imageUrl = product.product_images?.[0]
										// ? getProductImageUrls(product.company_id, product.id)[0]
										// : null;

										return (
											<div
												key={product.id}
												className="flex items-center gap-3 p-4 border-b border-neutral-200"
											>
												{/* Product Image */}
												<div className="relative size-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
													{imageUrl ? (
														<Image
															src={imageUrl}
															alt={product.name}
															fill
															className="object-cover"
														/>
													) : (
														<div className="flex items-center justify-center size-full text-neutral-400">
															<IconPlus className="size-6" />
														</div>
													)}
												</div>

												{/* Product Info */}
												<div className="flex-1 min-w-0">
													<p className="text-base font-medium text-gray-700 truncate">
														{product.name}
													</p>
													<p className="text-xs text-neutral-500 truncate">
														{[product.material, product.color].filter(Boolean).join(', ')}
													</p>
												</div>

												{/* Add/Quantity Button */}
												{product.selected && product.quantity > 0 ? (
													<Button
														size="sm"
														onClick={() => handleOpenQuantitySheet(product)}
														className="h-9 min-w-[90px] gap-1"
													>
														{product.quantity} {product.measuring_unit}
													</Button>
												) : (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleOpenQuantitySheet(product)}
														className="h-9 gap-2"
													>
														<IconPlus className="size-3" />
														Add
													</Button>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Footer - Fixed at bottom */}
						<SheetFooter className="flex flex-col gap-3 px-4 py-3 border-t border-neutral-200 bg-background-100 shadow-xs-reverse shrink-0">
							<div className="flex gap-3">
								<Button variant="outline" onClick={handleCancel} className="flex-1">
									Cancel
								</Button>
								<Button onClick={handleNext} disabled={!canProceed} className="flex-1">
									Next
								</Button>
							</div>
						</SheetFooter>
					</>
				)}

				{/* Step 2: Order Details */}
				{currentStep === 'details' && (
					<div className="flex-1 flex items-center justify-center">
						<p className="text-neutral-500">Step 2 - Order details coming soon...</p>
					</div>
				)}
			</SheetContent>

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
		</Sheet>
	);
}
