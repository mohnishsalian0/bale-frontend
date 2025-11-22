'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import ImageWrapper from '@/components/ui/image-wrapper';
import { AddProductSheet } from './AddProductSheet';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/contexts/session-context';
import type { Tables } from '@/types/database/supabase';
import type { MeasuringUnit, StockType } from '@/types/database/enums';
import { Button } from '@/components/ui/button';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import { getProductIcon } from '@/lib/utils/product';

type ProductRow = Tables<'products'>;

interface Product {
	id: string;
	sequence_number: number;
	name: string;
	productNumber: string;
	material: string | null;
	color: string | null;
	totalQuantity: number;
	stock_type: StockType;
	unit: string | null;
	imageUrl?: string;
};

export default function InventoryPage() {
	const router = useRouter();
	const { warehouse } = useSession();
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
				.select(`
					*,
					inventory_agg:product_inventory_aggregates!product_id(
						in_stock_quantity
					)
				`)
				.eq('product_inventory_aggregates.warehouse_id', warehouse.id)
				.is('deleted_at', null)
				.order('name', { ascending: true });

			if (fetchError) throw fetchError;

			// Transform data to match Product interface
			const transformedProducts: Product[] = (data || []).map((p: any) => ({
				id: p.id,
				sequence_number: p.sequence_number,
				name: p.name,
				productNumber: p.sequence_number?.toString() || '',
				material: p.material,
				color: p.color_name,
				totalQuantity: p.inventory_agg?.[0]?.in_stock_quantity || 0,
				stock_type: p.stock_type as StockType,
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
			<ErrorState
				title="Failed to load inventory"
				message={error}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	return (
		<div className="relative flex flex-col flex-1 overflow-y-auto">
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
							placeholder="Search for product"
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
			<div className="flex gap-3 px-4 py-2 overflow-x-auto shrink-0">
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
						<Card
							key={product.id}
							className="rounded-none border-0 border-b border-gray-200 shadow-none bg-transparent cursor-pointer hover:bg-gray-50 transition-colors"
							onClick={() => router.push(`/warehouse/${warehouse.slug}/inventory/${product.productNumber}`)}
						>
							<CardContent className="p-4 flex gap-4 items-center">
								{/* Product Image */}
								<ImageWrapper
									size="lg"
									shape="square"
									imageUrl={product.imageUrl}
									alt={product.name}
									placeholderIcon={getProductIcon(product.stock_type)}
								/>

								{/* Product Info */}
								<div className="flex-1 flex flex-col items-start">
									<p className="text-base font-medium text-gray-900">{product.name}</p>
									<p className="text-xs text-gray-500">PROD-{product.sequence_number}</p>
									<p className="text-xs text-gray-500">
										{[product.material, product.color].filter(Boolean).join(', ') || 'No details'}
									</p>
								</div>

								{/* Quantity */}
								<div className="flex flex-col items-end">
									<p className="text-base font-bold text-gray-900">
										{product.totalQuantity} {getMeasuringUnitAbbreviation(product.unit as MeasuringUnit | null)}
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
