'use client';

import Image from 'next/image';
import { IconPhoto } from '@tabler/icons-react';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import type { Tables } from '@/types/database/supabase';

type Product = Tables<'products'>;
type StockUnit = Tables<'stock_units'>;
type GoodsOutwardItem = Tables<'goods_outward_items'>;

interface StockUnitsTabProps {
	items: Array<
		GoodsOutwardItem & {
			stock_unit: (StockUnit & {
				product: Product | null;
			}) | null;
		}
	>;
}

export function StockUnitsTab({ items }: StockUnitsTabProps) {
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-64 text-center px-4">
				<IconPhoto className="size-12 text-gray-400 mb-3" />
				<h3 className="text-lg font-medium text-gray-700 mb-1">No stock units</h3>
				<p className="text-sm text-gray-500">
					This goods outward has no stock units dispatched.
				</p>
			</div>
		);
	}

	return (
		<ul>
			{items.map((item) => {
				const stockUnit = item.stock_unit;
				const product = stockUnit?.product;

				return (
					<li
						key={item.id}
						className="flex gap-3 p-4 border-b border-border"
					>
						{/* Product Image */}
						<div className="relative size-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
							{product?.product_images?.[0] ? (
								<Image
									src={product.product_images[0]}
									alt={product.name || ''}
									fill
									className="object-cover"
								/>
							) : (
								<div className="size-full flex items-center justify-center text-gray-400">
									<IconPhoto className="size-6" />
								</div>
							)}
						</div>

						{/* Product Info */}
						<div className="flex-1 min-w-0">
							<p className="font-medium text-gray-700 truncate" title={product?.name}>
								{product?.name || 'Unknown Product'}
							</p>
							<p className="text-xs text-gray-500 mt-0.5">
								SU-{stockUnit?.sequence_number || 'N/A'}
							</p>
						</div>

						{/* Quantity */}
						<div className="text-right shrink-0">
							<p className="font-semibold text-gray-700">
								{item.quantity_dispatched}{' '}
								{getMeasuringUnitAbbreviation(product?.measuring_unit as any)}
							</p>
							<p className="text-xs text-gray-500 mt-0.5">Dispatched</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
