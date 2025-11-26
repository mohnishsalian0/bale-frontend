'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { TabUnderline } from '@/components/ui/tab-underline';
import { createClient } from '@/lib/supabase/client';
import { formatAbsoluteDate } from '@/lib/utils/date';
import type { Tables } from '@/types/database/supabase';
import { InwardDetailsTab } from './InwardDetailsTab';
import { StockUnitsTab } from './StockUnitsTab';

type GoodsInward = Tables<'goods_inwards'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type SalesOrder = Tables<'sales_orders'>;
type JobWork = Tables<'job_works'>;
type Product = Tables<'products'>;
type StockUnit = Tables<'stock_units'>;

interface InwardWithDetails extends GoodsInward {
	partner: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	from_warehouse: Warehouse | null;
	sales_order: SalesOrder | null;
	job_work: JobWork | null;
}

interface StockUnitWithProduct extends StockUnit {
	product: Product | null;
}

interface PageParams {
	params: Promise<{
		warehouse_slug: string;
		inward_number: string;
	}>;
}

export default function GoodsInwardDetailPage({ params }: PageParams) {
	const router = useRouter();
	const { inward_number } = use(params);
	const [inward, setInward] = useState<InwardWithDetails | null>(null);
	const [stockUnits, setStockUnits] = useState<StockUnitWithProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'details' | 'stock_units'>('details');

	const fetchInward = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			// Fetch goods inward with relations
			const { data: inwardData, error: inwardError } = await supabase
				.from('goods_inwards')
				.select(`
					*,
					partner:partners!goods_inwards_partner_id_fkey(
						id, first_name, last_name, company_name,
						phone_number, email, address_line1, address_line2,
						city, state, pin_code
					),
					agent:partners!goods_inwards_agent_id_fkey(
						id, first_name, last_name, company_name
					),
					warehouse:warehouses!goods_inwards_warehouse_id_fkey(
						id, name, address_line1, address_line2, city, state, pin_code
					),
					from_warehouse:warehouses!goods_inwards_from_warehouse_id_fkey(
						id, name, address_line1, address_line2, city, state, pin_code
					),
					sales_order:sales_orders(
						id, sequence_number
					),
					job_work:job_works(
						id, sequence_number
					)
				`)
				.eq('sequence_number', parseInt(inward_number))
				.is('deleted_at', null)
				.single();

			if (inwardError) throw inwardError;
			if (!inwardData) throw new Error('Goods inward not found');

			setInward(inwardData as InwardWithDetails);

			// Fetch stock units created from this inward
			const { data: stockUnitsData, error: stockUnitsError } = await supabase
				.from('stock_units')
				.select(`
					*,
					product:products(
						id, name, stock_type, measuring_unit, product_images, sequence_number,
						product_material_assignments(
							material:product_materials(*)
						),
						product_color_assignments(
							color:product_colors(*)
						),
						product_tag_assignments(
							tag:product_tags(*)
						)
					)
				`)
				.eq('created_from_inward_id', inwardData.id)
				.is('deleted_at', null)
				.order('created_at', { ascending: true });

			if (stockUnitsError) throw stockUnitsError;

			setStockUnits(stockUnitsData as StockUnitWithProduct[] || []);
		} catch (err) {
			console.error('Error fetching goods inward:', err);
			setError(err instanceof Error ? err.message : 'Failed to load goods inward');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchInward();
	}, [inward_number]);

	if (loading) {
		return <LoadingState message="Loading goods inward..." />;
	}

	if (error || !inward) {
		return (
			<ErrorState
				title="Goods inward not found"
				message={error || 'This goods inward does not exist or has been deleted'}
				onRetry={() => router.back()}
				actionText="Go back"
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 overflow-y-auto">
			<div className="relative flex flex-col flex-1">
				{/* Header */}
				<div className="p-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">GI-{inward.sequence_number}</h1>
						<p className="text-sm text-gray-500">
							Goods inward on {formatAbsoluteDate(inward.inward_date)}
						</p>
					</div>
				</div>

				{/* Tabs */}
				<TabUnderline
					activeTab={activeTab}
					onTabChange={(tab) => setActiveTab(tab as 'details' | 'stock_units')}
					tabs={[
						{ value: 'details', label: 'Inward details' },
						{ value: 'stock_units', label: 'Stock units' },
					]}
				/>

				{/* Tab Content */}
				<div className="flex-1">
					{activeTab === 'details' ? (
						<InwardDetailsTab inward={inward} />
					) : (
						<StockUnitsTab stockUnits={stockUnits} />
					)}
				</div>
			</div>
		</div>
	);
}
