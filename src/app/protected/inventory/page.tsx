'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconSearch, IconAlertTriangle, IconClothesRack } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/layouts/loading-state';
import { AddProductSheet } from './AddProductSheet';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { Button } from '@/components/ui/button';

type ProductRow = Tables<'products'>;

interface Product {
	id: string;
	name: string;
	productNumber: string;
	material: string | null;
	color: string | null;
	totalQuantity: number;
	unit: string;
	imageUrl?: string;
}

export default function InventoryPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddProduct, setShowAddProduct] = useState(false);

	const supabase = createClient();

	const fetchProducts = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data, error: fetchError } = await supabase
				.from('products')
				.select('*')
				.order('name', { ascending: true });

			if (fetchError) throw fetchError;

			// Transform data to match Product interface
			const transformedProducts: Product[] = (data || []).map((p: ProductRow) => ({
				id: p.id,
				name: p.name,
				productNumber: p.product_number,
				material: p.material,
				color: p.color,
				totalQuantity: 0, // TODO: Calculate from stock_units
				unit: p.measuring_unit,
				imageUrl: p.product_images?.[0] || undefined,
			}));

			setProducts(transformedProducts);
		} catch (err) {
			console.error('Error fetching products:', err);
			setError(err instanceof Error ? err.message : 'Failed to load products');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, []);

	const filteredProducts = products.filter((product) => {
		const matchesSearch =
			product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			product.productNumber.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	// Loading state
	if (loading) {
		return <LoadingState message="Loading inventory..." />;
	}

	// Error state
	if (error) {
		return (
			<div className="relative flex flex-col min-h-screen pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Failed to load inventory</h2>
						<p className="text-sm text-gray-600">{error}</p>
						<Button onClick={() => window.location.reload()} variant="outline" size="sm">
							Try again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-screen pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1 flex flex-col gap-2">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
						<p className="text-sm text-gray-500">
							<span>3000 items  •  </span>
							<span className="text-teal-700 font-medium">200 order request</span>
							<span>  •  </span>
							<span className="text-yellow-700 font-medium">5 low stock products</span>
						</p>
					</div>

					{/* Search */}
					<div className="relative max-w-md">
						<Input
							type="text"
							placeholder="Search for item"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pr-10"
						/>
						<IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
					</div>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/illustrations/inventory-shelf.png"
						alt="Inventory"
						fill
						sizes="100px"
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-3 px-4 py-2 overflow-x-auto">
				<Button variant="outline" size="icon" className="shrink-0 size-10">
					<IconAlertTriangle className="size-5" />
				</Button>
				<Select>
					<SelectTrigger className="w-[140px] h-10 shrink-0">
						<SelectValue placeholder="Material" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="silk">Silk</SelectItem>
						<SelectItem value="cotton">Cotton</SelectItem>
						<SelectItem value="wool">Wool</SelectItem>
					</SelectContent>
				</Select>
				<Select>
					<SelectTrigger className="w-[140px] h-10 shrink-0">
						<SelectValue placeholder="Color" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="red">Red</SelectItem>
						<SelectItem value="blue">Blue</SelectItem>
						<SelectItem value="green">Green</SelectItem>
					</SelectContent>
				</Select>
				<Select>
					<SelectTrigger className="w-[140px] h-10 shrink-0">
						<SelectValue placeholder="Tags" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="floral">Floral</SelectItem>
						<SelectItem value="geometric">Geometric</SelectItem>
						<SelectItem value="plain">Plain</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Product List */}
			<div className="flex flex-col gap-0">
				{filteredProducts.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No products found</p>
						<p className="text-sm text-gray-500">
							{searchQuery ? 'Try adjusting your search' : 'Add your first product'}
						</p>
					</div>
				) : (
					filteredProducts.map((product) => (
						<Card key={product.id} className="rounded-none border-0 border-b border-gray-200 shadow-none bg-transparent">
							<CardContent className="p-4 flex gap-4 items-center">
								{/* Product Image */}
								<div className="relative size-16 rounded-lg shrink-0 bg-gray-200 overflow-hidden">
									{product.imageUrl ? (
										<Image
											src={product.imageUrl}
											alt={product.name}
											fill
											className="object-cover"
										/>
									) : (
										<div className="flex items-center justify-center size-full">
											<IconClothesRack className="size-8 text-gray-400" />
										</div>
									)}
								</div>

								{/* Product Info */}
								<div className="flex-1 flex flex-col items-start">
									<p className="text-base font-medium text-gray-900">{product.name}</p>
									<p className="text-xs text-gray-500">
										{[product.material, product.color].filter(Boolean).join(', ') || 'No details'}
									</p>
								</div>

								{/* Quantity */}
								<div className="flex flex-col items-end">
									<p className="text-base font-bold text-gray-900">
										{product.totalQuantity} {product.unit}
									</p>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>

			{/* Floating Action Button */}
			<Fab
				onClick={() => setShowAddProduct(true)}
				className="fixed bottom-20 right-4"
			/>

			{/* Add Product Sheet */}
			{showAddProduct && (
				<AddProductSheet
					open={showAddProduct}
					onOpenChange={setShowAddProduct}
					onProductAdded={fetchProducts}
				/>
			)}
		</div>
	);
}
