'use client';

import Image from 'next/image';
import { IconBox } from '@tabler/icons-react';
import type { Tables } from '@/types/database/supabase';

type StockUnit = Tables<'stock_units'>;
type Product = Tables<'products'>;

interface StockUnitWithProduct extends StockUnit {
	product: Product | null;
}

interface StockUnitsTabProps {
	stockUnits: StockUnitWithProduct[];
}

export function StockUnitsTab({ stockUnits }: StockUnitsTabProps) {
	if (stockUnits.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 px-4">
				<IconBox className="size-12 text-gray-400 mb-3" />
				<h3 className="text-lg font-medium text-gray-900 mb-1">No stock units</h3>
				<p className="text-sm text-gray-500 text-center">
					No stock units were created from this goods inward
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 p-4">
			{stockUnits.map((item) => {
				const product = item.product;
				const productImage = product?.product_images?.[0];
				const productName = product?.name || 'Unknown Product';
				const material = product?.material;
				const colorName = product?.color_name;
				const measuringUnit = product?.measuring_unit;

				// Build display name
				let displayName = productName;
				if (material) displayName += ` - ${material}`;
				if (colorName) displayName += ` (${colorName})`;

				return (
					<div
						key={item.id}
						className="flex gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
					>
						{/* Product Image */}
						<div className="shrink-0">
							{productImage ? (
								<Image
									src={productImage}
									alt={productName}
									width={64}
									height={64}
									className="size-16 rounded object-cover"
								/>
							) : (
								<div className="size-16 rounded bg-gray-100 flex items-center justify-center">
									<IconBox className="size-8 text-gray-400" />
								</div>
							)}
						</div>

						{/* Stock Unit Details */}
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-2 mb-1">
								<h3 className="font-medium text-gray-900 truncate" title={displayName}>
									{displayName}
								</h3>
								<span className="shrink-0 text-sm font-semibold text-gray-700">
									{item.initial_quantity} {measuringUnit}
								</span>
							</div>

							<p className="text-sm text-gray-600 mb-2">
								SU-{item.sequence_number}
							</p>

							{/* Additional Details */}
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
								{item.quality_grade && (
									<span>Grade: {item.quality_grade}</span>
								)}
								{item.supplier_number && (
									<span>Supplier #: {item.supplier_number}</span>
								)}
								{item.warehouse_location && (
									<span>Location: {item.warehouse_location}</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
