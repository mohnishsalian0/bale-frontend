'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconPhoto } from '@tabler/icons-react';
import IconGoodsOutward from '@/components/icons/IconGoodsOutward';
import { createClient } from '@/lib/supabase/client';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import type { Tables } from '@/types/database/supabase';

type GoodsOutward = Tables<'goods_outwards'>;
type GoodsOutwardItem = Tables<'goods_outward_items'>;
type StockUnit = Tables<'stock_units'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type Product = Tables<'products'>;

interface OutwardWithDetails extends GoodsOutward {
	partner: Partner | null;
	warehouse: Warehouse | null;
	goods_outward_items: Array<
		GoodsOutwardItem & {
			stock_unit: (StockUnit & {
				product: Product | null;
			}) | null;
		}
	>;
}

interface OutwardsTabProps {
	orderId: string;
	warehouseSlug: string;
}

export function OutwardsTab({ orderId, warehouseSlug }: OutwardsTabProps) {
	const router = useRouter();
	const [outwards, setOutwards] = useState<OutwardWithDetails[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchOutwards = async () => {
			try {
				setLoading(true);
				const supabase = createClient();

				const { data, error: fetchError } = await supabase
					.from('goods_outwards')
					.select(`
						*,
						partner:partners!goods_outwards_partner_id_fkey(
							id, first_name, last_name, company_name
						),
						warehouse:warehouses!goods_outwards_warehouse_id_fkey(id, name),
						goods_outward_items(
							id,
							quantity_dispatched,
							stock_unit:stock_units(
								id,
								product:products(id, name, measuring_unit, sequence_number, product_images)
							)
						)
					`)
					.eq('sales_order_id', orderId)
					.is('deleted_at', null)
					.order('outward_date', { ascending: false });

				if (fetchError) throw fetchError;

				setOutwards((data as OutwardWithDetails[]) || []);
			} catch (err) {
				console.error('Error fetching outwards:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchOutwards();
	}, [orderId]);

	const formatOrderDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const day = date.getDate();
		const month = date.toLocaleString('en-US', { month: 'short' });
		const year = date.getFullYear();
		return `${day} ${month}, ${year}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-gray-500">Loading outwards...</p>
			</div>
		);
	}

	if (outwards.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<p className="text-gray-700">No outwards linked yet</p>
				<p className="text-sm text-gray-500">Create an outward to dispatch items from this order</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{outwards.map((outward) => (
				<div
					key={outward.id}
					onClick={() => router.push(`/warehouse/${warehouseSlug}/goods-outward/${outward.sequence_number}`)}
					className="border-b border-border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
				>
					{/* Outward Header */}
					<div className="flex items-start justify-between mb-4">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">GO-{outward.sequence_number}</h3>
							<p className="text-sm text-gray-500">{formatOrderDate(outward.outward_date)}</p>
						</div>
						<div className="shrink-0">
							<IconGoodsOutward className="size-10 fill-gray-500" />
						</div>
					</div>

					{/* Outward Items */}
					<div className="space-y-3">
						{outward.goods_outward_items.map((item) => (
							<div key={item.id} className="flex items-center gap-3">
								{/* Product Image */}
								<div className="relative size-8 rounded-lg overflow-hidden bg-gray-200 shrink-0">
									{item.stock_unit?.product?.product_images?.[0] ? (
										<Image
											src={item.stock_unit.product.product_images[0]}
											alt={item.stock_unit.product.name || ''}
											fill
											className="object-cover"
										/>
									) : (
										<div className="size-full flex items-center justify-center text-gray-400">
											<IconPhoto className="size-4" />
										</div>
									)}
								</div>

								{/* Product Details */}
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-900 truncate">
										{item.stock_unit?.product?.name || 'Unknown Product'}
									</p>
									<p className="text-xs text-gray-500">
										PRD-{item.stock_unit?.product?.sequence_number || '???'}
									</p>
								</div>

								{/* Quantity */}
								<p className="text-sm font-medium text-gray-900 shrink-0">
									{item.quantity_dispatched}
									{getMeasuringUnitAbbreviation(item.stock_unit?.product?.measuring_unit as any)}
								</p>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
