'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconBuildingWarehouse, IconShare } from '@tabler/icons-react';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { TabUnderline } from '@/components/ui/tab-underline';
import { GlowIndicator } from '@/components/ui/glow-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ImageWrapper from '@/components/ui/image-wrapper';
import { getProductIcon } from '@/lib/utils/product';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/contexts/session-context';
import { formatCurrency } from '@/lib/utils/financial';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import { SummaryTab } from './SummaryTab';
import { StockUnitsTab } from './StockUnitsTab';
import { StockFlowTab } from './StockFlowTab';
import { AddProductSheet } from '../AddProductSheet';
import type { Tables } from '@/types/database/supabase';
import type { MeasuringUnit, StockType } from '@/types/database/enums';
import IconStore from '@/components/icons/IconStore';
import {
	PRODUCT_WITH_ATTRIBUTES_SELECT,
	transformProductWithAttributes,
	type ProductWithAttributes
} from '@/lib/queries/products';

type Product = ProductWithAttributes;
type StockUnit = Tables<'stock_units'>;
type GoodsInward = Tables<'goods_inwards'>;
type GoodsOutward = Tables<'goods_outwards'>;
type GoodsOutwardItem = Tables<'goods_outward_items'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;

interface StockUnitWithInward extends StockUnit {
	goods_inward: (GoodsInward & {
		partner: Partner | null;
		from_warehouse: Warehouse | null;
	}) | null;
}

interface OutwardItemWithDetails extends GoodsOutwardItem {
	outward: (GoodsOutward & {
		partner: Partner | null;
		to_warehouse: Warehouse | null;
	}) | null;
}

interface PageParams {
	params: Promise<{
		warehouse_slug: string;
		product_number: string;
	}>;
}

export default function ProductDetailPage({ params }: PageParams) {
	const router = useRouter();
	const { product_number } = use(params);
	const { warehouse } = useSession();
	const [product, setProduct] = useState<Product | null>(null);
	const [stockUnits, setStockUnits] = useState<StockUnitWithInward[]>([]);
	const [outwardItems, setOutwardItems] = useState<OutwardItemWithDetails[]>([]);
	const [totalQuantity, setTotalQuantity] = useState(0);
	const [totalStockValue, setTotalStockValue] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'summary' | 'stock_units' | 'stock_flow'>('summary');
	const [showEditProduct, setShowEditProduct] = useState(false);

	const fetchProduct = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			// Fetch product with aggregates and attributes
			const { data: productData, error: productError } = await supabase
				.from('products')
				.select(`
					${PRODUCT_WITH_ATTRIBUTES_SELECT},
					inventory_agg:product_inventory_aggregates!product_id(
						in_stock_quantity,
						in_stock_value
					)
				`)
				.eq('sequence_number', parseInt(product_number))
				.eq('product_inventory_aggregates.warehouse_id', warehouse.id)
				.is('deleted_at', null)
				.single();

			if (productError) throw productError;
			if (!productData) throw new Error('Product not found');

			setProduct(transformProductWithAttributes(productData));

			// Get aggregated values
			const inventoryAgg = (productData as any).inventory_agg?.[0];
			if (inventoryAgg) {
				setTotalQuantity(Number(inventoryAgg.in_stock_quantity || 0));
				setTotalStockValue(Number(inventoryAgg.in_stock_value || 0));
			}

			// Fetch stock units with inward details
			const { data: stockUnitsData, error: stockUnitsError } = await supabase
				.from('stock_units')
				.select(`
					*,
					goods_inward:goods_inwards!created_from_inward_id(
						id, sequence_number, inward_date, inward_type,
						partner:partners!goods_inwards_partner_id_fkey(
							id, first_name, last_name, company_name
						),
						from_warehouse:warehouses!goods_inwards_from_warehouse_id_fkey(
							id, name
						)
					)
				`)
				.eq('product_id', productData.id)
				.eq('warehouse_id', warehouse.id)
				.eq('status', 'in_stock')
				.is('deleted_at', null)
				.order('created_at', { ascending: false });

			if (stockUnitsError) throw stockUnitsError;

			setStockUnits(stockUnitsData as StockUnitWithInward[] || []);

			// Fetch outward items
			const { data: outwardItemsData, error: outwardError } = await supabase
				.from('goods_outward_items')
				.select(`
					*,
					stock_unit:stock_units!inner(product_id),
					outward:goods_outwards(
						id, sequence_number, outward_date, outward_type,
						partner:partners!goods_outwards_partner_id_fkey(
							id, first_name, last_name, company_name
						),
						to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(
							id, name
						)
					)
				`)
				.eq('stock_unit.product_id', productData.id)
				.order('created_at', { ascending: false })
				.limit(50);

			if (outwardError) throw outwardError;

			setOutwardItems(outwardItemsData as OutwardItemWithDetails[] || []);
		} catch (err) {
			console.error('Error fetching product:', err);
			setError(err instanceof Error ? err.message : 'Failed to load product');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProduct();
	}, [product_number]);

	if (loading) {
		return <LoadingState message="Loading product details..." />;
	}

	if (error || !product) {
		return (
			<ErrorState
				title="Product not found"
				message={error || 'This product does not exist or has been deleted'}
				onRetry={() => router.back()}
				actionText="Go back"
			/>
		);
	}

	// Get all tags
	const allTags: Array<{ text: string; isPrimary: boolean }> = [];
	if (product.materials) {
		product.materials.forEach((m) => {
			allTags.push({ text: m.name, isPrimary: true });
		});
	}
	if (product.colors) {
		product.colors.forEach((c) => {
			allTags.push({ text: c.name, isPrimary: true });
		});
	}
	if (product.tags) {
		product.tags.forEach((tag) => {
			allTags.push({ text: tag.name, isPrimary: false });
		});
	}

	// Get values for info cards
	const unitAbbr = getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit);

	return (
		<div className="flex flex-col flex-1 overflow-y-auto">
			<div className="relative flex flex-col flex-1">
				{/* Header */}
				<div className="p-4 pb-6">
					<div className="flex items-start gap-4">
						{/* Product Image */}
						<ImageWrapper
							size="xl"
							shape="square"
							imageUrl={product.product_images?.[0]}
							alt={product.name}
							placeholderIcon={getProductIcon(product.stock_type as StockType)}
						/>

						<div className="flex-1 flex flex-col gap-2">
							<div className="flex items-start gap-4">
								{/* Product Info */}
								<div className="flex-1 min-w-0">
									<h1 className="text-2xl font-bold text-gray-900" title={product.name}>
										{product.name}
									</h1>
									<p className="text-sm text-gray-500">PROD-{product.sequence_number}</p>
								</div>

								{/* Visible on catalog */}
								<GlowIndicator className='mt-2 mr-2' isActive={product.show_on_catalog || false} />
							</div>

							{/* Tags */}
							{allTags.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{allTags.map((tag, index) => (
										<Badge
											key={index}
											color={tag.isPrimary ? 'blue' : 'gray'}
										>
											{tag.text}
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Stock & Sales Info Cards */}
				<div className="grid grid-cols-2 gap-3 px-4 pb-6">
					{/* Total Stock Card */}
					<div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
						<div className="flex gap-2 mb-2">
							<IconBuildingWarehouse className="size-4 text-gray-500" />
							<span className="text-xs text-gray-500">Total stock</span>
						</div>
						<p className="text-lg font-bold text-gray-700 whitespace-pre">
							{`${totalQuantity} ${unitAbbr}  •  ₹ ${formatCurrency(totalStockValue)}`}
						</p>
					</div>

					{/* Order Request Card */}
					<div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
						<div className="flex gap-2 mb-2">
							<IconStore className="size-4 fill-gray-500" />
							<span className="text-xs text-gray-500">Order request</span>
						</div>
						<p className="text-lg font-bold text-gray-700 whitespace-pre">
							{`0 ${unitAbbr}  •  ₹ 0`}
						</p>
					</div>
				</div>

				{/* Tabs */}
				<TabUnderline
					activeTab={activeTab}
					onTabChange={(tab) => setActiveTab(tab as 'summary' | 'stock_units' | 'stock_flow')}
					tabs={[
						{ value: 'summary', label: 'Summary' },
						{ value: 'stock_units', label: 'Stock units' },
						{ value: 'stock_flow', label: 'Stock flow' },
					]}
				/>

				{/* Tab Content */}
				<div className="flex-1">
					{activeTab === 'summary' && (
						<SummaryTab
							product={product}
						/>
					)}
					{activeTab === 'stock_units' && (
						<StockUnitsTab
							stockUnits={stockUnits}
							measuringUnit={product.measuring_unit as MeasuringUnit}
						/>
					)}
					{activeTab === 'stock_flow' && (
						<StockFlowTab
							inwardItems={stockUnits}
							outwardItems={outwardItems}
							measuringUnit={product.measuring_unit as MeasuringUnit}
						/>
					)}
				</div>

				{/* Bottom Action Bar */}
				<div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								•••
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" side='top' sideOffset={8}>
							<DropdownMenuItem onClick={() => console.log('Toggle catalog visibility')}>
								{product.show_on_catalog ? 'Hide from catalog' : 'Show on catalog'}
							</DropdownMenuItem>
							<DropdownMenuItem variant='destructive' onClick={() => console.log('Delete product')}>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button variant="outline" onClick={() => setShowEditProduct(true)} className='flex-1'>
						Edit
					</Button>

					<Button variant="outline" onClick={() => console.log('Share')} className='flex-2'>
						<IconShare className="size-5" />
						Share
					</Button>
				</div>

				{/* Edit Product Sheet */}
				{showEditProduct && (
					<AddProductSheet
						open={showEditProduct}
						onOpenChange={setShowEditProduct}
						onProductAdded={fetchProduct}
					/>
				)}
			</div>
		</div>
	);
}
